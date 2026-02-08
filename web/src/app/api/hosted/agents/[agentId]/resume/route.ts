/**
 * Resume Hosted Agent API
 */

import { NextResponse } from 'next/server';
import { hostedAgentsStore } from '../../../_store';

export async function POST(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const agent = hostedAgentsStore.getAgent(agentId);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  if (agent.status !== 'paused') {
    return NextResponse.json(
      { error: 'Agent is not paused' },
      { status: 400 }
    );
  }

  const updated = hostedAgentsStore.setStatus(agentId, 'running');
  return NextResponse.json(updated);
}
