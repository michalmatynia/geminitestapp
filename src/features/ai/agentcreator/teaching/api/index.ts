import type {
  AgentTeachingAgentDto as AgentTeachingAgentRecord,
  AgentTeachingAgentResponse,
  AgentTeachingAgentsResponse,
  AgentTeachingChatResponse,
  AgentTeachingChatRequest,
  AgentTeachingChatMessage,
  AgentTeachingCollectionResponse,
  AgentTeachingCollectionsResponse,
  AgentTeachingCollectionDto as AgentTeachingEmbeddingCollectionRecord,
  AgentTeachingDocumentResponse,
  AgentTeachingDocumentsResponse,
  AgentTeachingDocumentDto as AgentTeachingEmbeddingDocumentListItem,
  AgentTeachingSearchResponse,
  AgentTeachingChatSourceDto as AgentTeachingChatSource,
} from '@/shared/contracts/agent-teaching';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { api } from '@/shared/lib/api-client';

/**
 * List all teaching agents
 */
export async function getTeachingAgents(): Promise<AgentTeachingAgentRecord[]> {
  const data = await api.get<AgentTeachingAgentsResponse>('/api/agentcreator/teaching/agents');
  return data.agents;
}

/**
 * Upsert a teaching agent (create or update)
 */
export async function upsertTeachingAgent(
  payload: Partial<AgentTeachingAgentRecord> & { name: string }
): Promise<AgentTeachingAgentRecord> {
  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (id) {
    const data = await api.patch<AgentTeachingAgentResponse>(
      `/api/agentcreator/teaching/agents/${id}`,
      payload
    );
    return data.agent;
  }
  const data = await api.post<AgentTeachingAgentResponse>('/api/agentcreator/teaching/agents', payload);
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
  if (id) {
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

/**
 * Chat with a teaching agent
 */
export async function teachingChat(
  agentId: string,
  messages: ChatMessage[],
  contextRegistry?: ContextRegistryConsumerEnvelope | null
): Promise<AgentTeachingChatResponse> {
  const normalizedMessages: AgentTeachingChatMessage[] = messages
    .map((message): AgentTeachingChatMessage | null => {
      if (message.role === 'user' || message.role === 'assistant' || message.role === 'system') {
        return { role: message.role, content: message.content };
      }
      return null;
    })
    .filter((message): message is AgentTeachingChatMessage => message !== null);
  const payload: AgentTeachingChatRequest = {
    agentId,
    messages: normalizedMessages,
    ...(contextRegistry ? { contextRegistry } : {}),
  };
  return api.post<AgentTeachingChatResponse>('/api/agentcreator/teaching/chat', payload);
}
