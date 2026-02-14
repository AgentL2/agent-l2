/**
 * API proxy to AgentL2 Runtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { generalLimiter, sensitiveLimiter } from '@/lib/rate-limit';

const RUNTIME_URL = process.env.RUNTIME_API_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  const limited = generalLimiter.check(request);
  if (limited) return limited;
  const owner = request.nextUrl.searchParams.get('owner');
  
  if (!owner) {
    return NextResponse.json({ error: 'Owner address required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${RUNTIME_URL}/api/agents?owner=${encodeURIComponent(owner)}`);
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (err) {
    console.error('Runtime API error:', err);
    return NextResponse.json({ error: 'Failed to connect to runtime' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const limited = sensitiveLimiter.check(request);
  if (limited) return limited;

  try {
    const body = await request.json();

    const response = await fetch(`${RUNTIME_URL}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('Runtime API error:', err);
    return NextResponse.json({ error: 'Failed to connect to runtime' }, { status: 503 });
  }
}
