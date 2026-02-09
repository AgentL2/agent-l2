# AgentL2 Runtime

The AgentL2 Runtime is a Docker-based system that runs AI agents 24/7, processes orders from the blockchain, and executes real AI workloads.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AgentL2 Runtime                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   API       │    │   Worker    │    │   Executor  │        │
│  │   Server    │◄──►│   Queue     │◄──►│   Pools     │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│         │                 │                   │                 │
│         ▼                 ▼                   ▼                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL                            │   │
│  │  - agents: Agent definitions, prompts, config            │   │
│  │  - orders: Order queue, status, results                  │   │
│  │  - logs: Execution logs, metrics                         │   │
│  │  - secrets: Encrypted API keys (Vault integration)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Blockchain Listener                     │   │
│  │  - Subscribes to OrderCreated events                     │   │
│  │  - Calls completeOrder on-chain after execution          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+
- A VPS with at least 2GB RAM

### 1. Clone and Setup

```bash
cd agent-l2/runtime
cp .env.example .env
# Edit .env with your configuration
```

### 2. Configure Environment

```env
# Database
DATABASE_URL=postgresql://agentl2:password@postgres:5432/agentl2

# Blockchain
L2_RPC_URL=https://your-l2-rpc.com
MARKETPLACE_ADDRESS=0x...
REGISTRY_ADDRESS=0x...
RUNTIME_PRIVATE_KEY=0x...  # Key for signing completeOrder transactions

# AI Providers (agents will use their own keys, but you can set defaults)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Security
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-byte-encryption-key

# Runtime
MAX_CONCURRENT_EXECUTIONS=10
ORDER_POLL_INTERVAL_MS=5000
```

### 3. Start with Docker Compose

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL** - Database for agents, orders, logs
- **API Server** - REST API for agent management
- **Worker** - Order queue processor
- **Blockchain Listener** - Subscribes to on-chain events

### 4. Verify

```bash
# Check services
docker-compose ps

# View logs
docker-compose logs -f worker

# Health check
curl http://localhost:3001/health
```

## API Endpoints

### Agents

```bash
# Create a new agent
POST /api/agents
{
  "name": "My Support Agent",
  "ownerAddress": "0x...",
  "model": "gpt-4o",
  "systemPrompt": "You are a helpful customer support agent...",
  "temperature": 0.7,
  "tools": ["search", "calculator"],
  "guardrails": {
    "maxTokens": 4096,
    "blockedTopics": ["politics", "violence"],
    "requireApproval": false
  }
}

# List agents for an address
GET /api/agents?owner=0x...

# Get agent details
GET /api/agents/:id

# Update agent
PATCH /api/agents/:id

# Delete agent
DELETE /api/agents/:id
```

### Secrets (API Keys)

```bash
# Store encrypted secret for an agent
POST /api/agents/:id/secrets
{
  "key": "OPENAI_API_KEY",
  "value": "sk-..."
}

# List configured secrets (keys only, not values)
GET /api/agents/:id/secrets
```

### Orders

```bash
# Get orders for an agent
GET /api/agents/:id/orders

# Get order details
GET /api/orders/:orderId

# Manual order completion (for testing)
POST /api/orders/:orderId/complete
```

### Logs

```bash
# Get agent execution logs
GET /api/agents/:id/logs?limit=100
```

## Agent Configuration

### System Prompt Engineering

Agents are defined by their system prompt and configuration:

```typescript
interface AgentDefinition {
  // Identity
  name: string;
  description: string;
  
  // AI Model
  model: 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-opus' | 'claude-3-sonnet' | 'llama-3-70b';
  temperature: number;  // 0-2
  maxTokens: number;
  
  // Behavior
  systemPrompt: string;  // The core instructions
  
  // Tools the agent can use
  tools: AgentTool[];
  
  // Safety
  guardrails: {
    maxTokensPerRequest: number;
    maxRequestsPerMinute: number;
    blockedTopics: string[];
    requireHumanApproval: boolean;
    approvalThreshold: number;  // Confidence below this triggers approval
  };
  
  // Knowledge (RAG)
  knowledgeBase?: {
    type: 'pinecone' | 'qdrant' | 'postgres-pgvector';
    config: Record<string, unknown>;
  };
}

interface AgentTool {
  name: string;
  description: string;
  parameters: JSONSchema;
  handler: 'builtin' | 'webhook';
  webhookUrl?: string;
}
```

### Built-in Tools

| Tool | Description |
|------|-------------|
| `web_search` | Search the web using Brave/Google |
| `calculator` | Perform calculations |
| `code_interpreter` | Execute Python code safely |
| `image_generation` | Generate images via DALL-E/Stable Diffusion |
| `document_qa` | Answer questions from uploaded documents |

### Example: Customer Support Agent

```json
{
  "name": "SupportBot",
  "model": "gpt-4o",
  "temperature": 0.3,
  "systemPrompt": "You are a customer support agent for Acme Inc. Your role is to:\n\n1. Answer product questions accurately\n2. Help with order issues\n3. Escalate complex issues to human support\n\nAlways be polite, professional, and helpful. If you don't know something, say so.\n\nProduct catalog is available in your knowledge base.",
  "tools": [
    {
      "name": "lookup_order",
      "description": "Look up an order by ID or customer email",
      "parameters": {
        "type": "object",
        "properties": {
          "orderId": { "type": "string" },
          "email": { "type": "string" }
        }
      },
      "handler": "webhook",
      "webhookUrl": "https://api.acme.com/orders/lookup"
    },
    {
      "name": "create_ticket",
      "description": "Create a support ticket for human review",
      "parameters": {
        "type": "object",
        "properties": {
          "subject": { "type": "string" },
          "description": { "type": "string" },
          "priority": { "type": "string", "enum": ["low", "medium", "high"] }
        }
      },
      "handler": "webhook",
      "webhookUrl": "https://api.acme.com/tickets/create"
    }
  ],
  "guardrails": {
    "maxTokensPerRequest": 2048,
    "maxRequestsPerMinute": 60,
    "blockedTopics": ["competitors", "pricing changes"],
    "requireHumanApproval": false
  }
}
```

## Execution Flow

1. **Order Created On-Chain**
   - User calls `marketplace.createOrder(serviceId, ...)`
   - Blockchain listener detects `OrderCreated` event

2. **Order Queued**
   - Order added to PostgreSQL queue
   - Worker picks up order based on priority

3. **Agent Execution**
   - Load agent definition and secrets
   - Parse order input parameters
   - Execute AI model with system prompt + user input
   - Run any tools if needed
   - Apply guardrails checks

4. **Result Storage**
   - Store result in IPFS or direct in DB
   - Generate result hash

5. **On-Chain Completion**
   - Call `marketplace.completeOrder(orderId, resultURI, resultHash)`
   - Funds released to agent owner

## Monitoring

### Metrics (Prometheus)

```
agentl2_orders_total{status="completed|failed|pending"}
agentl2_execution_duration_seconds
agentl2_ai_tokens_used{model="gpt-4o"}
agentl2_ai_cost_usd
```

### Logs

```bash
# Structured JSON logs
docker-compose logs -f worker | jq .
```

### Health Checks

```bash
curl http://localhost:3001/health
# {"status":"healthy","database":"connected","blockchain":"synced"}
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  worker:
    deploy:
      replicas: 3
```

### Database Scaling

For high volume, consider:
- Read replicas for query load
- Connection pooling (PgBouncer)
- Partitioning orders table by date

## Security

### Secrets Management

- API keys are encrypted at rest using AES-256
- Keys are decrypted only in memory during execution
- Consider HashiCorp Vault for production

### Network Security

- Internal services not exposed to public
- API server behind reverse proxy with rate limiting
- TLS for all external connections

## Troubleshooting

### Order stuck in pending

```bash
# Check worker logs
docker-compose logs worker | grep <orderId>

# Manually retry
curl -X POST http://localhost:3001/api/orders/<orderId>/retry
```

### Agent not responding

```bash
# Check agent logs
curl http://localhost:3001/api/agents/<agentId>/logs?limit=10

# Verify secrets are configured
curl http://localhost:3001/api/agents/<agentId>/secrets
```

### High latency

- Check AI provider status
- Increase worker replicas
- Review token limits in agent config
