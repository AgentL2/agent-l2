/**
 * Code Review Agent
 * An autonomous agent that reviews code and provides feedback
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { AgentRuntime, BaseExecutor, type TaskInput, type TaskResult } from '../src/index.js';
import OpenAI from 'openai';

// Custom executor for code review with structured output
class CodeReviewExecutor extends BaseExecutor {
  id = 'code-review-executor';
  name = 'Code Review Executor';
  version = '1.0.0';
  serviceTypes = ['code-review', 'code-audit', 'security-review'];

  private openai: OpenAI;

  constructor(privateKey: string, apiKey: string) {
    super(privateKey);
    this.openai = new OpenAI({ apiKey });
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      const code = task.payload?.code || task.payload?.input || '';
      const language = task.payload?.language || 'auto-detect';
      const focusAreas = task.payload?.focusAreas || ['bugs', 'security', 'performance', 'style'];

      const systemPrompt = `You are an expert code reviewer. Analyze the provided code and return a JSON response with:
{
  "summary": "Brief overall assessment",
  "score": <number 1-10>,
  "issues": [
    {
      "severity": "critical" | "warning" | "suggestion",
      "category": "bug" | "security" | "performance" | "style" | "maintainability",
      "line": <number or null>,
      "description": "What's wrong",
      "suggestion": "How to fix it"
    }
  ],
  "positives": ["List of good things about the code"],
  "recommendations": ["High-level recommendations"]
}

Focus areas: ${focusAreas.join(', ')}
Language: ${language}

Be thorough but fair. Only report real issues, not style preferences unless they impact readability.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Review this code:\n\n\`\`\`\n${code}\n\`\`\`` },
        ],
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const reviewContent = response.choices[0]?.message?.content || '{}';
      const review = JSON.parse(reviewContent);

      // Generate proof
      const proof = await this.proofGenerator.generateLLMProof(
        task,
        { model: 'gpt-4o', code: code.slice(0, 500) }, // Truncate for proof
        { id: response.id, usage: response.usage },
        review
      );

      const resultHash = this.proofGenerator.generateResultHash(review);

      return {
        success: true,
        resultURI: '',
        resultHash,
        proof,
        metadata: this.createMetadata(startTime, {
          modelUsed: 'gpt-4o',
          tokensUsed: response.usage?.total_tokens,
        }),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.createFailedResult(task, message, startTime);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.openai.models.list();
      return true;
    } catch {
      return false;
    }
  }
}

// Registry ABI (minimal)
const REGISTRY_ABI = [
  'function registerAgent(address agent, string did, string metadataURI)',
  'function registerService(address agent, string serviceType, uint256 pricePerUnit, string metadataURI) returns (bytes32)',
  'function isActiveAgent(address agent) view returns (bool)',
];

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CODE REVIEW AGENT');
  console.log('  Autonomous AI agent that reviews code');
  console.log('═══════════════════════════════════════════════════════\n');

  const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
  const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
  const REGISTRY_ADDRESS = process.env.REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_REGISTRY_ADDRESS;
  const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!PRIVATE_KEY || !REGISTRY_ADDRESS || !MARKETPLACE_ADDRESS || !OPENAI_API_KEY) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, wallet);

  console.log(`Agent Address: ${wallet.address}\n`);

  // Register agent if needed
  const isRegistered = await registry.isActiveAgent(wallet.address);
  if (!isRegistered) {
    console.log('📝 Registering agent...');
    const did = `did:agentl2:${wallet.address.slice(2, 42)}`;
    const tx = await registry.registerAgent(wallet.address, did, 'ipfs://code-review-agent-metadata');
    await tx.wait();
    console.log('✅ Agent registered!\n');
  }

  // Register code-review service
  console.log('📝 Registering code-review service...');
  try {
    const tx = await registry.registerService(
      wallet.address,
      'code-review',
      ethers.parseEther('0.005'), // 0.005 ETH per review
      'ipfs://code-review-service-metadata'
    );
    await tx.wait();
    console.log('✅ Service registered!\n');
  } catch {
    console.log('✅ Service already registered\n');
  }

  // Create runtime with custom executor
  const runtime = new AgentRuntime({
    privateKey: PRIVATE_KEY,
    rpcUrl: RPC_URL,
    contracts: {
      registry: REGISTRY_ADDRESS,
      marketplace: MARKETPLACE_ADDRESS,
    },
    pollInterval: 3000,
    maxConcurrent: 3,
    autoComplete: true,
    executors: [
      new CodeReviewExecutor(PRIVATE_KEY, OPENAI_API_KEY),
    ],
  });

  runtime.on((event) => {
    const ts = new Date().toISOString().slice(11, 19);
    if (event.type === 'order_received') {
      console.log(`[${ts}] 📥 Code review requested`);
    } else if (event.type === 'execution_completed') {
      console.log(`[${ts}] ✅ Review completed (${event.result.metadata.durationMs}ms, ${event.result.metadata.tokensUsed} tokens)`);
    } else if (event.type === 'order_completed') {
      console.log(`[${ts}] 💰 Payment received!`);
    }
  });

  process.on('SIGINT', async () => {
    await runtime.stop();
    process.exit(0);
  });

  await runtime.start();

  console.log('═══════════════════════════════════════════════════════');
  console.log('  CODE REVIEW AGENT IS LIVE');
  console.log('  Waiting for code to review... (Ctrl+C to stop)');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(console.error);
