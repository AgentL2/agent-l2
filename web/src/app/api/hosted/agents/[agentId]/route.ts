/**
 * Single Hosted Agent API
 * Get, update, or delete a specific hosted agent
 */

import { NextResponse } from 'next/server';
import { hostedAgentsStore } from '../../_store';

export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
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
