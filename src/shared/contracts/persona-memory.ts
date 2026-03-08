import { z } from 'zod';

import { dtoBaseSchema } from './base';
import { agentPersonaMoodIdSchema } from './agents';

export const personaMemoryRecordTypeSchema = z.enum([
  'memory_entry',
  'conversation_message',
]);
export type PersonaMemoryRecordType = z.infer<typeof personaMemoryRecordTypeSchema>;

export const personaMemorySourceTypeSchema = z.enum([
  'chat_message',
  'chat_session',
  'agent_memory',
  'manual',
  'system',
]);
export type PersonaMemorySourceType = z.infer<typeof personaMemorySourceTypeSchema>;

export const personaMemoryRecordSchema = dtoBaseSchema.extend({
  personaId: z.string().trim().min(1),
  recordType: personaMemoryRecordTypeSchema,
  content: z.string(),
  summary: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  memoryKey: z.string().nullable().optional(),
  sourceType: personaMemorySourceTypeSchema.nullable().optional(),
  sourceId: z.string().nullable().optional(),
  sourceLabel: z.string().nullable().optional(),
  sourceCreatedAt: z.string().nullable().optional(),
  importance: z.number().nullable().optional(),
  tags: z.array(z.string()).default([]),
  topicHints: z.array(z.string()).default([]),
  moodHints: z.array(agentPersonaMoodIdSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type PersonaMemoryRecord = z.infer<typeof personaMemoryRecordSchema>;

export const personaMemorySummarySchema = z.object({
  personaId: z.string().trim().min(1),
  suggestedMoodId: agentPersonaMoodIdSchema.nullable(),
  totalRecords: z.number().int().nonnegative(),
  memoryEntryCount: z.number().int().nonnegative(),
  conversationMessageCount: z.number().int().nonnegative(),
});
export type PersonaMemorySummary = z.infer<typeof personaMemorySummarySchema>;

export const personaMemorySearchResponseSchema = z.object({
  items: z.array(personaMemoryRecordSchema),
  summary: personaMemorySummarySchema,
});
export type PersonaMemorySearchResponse = z.infer<typeof personaMemorySearchResponseSchema>;
