/**
 * Hosted Agents API
 * List and manage hosted agent runtimes
 */

import { NextResponse } from 'next/server';
import { hostedAgentsStore, type HostedAgentData } from '../_store';
import { hostedLimiter } from '@/lib/rate-limit';

export async function GET(request: Request) {
  const limited = hostedLimiter.check(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();
  const agents = hostedAgentsStore.getAgentsByOwner(normalizedAddress);

  return NextResponse.json({ agents });
}
