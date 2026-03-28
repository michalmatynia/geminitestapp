import { z } from 'zod';

export const promptConfigSchema = z.object({
  template: z.string(),
});

export type PromptConfigDto = z.infer<typeof promptConfigSchema>;
export type PromptConfig = PromptConfigDto;

export const modelConfigSchema = z.object({
  modelId: z.string().optional(),
  temperature: z.number(),
  maxTokens: z.number(),
  vision: z.boolean(),
  waitForResult: z.boolean().optional(),
  systemPrompt: z.string().optional(),
});

export type ModelConfigDto = z.infer<typeof modelConfigSchema>;
export type ModelConfig = ModelConfigDto;

export const agentConfigSchema = z.object({
  personaId: z.string().optional(),
  promptTemplate: z.string().optional(),
  waitForResult: z.boolean().optional(),
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

export type AgentConfigDto = z.infer<typeof agentConfigSchema>;
export type AgentConfig = AgentConfigDto;

export const learnerAgentConfigSchema = z.object({
  agentId: z.string(),
  promptTemplate: z.string().optional(),
  includeSources: z.boolean().optional(),
});

export type LearnerAgentConfigDto = z.infer<typeof learnerAgentConfigSchema>;
export type LearnerAgentConfig = LearnerAgentConfigDto;
