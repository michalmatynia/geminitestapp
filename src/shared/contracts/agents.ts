import { z } from 'zod';

import { namedDtoSchema } from './base';

/**
 * Agent DTOs
 */

export const agentPersonaSchema = namedDtoSchema.extend({
  description: z.string().optional(),
  role: z.string().optional(),
  instructions: z.string().optional(),
  tools: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  settings: z.lazy(() => agentPersonaSettingsSchema).optional(),
});

export type AgentPersona = z.infer<typeof agentPersonaSchema>;

export const agentPersonaSettingsSchema = z
  .object({
    personaId: z.string().optional(),
    customInstructions: z.string().optional(),
  })
  .strict();

export type AgentPersonaSettings = z.infer<typeof agentPersonaSettingsSchema>;

export const AGENT_PERSONA_SETTINGS_KEY = 'agent_personas';

export const DEFAULT_AGENT_PERSONA_SETTINGS: AgentPersonaSettings = {};

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
