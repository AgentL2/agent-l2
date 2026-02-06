/**
 * Fetch and parse agent metadata from metadataURI (IPFS or HTTP).
 * Returns safe fallbacks when fetch fails or shape is invalid.
 */

export interface AgentMetadata {
  name: string;
  description: string;
  category: string;
  tags: string[];
  imageUrl: string | null;
}

const DEFAULT: AgentMetadata = {
  name: '',
  description: '',
  category: '',
  tags: [],
  imageUrl: null,
};

function isFetchableUri(uri: string | undefined | null): boolean {
  if (!uri || typeof uri !== 'string') return false;
  const trimmed = uri.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('ipfs://')
  );
}

function toFetchUrl(uri: string): string {
  const trimmed = uri.trim();
  if (trimmed.startsWith('ipfs://')) {
    const cid = trimmed.replace(/^ipfs:\/\//, '').split('/')[0];
    return `https://ipfs.io/ipfs/${cid}`;
  }
  return trimmed;
}

function parseShape(data: unknown): AgentMetadata {
  if (!data || typeof data !== 'object') return DEFAULT;
  const o = data as Record<string, unknown>;
  return {
    name: typeof o.name === 'string' ? o.name.slice(0, 200) : DEFAULT.name,
    description: typeof o.description === 'string' ? o.description.slice(0, 2000) : DEFAULT.description,
    category: typeof o.category === 'string' ? o.category.slice(0, 100) : DEFAULT.category,
    tags: Array.isArray(o.tags)
      ? (o.tags as unknown[]).filter((t): t is string => typeof t === 'string').slice(0, 10)
      : DEFAULT.tags,
    imageUrl:
      typeof o.image === 'string'
        ? o.image
        : typeof o.imageUrl === 'string'
          ? o.imageUrl
          : typeof o.avatar === 'string'
            ? o.avatar
            : DEFAULT.imageUrl,
  };
}

const cache = new Map<string, { data: AgentMetadata; ts: number }>();
const CACHE_MS = 5 * 60 * 1000;

export async function fetchAgentMetadata(metadataURI: string | undefined | null): Promise<AgentMetadata> {
  if (!isFetchableUri(metadataURI)) return DEFAULT;

  const uri = (metadataURI as string).trim();
  const cached = cache.get(uri);
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data;

  try {
    const url = toFetchUrl(uri);
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return DEFAULT;
    const data = (await res.json()) as unknown;
    const parsed = parseShape(data);
    cache.set(uri, { data: parsed, ts: Date.now() });
    return parsed;
  } catch {
    return DEFAULT;
  }
}

export function getAgentDisplayName(metadata: AgentMetadata, fallbackAddress: string): string {
  if (metadata.name && metadata.name.trim()) return metadata.name.trim();
  if (fallbackAddress && fallbackAddress.length >= 10) {
    return `${fallbackAddress.slice(0, 6)}…${fallbackAddress.slice(-4)}`;
  }
  return 'Agent';
}
