export type AgentTeachingId = string;

export type AgentTeachingEmbeddingCollectionRecord = {
  id: AgentTeachingId;
  name: string;
  description: string | null;
  embeddingModel: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentTeachingEmbeddingDocumentMetadata = {
  title?: string | null;
  source?: string | null;
  tags?: string[];
};

// Returned to the UI for listing. (We intentionally omit the full embedding vector.)
export type AgentTeachingEmbeddingDocumentListItem = {
  id: AgentTeachingId;
  collectionId: AgentTeachingId;
  text: string;
  metadata: AgentTeachingEmbeddingDocumentMetadata | null;
  embeddingModel: string;
  embeddingDimensions: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentTeachingAgentRecord = {
  id: AgentTeachingId;
  name: string;
  description: string | null;
  llmModel: string;
  embeddingModel: string;
  systemPrompt: string;
  collectionIds: AgentTeachingId[];
  retrievalTopK: number;
  retrievalMinScore: number;
  createdAt: string;
  updatedAt: string;
};

export type AgentTeachingChatSource = {
  documentId: AgentTeachingId;
  collectionId: AgentTeachingId;
  score: number;
  text: string;
  metadata: AgentTeachingEmbeddingDocumentMetadata | null;
};

