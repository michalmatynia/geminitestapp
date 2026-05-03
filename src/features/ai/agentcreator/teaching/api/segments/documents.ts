import type {
  AgentTeachingDocumentResponse,
  AgentTeachingDocumentsResponse,
  AgentTeachingDocumentDto as AgentTeachingEmbeddingDocumentListItem,
  AgentTeachingSearchResponse,
  AgentTeachingChatSourceDto as AgentTeachingChatSource,
} from '@/shared/contracts/agent-teaching';
import { api } from '@/shared/lib/api-client';

/**
 * List documents in a collection
 */
export async function getEmbeddingDocuments(
  collectionId: string,
  limit: number = 100,
  skip: number = 0
): Promise<AgentTeachingDocumentsResponse> {
  return api.get<AgentTeachingDocumentsResponse>(
    `/api/agentcreator/teaching/collections/${collectionId}/documents`,
    { params: { limit, skip } }
  );
}

/**
 * Add a document to a collection
 */
export async function addEmbeddingDocument(
  collectionId: string,
  payload: { text: string; title?: string | null; source?: string | null; tags?: string[] }
): Promise<AgentTeachingEmbeddingDocumentListItem> {
  const data = await api.post<AgentTeachingDocumentResponse>(
    `/api/agentcreator/teaching/collections/${collectionId}/documents`,
    payload
  );
  return data.item;
}

/**
 * Delete a document from a collection
 */
export async function deleteEmbeddingDocument(
  collectionId: string,
  documentId: string
): Promise<void> {
  await api.delete(
    `/api/agentcreator/teaching/collections/${collectionId}/documents/${documentId}`
  );
}

/**
 * Search an embedding collection
 */
export async function searchEmbeddingCollection(
  collectionId: string,
  payload: { queryText: string; topK?: number; minScore?: number }
): Promise<AgentTeachingChatSource[]> {
  const data = await api.post<AgentTeachingSearchResponse>(
    `/api/agentcreator/teaching/collections/${collectionId}/search`,
    payload
  );
  return data.sources;
}
