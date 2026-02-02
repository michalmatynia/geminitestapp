import { SettingRecord } from "@/shared/types/base-types";

export type ChatbotSessionListItem = {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotMemoryItem = {
  id: string;
  memoryKey: string;
  runId: string | null;
  content: string;
  summary: string | null;
  tags: string[];
  metadata: Record<string, unknown> | null;
  importance: number | null;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatbotContextSegment = {
  title: string;
  content: string;
};
