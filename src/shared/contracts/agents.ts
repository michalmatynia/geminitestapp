import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Agent Creator DTOs
 */

export const agentSchema = namedDtoSchema.extend({
  model: z.string(),
  systemPrompt: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  tools: z.array(z.string()),
  config: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
});

export type AgentDto = z.infer<typeof agentSchema>;

export const createAgentSchema = agentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentDto = z.infer<typeof createAgentSchema>;
export type UpdateAgentDto = Partial<CreateAgentDto>;

export const agentLogSchema = dtoBaseSchema.extend({
  runId: z.string(),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).nullable(),
});

export type AgentLogDto = z.infer<typeof agentLogSchema>;

export const agentPersonaSettingsSchema = z.object({
  executorModel: z.string().nullable(),
  plannerModel: z.string().nullable(),
  selfCheckModel: z.string().nullable(),
  extractionValidationModel: z.string().nullable(),
  toolRouterModel: z.string().nullable(),
  memoryValidationModel: z.string().nullable(),
  memorySummarizationModel: z.string().nullable(),
  loopGuardModel: z.string().nullable(),
  approvalGateModel: z.string().nullable(),
  selectorInferenceModel: z.string().nullable(),
  outputNormalizationModel: z.string().nullable(),
});

export type AgentPersonaSettingsDto = z.infer<typeof agentPersonaSettingsSchema>;

export const agentPersonaSchema = namedDtoSchema.extend({
  settings: agentPersonaSettingsSchema,
});

export type AgentPersonaDto = z.infer<typeof agentPersonaSchema>;

export const executeAgentSchema = z.object({
  agentId: z.string(),
  input: z.record(z.string(), z.unknown()),
});

export type ExecuteAgentDto = z.infer<typeof executeAgentSchema>;

/**
 * Agent Runtime DTOs
 */

export const agentRuntimeSchema = dtoBaseSchema.extend({
  name: z.string(),
  status: z.enum(['idle', 'running', 'error', 'stopped']),
  config: z.record(z.string(), z.unknown()),
  lastActivity: z.string().nullable(),
});

export type AgentRuntimeDto = z.infer<typeof agentRuntimeSchema>;

export const createAgentRuntimeSchema = agentRuntimeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentRuntimeDto = z.infer<typeof createAgentRuntimeSchema>;
export type UpdateAgentRuntimeDto = Partial<CreateAgentRuntimeDto>;

export const agentExecutionSchema = dtoBaseSchema.extend({
  runtimeId: z.string(),
  input: z.record(z.string(), z.unknown()),
  output: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  error: z.string().nullable(),
  duration: z.number().nullable(),
  completedAt: z.string().nullable(),
});

export type AgentExecutionDto = z.infer<typeof agentExecutionSchema>;

export const createAgentExecutionSchema = agentExecutionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAgentExecutionDto = z.infer<typeof createAgentExecutionSchema>;
export type UpdateAgentExecutionDto = Partial<CreateAgentExecutionDto>;
