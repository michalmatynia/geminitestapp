import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Agent DTOs
 */

export const agentPersonaSchema = namedDtoSchema.extend({
  description: z.string().optional(),
  role: z.string().optional(),
  instructions: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  tools: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
  settings: z.lazy(() => agentPersonaSettingsSchema).optional(),
});

export type AgentPersonaDto = z.infer<typeof agentPersonaSchema>;
export type AgentPersona = AgentPersonaDto;

export const agentPersonaSettingsSchema = z.object({
  personaId: z.string().optional(),
  customInstructions: z.string().optional(),
  modelId: z.string().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  executorModel: z.string().optional(),
  plannerModel: z.string().optional(),
  selfCheckModel: z.string().optional(),
  extractionValidationModel: z.string().optional(),
  toolRouterModel: z.string().optional(),
  memoryValidationModel: z.string().optional(),
  memorySummarizationModel: z.string().optional(),
  loopGuardModel: z.string().optional(),
  approvalGateModel: z.string().optional(),
  selectorInferenceModel: z.string().optional(),
  outputNormalizationModel: z.string().optional(),
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
