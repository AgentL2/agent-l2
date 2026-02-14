/**
 * Stop Hosted Agent API
 */

import { NextResponse } from 'next/server';
import { hostedAgentsStore } from '../../../_store';
import { sensitiveLimiter } from '@/lib/rate-limit';

export async function POST(
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

  if (agent.status === 'stopped') {
    return NextResponse.json(
      { error: 'Agent is already stopped' },
      { status: 400 }
    );
  }

  const updated = hostedAgentsStore.setStatus(agentId, 'stopped');
  return NextResponse.json(updated);
}
