# AgentL2 Integrations Architecture

## Overview

AgentL2 supports three categories of integrations:

1. **AI Model Executors** - LLM providers agents can use
2. **Platform Integrations** - External services agents can interact with
3. **On-Chain Actions** - Blockchain operations agents can perform (ERC-8004)

---

## 1. AI Model Executors

### Supported Providers

| Provider | Models | Status |
|----------|--------|--------|
| OpenAI | GPT-4, GPT-4o, o1, o3 | ✅ Live |
| Anthropic | Claude 3.5, Claude 4 Opus/Sonnet | 🔨 Building |
| Google | Gemini 2.0, Gemini Pro | 🔨 Building |
| xAI | Grok 2, Grok 3 | 🔨 Building |
| Moonshot | Kimi | 🔨 Building |
| DeepSeek | DeepSeek V3, R1 | 🔨 Building |
| Meta | Llama 3.3 (via Groq/Together) | 📋 Planned |
| Mistral | Mixtral, Mistral Large | 📋 Planned |

### Executor Interface

```typescript
interface AIExecutor {
  id: string;
  provider: string;
  models: string[];
  
  // Execute a completion
  execute(input: ExecutorInput): Promise<ExecutorResult>;
  
  // Streaming support
  stream(input: ExecutorInput): AsyncIterableIterator<string>;
  
  // Cost estimation
  estimateCost(input: ExecutorInput): Promise<CostEstimate>;
}
```

---

## 2. Platform Integrations

### Social & Communication

| Platform | Capabilities | Auth Method |
|----------|--------------|-------------|
| **X (Twitter)** | Post, reply, DM, search, analytics | OAuth 2.0 |
| **LinkedIn** | Post, message, connections, company pages | OAuth 2.0 |
| **Telegram** | Send messages, bots, channels, groups | Bot Token |
| **Discord** | Messages, channels, webhooks, slash commands | OAuth 2.0 / Bot |
| **Slack** | Messages, channels, workflows | OAuth 2.0 |

### Developer Tools

| Platform | Capabilities | Auth Method |
|----------|--------------|-------------|
| **GitHub** | Repos, issues, PRs, actions, deployments | OAuth 2.0 / PAT |
| **GitLab** | Repos, CI/CD, issues, merge requests | OAuth 2.0 / PAT |
| **Replit** | Create/run repls, deployments | API Key |
| **Cursor** | Code generation, editing | API Key |
| **VS Code** | Extensions, settings sync | OAuth 2.0 |
| **Vercel** | Deploy, domains, env vars, logs | OAuth 2.0 |

### Databases & Infrastructure

| Platform | Capabilities | Auth Method |
|----------|--------------|-------------|
| **Supabase** | Database, auth, storage, functions | API Key |
| **Neon** | Serverless Postgres, branching | API Key |
| **Docker** | Build, push, deploy containers | OAuth 2.0 |
| **AWS** | S3, Lambda, EC2, etc. | IAM / OAuth |

### CRM & Productivity

| Platform | Capabilities | Auth Method |
|----------|--------------|-------------|
| **Airtable** | Bases, tables, records, automations | OAuth 2.0 / PAT |
| **Salesforce** | Leads, contacts, opportunities, reports | OAuth 2.0 |
| **HubSpot** | CRM, marketing, sales, service | OAuth 2.0 |
| **Notion** | Pages, databases, blocks, search | OAuth 2.0 |
| **Google Workspace** | Docs, Sheets, Calendar, Drive | OAuth 2.0 |

### Integration Interface

```typescript
interface PlatformIntegration {
  id: string;
  name: string;
  category: 'social' | 'dev' | 'database' | 'crm' | 'productivity';
  
  // OAuth configuration
  oauth?: {
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
  };
  
  // Available actions
  actions: IntegrationAction[];
  
  // Execute an action
  execute(action: string, params: any, credentials: Credentials): Promise<any>;
}
```

---

## 3. On-Chain Actions (ERC-8004)

### What is ERC-8004?

ERC-8004 is a proposed standard for **Autonomous Agent Accounts** - smart contract wallets controlled by AI agents with:

- **Delegated Execution** - Agents can transact on behalf of users
- **Spending Limits** - Configurable caps per transaction/day/total
- **Action Allowlists** - Restrict which contracts/functions agents can call
- **Multi-Sig Override** - Users can always override or pause agents
- **Audit Trail** - All agent actions logged on-chain

### ERC-8004 Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC8004 {
    // Events
    event AgentAuthorized(address indexed agent, bytes32 indexed did, uint256 spendingLimit);
    event AgentRevoked(address indexed agent);
    event AgentAction(address indexed agent, address indexed target, bytes4 selector, uint256 value);
    event SpendingLimitUpdated(address indexed agent, uint256 newLimit);
    
    // Agent Management
    function authorizeAgent(bytes32 agentDID, uint256 spendingLimit, address[] calldata allowedContracts) external;
    function revokeAgent(bytes32 agentDID) external;
    function updateSpendingLimit(bytes32 agentDID, uint256 newLimit) external;
    function setAllowedContracts(bytes32 agentDID, address[] calldata contracts) external;
    
    // Agent Execution
    function executeAsAgent(address target, bytes calldata data, uint256 value) external returns (bytes memory);
    function batchExecuteAsAgent(address[] calldata targets, bytes[] calldata data, uint256[] calldata values) external returns (bytes[] memory);
    
    // Views
    function isAgentAuthorized(bytes32 agentDID) external view returns (bool);
    function getAgentSpendingLimit(bytes32 agentDID) external view returns (uint256);
    function getAgentSpentToday(bytes32 agentDID) external view returns (uint256);
    function getAllowedContracts(bytes32 agentDID) external view returns (address[] memory);
}
```

### On-Chain Capabilities

| Action | Description |
|--------|-------------|
| **Token Transfers** | Send ERC-20, ERC-721, ERC-1155 tokens |
| **DeFi Operations** | Swap, provide liquidity, stake, borrow |
| **NFT Actions** | Mint, list, bid, buy NFTs |
| **DAO Participation** | Vote on proposals, delegate tokens |
| **Contract Deployment** | Deploy new contracts (with limits) |
| **Cross-Chain** | Bridge assets via approved bridges |

---

## User Flow: Connecting Integrations

### For Non-Technical Users

1. **Dashboard → Integrations**
2. **Browse** available integrations by category
3. **Click "Connect"** on desired integration
4. **OAuth Flow** - Redirected to platform to authorize
5. **Select Permissions** - Choose what the agent can access
6. **Set Limits** - Configure spending limits, rate limits
7. **Done** - Integration available for agents to use

### For Developers

```typescript
// SDK: Connect integration programmatically
const client = new AgentClient({ ... });

// List available integrations
const integrations = await client.listIntegrations();

// Get OAuth URL for user authorization
const authUrl = await client.getIntegrationAuthUrl('github', {
  scopes: ['repo', 'read:user'],
  redirectUri: 'https://your-app.com/callback'
});

// Exchange code for credentials (after OAuth)
await client.connectIntegration('github', { code: authCode });

// Use integration in your agent
await client.executeIntegration('github', 'createIssue', {
  repo: 'user/repo',
  title: 'Bug found by AI agent',
  body: 'Description...'
});
```

---

## Database Schema Updates

```prisma
model Integration {
  id          String   @id @default(cuid())
  name        String   @unique
  category    String   // social, dev, database, crm, productivity, blockchain
  config      Json     // OAuth config, API endpoints
  actions     Json     // Available actions
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model AgentIntegration {
  id            String   @id @default(cuid())
  agentId       String
  integrationId String
  credentials   Json     // Encrypted OAuth tokens / API keys
  permissions   Json     // Granted scopes/permissions
  limits        Json     // Rate limits, spending limits
  enabled       Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  expiresAt     DateTime?
  
  agent       Agent       @relation(fields: [agentId], references: [id])
  integration Integration @relation(fields: [integrationId], references: [id])
  
  @@unique([agentId, integrationId])
}

model IntegrationLog {
  id            String   @id @default(cuid())
  agentId       String
  integrationId String
  action        String
  params        Json?
  result        Json?
  success       Boolean
  errorMessage  String?
  duration      Int      // ms
  createdAt     DateTime @default(now())
  
  @@index([agentId, integrationId, createdAt])
}
```

---

## Implementation Priority

### Phase 1: AI Executors (Week 1)
- [ ] Anthropic Claude executor
- [ ] Google Gemini executor
- [ ] xAI Grok executor
- [ ] DeepSeek executor

### Phase 2: Core Integrations (Week 2)
- [ ] GitHub integration
- [ ] X (Twitter) integration
- [ ] Discord integration
- [ ] Telegram integration

### Phase 3: Developer Tools (Week 3)
- [ ] Vercel integration
- [ ] Supabase integration
- [ ] Notion integration

### Phase 4: On-Chain (Week 4)
- [ ] ERC-8004 contract
- [ ] Agent wallet UI
- [ ] Transaction signing flow
- [ ] Spending limits dashboard

---

## Security Considerations

1. **Credential Encryption** - All OAuth tokens encrypted at rest
2. **Scoped Permissions** - Request minimum necessary permissions
3. **Rate Limiting** - Prevent abuse of integrations
4. **Audit Logging** - Track all integration usage
5. **Revocation** - Users can revoke any time
6. **Spending Limits** - Hard caps on financial actions
7. **Action Allowlists** - Restrict what agents can do
