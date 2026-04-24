import type {
  AgentTeachingCollectionResponse,
  AgentTeachingCollectionsResponse,
  AgentTeachingCollectionDto as AgentTeachingEmbeddingCollectionRecord,
} from '@/shared/contracts/agent-teaching';
import { api } from '@/shared/lib/api-client';

/**
 * List all embedding collections
 */
export async function getEmbeddingCollections(): Promise<AgentTeachingEmbeddingCollectionRecord[]> {
  const data = await api.get<AgentTeachingCollectionsResponse>(
    '/api/agentcreator/teaching/collections'
  );
  return data.collections;
}

/**
 * Upsert an embedding collection (create or update)
 */
export async function upsertEmbeddingCollection(
  payload: Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }
): Promise<AgentTeachingEmbeddingCollectionRecord> {
  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (id !== '') {
    const data = await api.patch<AgentTeachingCollectionResponse>(
      `/api/agentcreator/teaching/collections/${id}`,
      payload
    );
    return data.collection;
  }
  const data = await api.post<AgentTeachingCollectionResponse>(
    '/api/agentcreator/teaching/collections',
    payload
  );
  return data.collection;
}

/**
 * Delete an embedding collection
 */
export async function deleteEmbeddingCollection(id: string): Promise<void> {
  await api.delete(`/api/agentcreator/teaching/collections/${id}`);
}
