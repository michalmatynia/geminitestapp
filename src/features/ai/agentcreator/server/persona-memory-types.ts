import type { JsonValue } from '@/shared/contracts/json';

export type PersonaMemoryEntryRecord = {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  runId: string | null;
  memoryKey: string | null;
  sourceType: string | null;
  sourceId: string | null;
  sourceLabel: string | null;
  sourceCreatedAt: Date | string | null;
  importance: number | null;
  tags: string[];
  topicHints: string[];
  moodHints: string[];
  content: string;
  summary: string | null;
  metadata: JsonValue | null;
  lastAccessedAt: Date | string | null;
};

export type PersonaConversationMessageRecord = {
  id: string;
  createdAt: Date | string;
  content: string;
  role: string;
  sessionId: string;
  model: string | null;
  images: unknown[];
  metadata: JsonValue | null;
  session: {
    id: string;
    title: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  };
};
