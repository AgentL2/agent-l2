/**
 * Deploy Hosted Agent API
 * Creates a new hosted agent runtime
 */

import { NextResponse } from 'next/server';
import { hostedAgentsStore } from '../_store';
import { EXECUTOR_TEMPLATES } from '@/lib/hosted';
import { sensitiveLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const limited = sensitiveLimiter.check(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { address, name, templateId, config, secrets } = body;

    // Validation
    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid address' }, { status: 400 });
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid name' }, { status: 400 });
    }

    if (!templateId || typeof templateId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid templateId' }, { status: 400 });
    }

    // Find template
    const template = EXECUTOR_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: `Unknown template: ${templateId}` }, { status: 400 });
    }

    // Validate required secrets
    const secretKeys = Object.keys(secrets || {});
    for (const field of template.requiredSecrets) {
      if (field.required && !secretKeys.includes(field.key)) {
        return NextResponse.json(
          { error: `Missing required secret: ${field.label}` },
          { status: 400 }
        );
      }
    }

    // Validate required config
    const configValues = config || {};
    for (const field of template.configFields) {
      if (field.required && !(field.key in configValues)) {
        // Use default if available
        if (field.default !== undefined) {
          configValues[field.key] = field.default;
        } else {
          return NextResponse.json(
            { error: `Missing required config: ${field.label}` },
            { status: 400 }
          );
        }
      }
    }

    // Encrypt secrets
    const encryptedSecrets = hostedAgentsStore.encryptSecrets(secrets || {});

    // Create hosted agent
    const agent = hostedAgentsStore.createAgent({
      address: address.toLowerCase(),
      name,
      status: 'pending',
      templateId,
      config: {
        pollInterval: 5000,
        maxConcurrent: 5,
        autoComplete: true,
        templateConfig: configValues,
        secretsConfigured: secretKeys,
      },
      stats: {
        totalOrders: 0,
        completedOrders: 0,
        failedOrders: 0,
        totalEarnings: '0',
        totalCost: '0',
        uptime: 0,
        lastActiveAt: null,
      },
      encryptedSecrets,
    });

    // In a real implementation, this would:
    // 1. Queue a job for the orchestrator to start the runtime
    // 2. The orchestrator would spin up a container/worker
    // 3. The worker would connect to the chain and start processing

    // For MVP, we'll simulate starting it
    setTimeout(() => {
      hostedAgentsStore.setStatus(agent.id, 'starting');
      setTimeout(() => {
        hostedAgentsStore.setStatus(agent.id, 'running');
      }, 2000);
    }, 500);

    return NextResponse.json(agent);
  } catch (error) {
    console.error('[Deploy API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to deploy agent' },
      { status: 500 }
    );
  }
}
