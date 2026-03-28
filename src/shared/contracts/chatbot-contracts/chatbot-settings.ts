import { z } from 'zod';
import { dtoBaseSchema } from '../base';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';

/**
 * Chatbot Settings & Config
 */
export const chatbotSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  model: z.string().optional(),
  defaultModelId: z.string().optional(),
  welcomeMessage: z.string().optional(),
  systemPrompt: z.string().optional(),
  personaId: z.string().nullable().optional(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  topP: z.number().optional(),
  frequencyPenalty: z.number().optional(),
  presencePenalty: z.number().optional(),
  stopSequences: z.array(z.string()).optional(),
  visionEnabled: z.boolean().optional(),
  toolsEnabled: z.boolean().optional(),
  allowedTools: z.array(z.string()).optional(),
  memoryEnabled: z.boolean().optional(),
  memoryWindow: z.number().optional(),
  humanInterventionRequired: z.boolean().optional(),
  enableMemory: z.boolean().optional(),
  enableContext: z.boolean().optional(),
  webSearchEnabled: z.boolean().optional(),
  useGlobalContext: z.boolean().optional(),
  useLocalContext: z.boolean().optional(),
  localContextMode: z.string().optional(),
  searchProvider: z.string().optional(),
  playwrightPersonaId: z.string().nullable().optional(),
  agentModeEnabled: z.boolean().optional(),
  agentBrowser: z.string().optional(),
  runHeadless: z.boolean().optional(),
  ignoreRobotsTxt: z.boolean().optional(),
  requireHumanApproval: z.boolean().optional(),
  maxSteps: z.number().optional(),
  maxStepAttempts: z.number().optional(),
  maxReplanCalls: z.number().optional(),
  replanEverySteps: z.number().optional(),
  maxSelfChecks: z.number().optional(),
  loopGuardThreshold: z.number().optional(),
  loopBackoffBaseMs: z.number().optional(),
  loopBackoffMaxMs: z.number().optional(),
});

export type ChatbotSettingsDto = z.infer<typeof chatbotSettingsSchema>;
export type ChatbotSettingsRecordDto = ChatbotSettingsDto;

export const createChatbotSettingsSchema = chatbotSettingsSchema.partial();
export type CreateChatbotSettingsDto = z.infer<typeof createChatbotSettingsSchema>;
export type ChatbotSettingsPayload = CreateChatbotSettingsDto;
export type UpdateChatbotSettingsDto = ChatbotSettingsPayload;

export const chatbotStoredSettingsSchema = dtoBaseSchema.extend({
  key: z.string(),
  settings: chatbotSettingsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ChatbotStoredSettingsDto = z.infer<typeof chatbotStoredSettingsSchema>;
export type ChatbotStoredSettings = ChatbotStoredSettingsDto;

export const chatbotSettingsResponseSchema = z.object({
  settings: chatbotStoredSettingsSchema.nullable(),
});

export type ChatbotSettingsResponseDto = z.infer<typeof chatbotSettingsResponseSchema>;
export type ChatbotSettingsResponse = ChatbotSettingsResponseDto;

export const chatbotSettingsSaveResponseSchema = z.object({
  settings: chatbotStoredSettingsSchema,
});

export type ChatbotSettingsSaveResponseDto = z.infer<typeof chatbotSettingsSaveResponseSchema>;
export type ChatbotSettingsSaveResponse = ChatbotSettingsSaveResponseDto;

export const chatbotSettingsQuerySchema = z.object({
  key: optionalTrimmedQueryString(),
});

export type ChatbotSettingsQueryDto = z.infer<typeof chatbotSettingsQuerySchema>;

export const chatbotSettingsSaveRequestSchema = z.object({
  key: z.string().trim().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type ChatbotSettingsSaveRequestDto = z.infer<typeof chatbotSettingsSaveRequestSchema>;

const UNSUPPORTED_CHATBOT_AGENT_MODEL_KEYS = [
  'memoryValidationModel',
  'plannerModel',
  'selfCheckModel',
  'extractionValidationModel',
  'toolRouterModel',
  'loopGuardModel',
  'approvalGateModel',
  'memorySummarizationModel',
  'selectorInferenceModel',
  'outputNormalizationModel',
] as const;

export class ChatbotSettingsValidationError extends Error {
  code: 'invalid_shape';

  constructor(args: { code: 'invalid_shape'; message: string }) {
    super(args.message);
    this.name = 'ChatbotSettingsValidationError';
    this.code = args.code;
  }
}

export const parseChatbotSettingsPayload = (input: unknown): ChatbotSettingsPayload => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ChatbotSettingsValidationError({
      code: 'invalid_shape',
      message: 'Chatbot settings payload must be a JSON object.',
    });
  }

  const record = input as Record<string, unknown>;
  const unsupportedKeys = UNSUPPORTED_CHATBOT_AGENT_MODEL_KEYS.filter(
    (key: string): boolean => key in record
  );
  if (unsupportedKeys.length > 0) {
    throw new ChatbotSettingsValidationError({
      code: 'invalid_shape',
      message: `Chatbot settings payload includes unsupported keys: ${unsupportedKeys.join(', ')}.`,
    });
  }

  const parsed = chatbotSettingsSchema.strict().safeParse(record);
  if (!parsed.success) {
    throw new ChatbotSettingsValidationError({
      code: 'invalid_shape',
      message: 'Chatbot settings failed validation.',
    });
  }

  return parsed.data;
};
