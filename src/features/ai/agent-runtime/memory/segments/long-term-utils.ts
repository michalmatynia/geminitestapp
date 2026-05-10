import type { InputJsonValue } from '@/shared/contracts/json';
import { parseJsonObject } from './shared';

export function resolveSourceCreatedAt(value: Date | string | null | undefined): Date | null {
  if (value instanceof Date) return value;
  if (value !== null && value !== undefined && value !== '') return new Date(value);
  return null;
}

export interface LongTermMemoryData {
  memoryKey: string;
  runId: string | null;
  personaId: string | null;
  content: string;
  summary: string | null;
  tags: string[];
  topicHints: string[];
  moodHints: string[];
  sourceType: string | null;
  sourceId: string | null;
  sourceLabel: string | null;
  sourceCreatedAt: Date | null;
  importance: number | null;
  lastAccessedAt: Date;
  metadata?: InputJsonValue;
}

export const buildLongTermMemoryData = (params: {
  memoryKey: string;
  runId?: string | null;
  personaId?: string | null;
  content: string;
  summary?: string | null;
  tags?: string[];
  topicHints?: string[];
  moodHints?: string[];
  sourceType?: string | null;
  sourceId?: string | null;
  sourceLabel?: string | null;
  sourceCreatedAt?: Date | string | null;
  metadata?: Record<string, unknown>;
  importance?: number | null;
}): LongTermMemoryData => {
  const data: LongTermMemoryData = {
    memoryKey: params.memoryKey,
    runId: params.runId ?? null,
    personaId: params.personaId ?? null,
    content: params.content,
    summary: params.summary ?? null,
    tags: params.tags ?? [],
    topicHints: params.topicHints ?? [],
    moodHints: params.moodHints ?? [],
    sourceType: params.sourceType ?? null,
    sourceId: params.sourceId ?? null,
    sourceLabel: params.sourceLabel ?? null,
    sourceCreatedAt: resolveSourceCreatedAt(params.sourceCreatedAt),
    importance: params.importance ?? null,
    lastAccessedAt: new Date(),
  };

  if (params.metadata !== undefined) {
    data.metadata = params.metadata as InputJsonValue;
  }
  return data;
};

export const parseValidationResponse = (text: string): { valid: boolean; issues: string[]; reason: string | null } => {
  const parsed = parseJsonObject(text) as {
    valid?: unknown;
    issues?: unknown;
    reason?: unknown;
  } | null;
  const issues = Array.isArray(parsed?.issues)
    ? (parsed.issues.filter((item: unknown): item is string => typeof item === 'string'))
    : [];
  return {
    valid: typeof parsed?.valid === 'boolean' ? parsed.valid : true,
    issues,
    reason: typeof parsed?.reason === 'string' ? parsed.reason : null,
  };
};
