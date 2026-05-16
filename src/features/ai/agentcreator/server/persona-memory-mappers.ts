import type { AgentPersonaMoodId } from '@/shared/contracts/agents';
import type { PersonaMemoryRecord, PersonaMemorySourceType } from '@/shared/contracts/persona-memory';
import {
  asRecord,
  toIsoString,
  truncateText,
  extractTopicHints,
  normalizeMoodHints,
} from './persona-memory-utils';
import type { PersonaMemoryEntryRecord, PersonaConversationMessageRecord } from './persona-memory-types';

const resolveRole = (metadata: Record<string, unknown> | undefined): string | null => {
  if (typeof metadata?.['role'] === 'string') return metadata['role'];
  if (typeof metadata?.['originRole'] === 'string') return metadata['originRole'];
  return null;
};

const resolveSourceCreatedAt = (
  item: PersonaMemoryEntryRecord,
  metadata: Record<string, unknown> | undefined
): string | null => {
  const sourceCreatedAtStr = toIsoString(item.sourceCreatedAt);
  if (sourceCreatedAtStr !== null) return sourceCreatedAtStr;
  
  const metadataSourceCreatedAt = metadata?.['sourceCreatedAt'];
  return typeof metadataSourceCreatedAt === 'string' ? metadataSourceCreatedAt : null;
};

const resolveTitle = (item: PersonaMemoryEntryRecord): string => {
  if (item.sourceLabel !== null) return item.sourceLabel;
  if (item.summary !== null) return item.summary;
  return truncateText(item.content, 80);
};

const resolveSessionId = (metadata: Record<string, unknown> | undefined, runId: string | null): string | null => {
  if (typeof metadata?.['sessionId'] === 'string') return metadata['sessionId'];
  return runId;
};

const resolveTopicHints = (item: PersonaMemoryEntryRecord): string[] => {
  return extractTopicHints(item.summary ?? item.content, item.topicHints);
};

const resolveMoodHints = (item: PersonaMemoryEntryRecord): AgentPersonaMoodId[] => {
  return normalizeMoodHints(item.moodHints, item.summary ?? item.content);
};

const resolveMetadata = (item: PersonaMemoryEntryRecord, metadata: Record<string, unknown> | undefined, lastAccessedAt: string | null): Record<string, unknown> => {
  return {
    ...(metadata ?? {}),
    ...(item.runId !== null ? { runId: item.runId } : {}),
    ...(lastAccessedAt !== null ? { lastAccessedAt } : {}),
  };
};

export const mapMemoryEntryToRecord = (
  item: PersonaMemoryEntryRecord,
  personaId: string
): PersonaMemoryRecord => {
  const metadata = asRecord(item.metadata);
  const lastAccessedAt = item.lastAccessedAt !== null ? toIsoString(item.lastAccessedAt) : null;

  return {
    id: item.id,
    createdAt: toIsoString(item.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(item.updatedAt) ?? new Date().toISOString(),
    personaId,
    recordType: 'memory_entry',
    content: item.content,
    summary: item.summary,
    title: resolveTitle(item),
    role: resolveRole(metadata),
    sessionId: resolveSessionId(metadata, item.runId),
    memoryKey: item.memoryKey,
    sourceType: (item.sourceType ?? 'agent_memory') as PersonaMemorySourceType,
    sourceId: item.sourceId ?? item.id,
    sourceLabel: item.sourceLabel,
    sourceCreatedAt: resolveSourceCreatedAt(item, metadata),
    importance: item.importance,
    tags: item.tags,
    topicHints: resolveTopicHints(item),
    moodHints: resolveMoodHints(item),
    metadata: resolveMetadata(item, metadata, lastAccessedAt),
  };
};

const resolveConversationMoodHints = (
  message: PersonaConversationMessageRecord,
  metadata: Record<string, unknown> | undefined
): AgentPersonaMoodId[] => {
  const rawMoodHints = metadata?.['moodHints'];
  return normalizeMoodHints(
    Array.isArray(rawMoodHints)
      ? rawMoodHints.filter((item): item is string => typeof item === 'string')
      : [],
    message.content
  );
};

export const mapConversationMessageToRecord = (
  message: PersonaConversationMessageRecord,
  personaId: string
): PersonaMemoryRecord => {
  const metadata = asRecord(message.metadata);

  return {
    id: message.id,
    createdAt: toIsoString(message.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(message.createdAt) ?? new Date().toISOString(),
    personaId,
    recordType: 'conversation_message',
    content: message.content,
    summary: truncateText(message.content, 140),
    title: `${message.role === 'assistant' ? 'Assistant' : 'User'} message`,
    role: message.role,
    sessionId: message.sessionId,
    memoryKey: null,
    sourceType: 'chat_message',
    sourceId: message.id,
    sourceLabel: message.session.title ?? 'Untitled session',
    sourceCreatedAt: toIsoString(message.createdAt),
    importance: null,
    tags: [],
    topicHints: extractTopicHints(message.content),
    moodHints: resolveConversationMoodHints(message, metadata),
    metadata: {
      ...(metadata ?? {}),
      sessionTitle: message.session.title,
      ...(message.model !== null ? { model: message.model } : {}),
      ...(message.images.length > 0 ? { images: message.images } : {}),
    },
  };
};
