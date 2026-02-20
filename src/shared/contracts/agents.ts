import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Agent DTOs
 */

export const agentPersonaSchema = namedDtoSchema.extend({
  role: z.string(),
  instructions: z.string(),
  modelId: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  tools: z.array(z.string()),
  isDefault: z.boolean(),
});

export type AgentPersonaDto = z.infer<typeof agentPersonaSchema>;
export type AgentPersona = AgentPersonaDto;

export const agentPersonaSettingsSchema = z.object({
  personaId: z.string(),
  customInstructions: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
});

export type AgentPersonaSettingsDto = z.infer<typeof agentPersonaSettingsSchema>;
export type AgentPersonaSettings = AgentPersonaSettingsDto;

export const createAgentPersonaSchema = agentPersonaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentPersonaDto = z.infer<typeof createAgentPersonaSchema>;
export type UpdateAgentPersonaDto = Partial<CreateAgentPersonaDto>;

export const agentSchema = namedDtoSchema.extend({
  personaId: z.string(),
  status: z.enum(['idle', 'active', 'busy', 'offline']),
  lastActiveAt: z.string().nullable(),
  capabilities: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AgentDto = z.infer<typeof agentSchema>;
export type AgentRecord = AgentDto;

export const createAgentSchema = agentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type UpdateAgentDto = Partial<CreateAgentDto>;

export const executeAgentSchema = z.object({
  agentId: z.string(),
  prompt: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type ExecuteAgentDto = z.infer<typeof executeAgentSchema>;
