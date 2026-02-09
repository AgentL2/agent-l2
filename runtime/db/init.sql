-- AgentL2 Runtime Database Schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- AGENTS
-- ============================================================================

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identity
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_address VARCHAR(42) NOT NULL,  -- Ethereum address
    
    -- On-chain reference (if registered)
    on_chain_address VARCHAR(42),  -- Agent's on-chain address
    service_id VARCHAR(66),  -- bytes32 serviceId on marketplace
    
    -- AI Configuration
    model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4096,
    system_prompt TEXT NOT NULL,
    
    -- Tools (JSON array of tool definitions)
    tools JSONB DEFAULT '[]'::jsonb,
    
    -- Guardrails
    guardrails JSONB DEFAULT '{
        "maxTokensPerRequest": 4096,
        "maxRequestsPerMinute": 60,
        "blockedTopics": [],
        "requireHumanApproval": false
    }'::jsonb,
    
    -- Knowledge base config (optional)
    knowledge_config JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'disabled')),
    
    -- Pricing (in wei, synced from on-chain)
    price_per_request VARCHAR(78),  -- uint256 as string
    
    -- Stats (updated by workers)
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    total_tokens_used BIGINT DEFAULT 0,
    total_earnings VARCHAR(78) DEFAULT '0',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_agents_owner ON agents(owner_address);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_on_chain ON agents(on_chain_address) WHERE on_chain_address IS NOT NULL;

-- ============================================================================
-- AGENT SECRETS (Encrypted API Keys)
-- ============================================================================

CREATE TABLE agent_secrets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    key_name VARCHAR(100) NOT NULL,  -- e.g., 'OPENAI_API_KEY'
    encrypted_value BYTEA NOT NULL,  -- AES-256 encrypted
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, key_name)
);

CREATE INDEX idx_agent_secrets_agent ON agent_secrets(agent_id);

-- ============================================================================
-- ORDERS
-- ============================================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- On-chain reference
    order_id VARCHAR(66) NOT NULL UNIQUE,  -- bytes32 orderId from chain
    service_id VARCHAR(66) NOT NULL,
    
    -- Parties
    agent_id UUID REFERENCES agents(id),
    buyer_address VARCHAR(42) NOT NULL,
    seller_address VARCHAR(42) NOT NULL,
    
    -- Payment
    price_wei VARCHAR(78) NOT NULL,
    
    -- Input
    input_data JSONB NOT NULL,  -- The request payload
    input_hash VARCHAR(66),
    
    -- Output
    result_data JSONB,
    result_uri VARCHAR(500),  -- IPFS or other storage URI
    result_hash VARCHAR(66),
    
    -- Execution
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Waiting in queue
        'processing',   -- Currently executing
        'completed',    -- Successfully completed
        'failed',       -- Execution failed
        'cancelled',    -- Cancelled by user
        'expired'       -- Timed out
    )),
    error_message TEXT,
    
    -- Metrics
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    tokens_used INTEGER,
    execution_time_ms INTEGER,
    
    -- On-chain tx
    complete_tx_hash VARCHAR(66),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Priority (for queue ordering)
    priority INTEGER DEFAULT 0
);

CREATE INDEX idx_orders_agent ON orders(agent_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_buyer ON orders(buyer_address);
CREATE INDEX idx_orders_seller ON orders(seller_address);
CREATE INDEX idx_orders_queue ON orders(status, priority DESC, created_at ASC) WHERE status = 'pending';

-- ============================================================================
-- EXECUTION LOGS
-- ============================================================================

CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    
    level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
    message TEXT NOT NULL,
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_logs_agent ON execution_logs(agent_id, created_at DESC);
CREATE INDEX idx_logs_order ON execution_logs(order_id);

-- ============================================================================
-- AGENT VERSIONS (for prompt versioning)
-- ============================================================================

CREATE TABLE agent_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    version INTEGER NOT NULL,
    system_prompt TEXT NOT NULL,
    tools JSONB,
    guardrails JSONB,
    
    -- Change tracking
    change_notes TEXT,
    created_by VARCHAR(42),  -- Address of who made the change
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(agent_id, version)
);

CREATE INDEX idx_agent_versions ON agent_versions(agent_id, version DESC);

-- ============================================================================
-- HUMAN APPROVAL QUEUE (for guardrails)
-- ============================================================================

CREATE TABLE approval_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    
    -- What triggered approval
    trigger_reason VARCHAR(100) NOT NULL,
    confidence_score DECIMAL(5,4),
    
    -- The proposed response
    proposed_response JSONB NOT NULL,
    
    -- Decision
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'modified')),
    reviewed_by VARCHAR(42),
    modified_response JSONB,
    review_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_approval_queue_pending ON approval_queue(status, created_at) WHERE status = 'pending';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER agent_secrets_updated_at
    BEFORE UPDATE ON agent_secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create new agent version on prompt change
CREATE OR REPLACE FUNCTION create_agent_version()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.system_prompt IS DISTINCT FROM NEW.system_prompt 
       OR OLD.tools IS DISTINCT FROM NEW.tools
       OR OLD.guardrails IS DISTINCT FROM NEW.guardrails THEN
        INSERT INTO agent_versions (agent_id, version, system_prompt, tools, guardrails)
        SELECT 
            NEW.id,
            COALESCE((SELECT MAX(version) FROM agent_versions WHERE agent_id = NEW.id), 0) + 1,
            NEW.system_prompt,
            NEW.tools,
            NEW.guardrails;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_version_on_change
    AFTER UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION create_agent_version();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert example agent templates (optional, can be removed)
-- These serve as starting points in the UI

COMMENT ON TABLE agents IS 'AI agent definitions with prompts, tools, and configuration';
COMMENT ON TABLE orders IS 'Order queue - orders from blockchain waiting to be processed';
COMMENT ON TABLE agent_secrets IS 'Encrypted API keys for each agent';
COMMENT ON TABLE execution_logs IS 'Execution logs for debugging and monitoring';
