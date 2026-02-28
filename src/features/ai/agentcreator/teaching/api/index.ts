'use client';

import type {
  AgentTeachingAgentDto as AgentTeachingAgentRecord,
  AgentTeachingCollectionDto as AgentTeachingEmbeddingCollectionRecord,
  AgentTeachingDocumentDto as AgentTeachingEmbeddingDocumentListItem,
  AgentTeachingChatSourceDto as AgentTeachingChatSource,
} from '@/shared/contracts/agent-teaching';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { api } from '@/shared/lib/api-client';

/**
 * List all teaching agents
 */
export async function getTeachingAgents(): Promise<AgentTeachingAgentRecord[]> {
  const data = await api.get<{ agents?: AgentTeachingAgentRecord[] }>(
    '/api/agentcreator/teaching/agents'
  );
  return data.agents ?? [];
}

/**
 * Upsert a teaching agent (create or update)
 */
export async function upsertTeachingAgent(
  payload: Partial<AgentTeachingAgentRecord> & { name: string }
): Promise<AgentTeachingAgentRecord> {
  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (id) {
    const data = await api.patch<{ agent?: AgentTeachingAgentRecord }>(
      `/api/agentcreator/teaching/agents/${id}`,
      payload
    );
    if (!data.agent) throw new Error('Missing agent in response.');
    return data.agent;
  }
  const data = await api.post<{ agent?: AgentTeachingAgentRecord }>(
    '/api/agentcreator/teaching/agents',
    payload
  );
  if (!data.agent) throw new Error('Missing agent in response.');
  return data.agent;
}

/**
 * Delete a teaching agent
 */
export async function deleteTeachingAgent(id: string): Promise<void> {
  await api.delete(`/api/agentcreator/teaching/agents/${id}`);
}

/**
 * List all embedding collections
 */
export async function getEmbeddingCollections(): Promise<AgentTeachingEmbeddingCollectionRecord[]> {
  const data = await api.get<{ collections?: AgentTeachingEmbeddingCollectionRecord[] }>(
    '/api/agentcreator/teaching/collections'
  );
  return data.collections ?? [];
}

/**
 * Upsert an embedding collection (create or update)
 */
export async function upsertEmbeddingCollection(
  payload: Partial<AgentTeachingEmbeddingCollectionRecord> & { name: string }
): Promise<AgentTeachingEmbeddingCollectionRecord> {
  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (id) {
    const data = await api.patch<{ collection?: AgentTeachingEmbeddingCollectionRecord }>(
      `/api/agentcreator/teaching/collections/${id}`,
      payload
    );
    if (!data.collection) throw new Error('Missing collection in response.');
    return data.collection;
  }
  const data = await api.post<{ collection?: AgentTeachingEmbeddingCollectionRecord }>(
    '/api/agentcreator/teaching/collections',
    payload
  );
  if (!data.collection) throw new Error('Missing collection in response.');
  return data.collection;
}

/**
 * Delete an embedding collection
 */
export async function deleteEmbeddingCollection(id: string): Promise<void> {
  await api.delete(`/api/agentcreator/teaching/collections/${id}`);
}

/**
 * List documents in a collection
 */
export async function getEmbeddingDocuments(
  collectionId: string,
  limit: number = 100,
  skip: number = 0
): Promise<{ items: AgentTeachingEmbeddingDocumentListItem[]; total: number }> {
  return api.get<{ items: AgentTeachingEmbeddingDocumentListItem[]; total: number }>(
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
  const data = await api.post<{ item?: AgentTeachingEmbeddingDocumentListItem }>(
    `/api/agentcreator/teaching/collections/${collectionId}/documents`,
    payload
  );
  if (!data.item) throw new Error('Missing item in response.');
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
  const data = await api.post<{ sources?: AgentTeachingChatSource[] }>(
    `/api/agentcreator/teaching/collections/${collectionId}/search`,
    payload
  );
  return data.sources ?? [];
}

/**
 * Chat with a teaching agent
 */
export async function teachingChat(
  agentId: string,
  messages: ChatMessage[]
): Promise<{ message: string; sources: AgentTeachingChatSource[] }> {
  return api.post<{ message: string; sources: AgentTeachingChatSource[] }>(
    '/api/agentcreator/teaching/chat',
    { agentId, messages }
  );
}
