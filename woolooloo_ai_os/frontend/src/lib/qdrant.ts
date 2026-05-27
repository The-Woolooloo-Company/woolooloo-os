import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL || 'https://qdrant.woolooloo.tech';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || '';

export const qdrant = new QdrantClient({
  url: QDRANT_URL,
  port: 443,         // Cloudflare tunnel uses standard HTTPS port
  https: true,       // required — https:// URL needs this flag
  apiKey: QDRANT_API_KEY,
  checkCompatibility: false,
});

// ─── Typed helpers for your business collections ───────────

export const COLLECTIONS = [
  'business_customers',
  'business_messages',
  'business_conversations',
  'business_kb',
  'business_products',
  'business_services',
] as const;

export type CollectionName = (typeof COLLECTIONS)[number];

/** Default named vector (all collections use this) */
const VECTOR_NAME = 'ollamaEmbedding';

/** List all collections and verify connectivity */
export async function listCollections() {
  const response = await qdrant.getCollections();
  return response.collections.map((c: any) => c.name);
}

/** Get a single collection info */
export async function getCollectionInfo(name: CollectionName) {
  return qdrant.getCollection(name);
}

/** Count points in a collection */
export async function countCollection(name: CollectionName, filter?: Record<string, any>) {
  const result = await qdrant.count(name, { exact: true, filter: filter as any });
  return result.count;
}

/** Search a collection by vector */
export async function searchCollection(
  name: CollectionName,
  vector: number[],
  limit = 10,
  filter?: Record<string, any>,
) {
  return qdrant.search(name, {
    vector: [VECTOR_NAME, vector] as any,
    limit,
    filter: filter as any,
    with_payload: true,
    with_vector: false,
  });
}

/** Scroll through a collection (paginated list) */
export async function scrollCollection(
  name: CollectionName,
  limit = 10,
  offset?: string,
  filter?: Record<string, any>,
) {
  return qdrant.scroll(name, {
    limit,
    offset,
    filter: filter as any,
    with_payload: true,
  });
}

/** Upsert points into a collection */
export async function upsertPoints(
  name: CollectionName,
  points: Array<{ id: string | number; vector: number[]; payload?: Record<string, any> }>,
) {
  return qdrant.upsert(name, {
    points: points.map(p => ({
      ...p,
      vector: { [VECTOR_NAME]: p.vector },
    })) as any[],
    wait: true,
  });
}

/** Delete points from a collection */
export async function deletePoints(
  name: CollectionName,
  ids: (string | number)[],
) {
  return qdrant.delete(name, {
    points: ids,
    wait: true,
  });
}
