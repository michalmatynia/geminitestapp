import { z } from 'zod';

import { namedDtoSchema } from './base';

/**
 * Agent DTOs
 */

export const AGENT_PERSONA_MOOD_IDS = [
  'neutral',
  'thinking',
  'encouraging',
  'happy',
  'celebrating',
] as const;

export const agentPersonaMoodIdSchema = z.enum(AGENT_PERSONA_MOOD_IDS);
export type AgentPersonaMoodId = z.infer<typeof agentPersonaMoodIdSchema>;

export const DEFAULT_AGENT_PERSONA_MOOD_ID: AgentPersonaMoodId = 'neutral';

export const agentPersonaMoodSchema = z.object({
  id: agentPersonaMoodIdSchema,
  label: z.string().trim().min(1).max(40),
  description: z.string().trim().max(160).optional(),
  svgContent: z.string().max(100_000).default(''),
  avatarImageUrl: z.string().trim().max(2_048).nullable().optional(),
  avatarImageFileId: z.string().trim().max(256).nullable().optional(),
  avatarThumbnailRef: z.string().trim().max(256).nullable().optional(),
  avatarThumbnailDataUrl: z.string().max(25_000).nullable().optional(),
  avatarThumbnailMimeType: z.string().trim().max(64).nullable().optional(),
  avatarThumbnailBytes: z.number().int().min(0).nullable().optional(),
  avatarThumbnailWidth: z.number().int().min(1).max(256).nullable().optional(),
  avatarThumbnailHeight: z.number().int().min(1).max(256).nullable().optional(),
  useEmbeddedThumbnail: z.boolean().optional(),
});

export type AgentPersonaMood = z.infer<typeof agentPersonaMoodSchema>;

export const agentPersonaMemorySettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    includeChatHistory: z.boolean().optional(),
    useMoodSignals: z.boolean().optional(),
    defaultSearchLimit: z.number().int().min(1).max(50).optional(),
  })
  .strict();

export type AgentPersonaMemorySettings = z.infer<typeof agentPersonaMemorySettingsSchema>;

export const agentPersonaSchema = namedDtoSchema.extend({
  description: z.string().optional(),
  role: z.string().optional(),
  instructions: z.string().optional(),
  tools: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  defaultMoodId: agentPersonaMoodIdSchema.optional(),
  moods: z.array(agentPersonaMoodSchema).max(AGENT_PERSONA_MOOD_IDS.length).optional(),
  settings: z.lazy(() => agentPersonaSettingsSchema).optional(),
});

export type AgentPersona = z.infer<typeof agentPersonaSchema>;

export const agentPersonaSettingsSchema = z
  .object({
    personaId: z.string().optional(),
    customInstructions: z.string().optional(),
    memory: agentPersonaMemorySettingsSchema.optional(),
  })
  .strict();

export type AgentPersonaSettings = z.infer<typeof agentPersonaSettingsSchema>;

export const AGENT_PERSONA_SETTINGS_KEY = 'agent_personas';

export const DEFAULT_AGENT_PERSONA_SETTINGS: AgentPersonaSettings = {
  memory: {
    enabled: true,
    includeChatHistory: true,
    useMoodSignals: true,
    defaultSearchLimit: 20,
  },
};

export const createAgentPersonaSchema = agentPersonaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentPersona = z.infer<typeof createAgentPersonaSchema>;
export type UpdateAgentPersona = Partial<CreateAgentPersona>;

export const agentSchema = namedDtoSchema.extend({
  personaId: z.string(),
  status: z.enum(['idle', 'active', 'busy', 'offline']),
  lastActiveAt: z.string().nullable(),
  capabilities: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Agent = z.infer<typeof agentSchema>;

export const createAgentSchema = agentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgent = z.infer<typeof createAgentSchema>;
export type UpdateAgent = Partial<CreateAgent>;

export const executeAgentSchema = z.object({
  agentId: z.string(),
  prompt: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ExecuteAgent = z.infer<typeof executeAgentSchema>;
