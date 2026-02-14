/**
 * Update Hosted Agent Config API
 */

import { NextResponse } from 'next/server';
import { hostedAgentsStore } from '../../../_store';
import { sensitiveLimiter } from '@/lib/rate-limit';

export async function PATCH(
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

  try {
    const updates = await request.json();
    
    // Only allow updating specific config fields
    const allowedFields = ['pollInterval', 'maxConcurrent', 'autoComplete', 'templateConfig'];
    const configUpdates: Record<string, unknown> = {};
    
    for (const field of allowedFields) {
      if (field in updates) {
        configUpdates[field] = updates[field];
      }
    }

    const updatedConfig = {
      ...agent.config,
      ...configUpdates,
    };

    const updated = hostedAgentsStore.updateAgent(agentId, { config: updatedConfig });
    
    hostedAgentsStore.addLog(agentId, 'info', 'Configuration updated');
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
