/**
 * Result Storage
 * Store execution results on IPFS or local storage
 */

import { createHash } from 'crypto';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ResultStorage, ResultData } from './types.js';

// ============================================================================
// IPFS Storage (Production)
// ============================================================================

export class IPFSStorage implements ResultStorage {
  private gateway: string;

  constructor(gateway: string = 'https://ipfs.io') {
    this.gateway = gateway;
  }

  async store(data: ResultData): Promise<string> {
    const json = JSON.stringify(data, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );

    // For now, use a local pinning service or Pinata
    // In production, this would call ipfs.add()
    const hash = createHash('sha256').update(json).digest('hex').slice(0, 46);
    const cid = `Qm${hash}`; // Simulated CID

    // TODO: Actually pin to IPFS
    // const { create } = await import('ipfs-http-client');
    // const client = create({ url: this.gateway });
    // const result = await client.add(json);
    // return `ipfs://${result.cid}`;

    console.log(`[IPFS] Would store result for order ${data.orderId}`);
    return `ipfs://${cid}`;
  }

  async retrieve(uri: string): Promise<ResultData | null> {
    if (!uri.startsWith('ipfs://')) return null;
    
    const cid = uri.replace('ipfs://', '');
    const url = `${this.gateway}/ipfs/${cid}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}

// ============================================================================
// Local File Storage (Development)
// ============================================================================

export class LocalStorage implements ResultStorage {
  private baseDir: string;

  constructor(baseDir: string = './data/results') {
    this.baseDir = baseDir;
  }

  async store(data: ResultData): Promise<string> {
    // Ensure directory exists
    if (!existsSync(this.baseDir)) {
      await mkdir(this.baseDir, { recursive: true });
    }

    const json = JSON.stringify(data, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    , 2);

    const hash = createHash('sha256').update(json).digest('hex').slice(0, 16);
    const filename = `${data.orderId.slice(0, 10)}-${hash}.json`;
    const filepath = join(this.baseDir, filename);

    await writeFile(filepath, json);
    console.log(`[Local] Stored result: ${filepath}`);

    return `file://${filepath}`;
  }

  async retrieve(uri: string): Promise<ResultData | null> {
    if (!uri.startsWith('file://')) return null;
    
    const filepath = uri.replace('file://', '');
    
    try {
      const content = await readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

// ============================================================================
// HTTP Storage (Webhook-based)
// ============================================================================

export class HTTPStorage implements ResultStorage {
  private endpoint: string;
  private apiKey?: string;

  constructor(endpoint: string, apiKey?: string) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
  }

  async store(data: ResultData): Promise<string> {
    const json = JSON.stringify(data, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: json,
    });

    if (!response.ok) {
      throw new Error(`Failed to store result: ${response.statusText}`);
    }

    const result = await response.json() as { uri: string };
    return result.uri;
  }

  async retrieve(uri: string): Promise<ResultData | null> {
    try {
      const response = await fetch(uri);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}

// ============================================================================
// In-Memory Storage (Testing)
// ============================================================================

export class MemoryStorage implements ResultStorage {
  private data = new Map<string, ResultData>();
  private counter = 0;

  async store(data: ResultData): Promise<string> {
    const id = `mem://${++this.counter}`;
    this.data.set(id, data);
    return id;
  }

  async retrieve(uri: string): Promise<ResultData | null> {
    return this.data.get(uri) ?? null;
  }

  clear(): void {
    this.data.clear();
    this.counter = 0;
  }
}
