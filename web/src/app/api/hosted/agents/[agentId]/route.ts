/**
 * Single Hosted Agent API
 * Get, update, or delete a specific hosted agent
 */

import { NextResponse } from 'next/server';
import { hostedAgentsStore } from '../../_store';
import { hostedLimiter, sensitiveLimiter } from '@/lib/rate-limit';

export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const limited = hostedLimiter.check(request);
  if (limited) return limited;

  const { agentId } = params;
  const agent = hostedAgentsStore.getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Don't expose encrypted secrets
  const { encryptedSecrets, ...safeAgent } = agent;
  return NextResponse.json({ ...safeAgent, encryptedSecrets: '[REDACTED]' });
}

export async function DELETE(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const limited = sensitiveLimiter.check(request);
  if (limited) return limited;

  const { agentId } = params;
  const agent = hostedAgentsStore.getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Stop if running
  if (agent.status === 'running') {
    hostedAgentsStore.setStatus(agentId, 'stopped');
  }

  hostedAgentsStore.deleteAgent(agentId);
  return NextResponse.json({ ok: true });
}
