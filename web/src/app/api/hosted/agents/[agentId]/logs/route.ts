/**
 * Hosted Agent Logs API
 */

import { NextResponse } from 'next/server';
import { hostedAgentsStore } from '../../../_store';

export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  const agent = hostedAgentsStore.getAgent(agentId);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const logs = hostedAgentsStore.getLogs(agentId, limit);
  return NextResponse.json({ logs });
}
