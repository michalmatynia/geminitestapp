import { z } from 'zod';
import { contextRegistryConsumerEnvelopeSchema } from '../ai-context-registry';
import { promptValidationIssueSchema } from '../prompt-engine';

export type MaskShapeForExport = {
  id: string;
  type: string;
  points: Array<{ x: number; y: number }>;
  closed?: boolean;
  visible?: boolean;
  metadata?: Record<string, unknown>;
};

export const imageStudioAssetDtoSchema = z.object({
  id: z.string(),
  filepath: z.string(),
  filename: z.string().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});

export type ImageStudioAssetDto = z.infer<typeof imageStudioAssetDtoSchema>;

export const imageStudioModelsSourceSchema = z.enum(['brain']);

export type ImageStudioModelsSource = z.infer<typeof imageStudioModelsSourceSchema>;

export const imageStudioModelsResponseSchema = z.object({
  models: z.array(z.string()),
  source: imageStudioModelsSourceSchema,
  warning: z.string().optional(),
});

export type ImageStudioModelsResponse = z.infer<typeof imageStudioModelsResponseSchema>;

export const imageStudioPromptExtractModeSchema = z.enum(['programmatic', 'gpt', 'hybrid']);

export type ImageStudioPromptExtractMode = z.infer<typeof imageStudioPromptExtractModeSchema>;

export const imageStudioPromptExtractSourceSchema = z.enum([
  'programmatic',
  'programmatic_autofix',
  'gpt',
]);

export type ImageStudioPromptExtractSource = z.infer<typeof imageStudioPromptExtractSourceSchema>;

export const imageStudioPromptExtractValidationSchema = z.object({
  before: z.array(promptValidationIssueSchema),
  after: z.array(promptValidationIssueSchema),
});

export const imageStudioPromptExtractDiagnosticsSchema = z.object({
  programmaticError: z.string().nullable(),
  aiError: z.string().nullable(),
  model: z.string().nullable(),
  autofixApplied: z.boolean(),
});

export const imageStudioPromptExtractResponseSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  source: imageStudioPromptExtractSourceSchema,
  modeRequested: imageStudioPromptExtractModeSchema,
  fallbackUsed: z.boolean(),
  formattedPrompt: z.string().nullable(),
  validation: imageStudioPromptExtractValidationSchema,
  diagnostics: imageStudioPromptExtractDiagnosticsSchema,
});

export type ImageStudioPromptExtractResponse = z.infer<
  typeof imageStudioPromptExtractResponseSchema
>;

export const imageStudioPromptExtractRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  mode: imageStudioPromptExtractModeSchema.optional(),
  applyAutofix: z.boolean().optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ImageStudioPromptExtractRequest = z.infer<
  typeof imageStudioPromptExtractRequestSchema
>;

export const imageStudioUiExtractorControlSchema = z.enum([
  'auto',
  'checkbox',
  'buttons',
  'select',
  'slider',
  'number',
  'text',
  'textarea',
  'json',
  'rgb',
  'tuple2',
]);

export type ImageStudioUiExtractorControl = z.infer<typeof imageStudioUiExtractorControlSchema>;

export const imageStudioUiExtractorParamSpecSchema = z
  .object({
    kind: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    enumOptions: z.array(z.string()).optional(),
  })
  .partial();

export const imageStudioUiExtractorRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  params: z.array(
    z.object({
      path: z.string().trim().min(1),
      value: z.unknown(),
      spec: imageStudioUiExtractorParamSpecSchema.nullable().optional(),
    })
  ),
  mode: z.enum(['heuristic', 'ai', 'both']).optional().default('ai'),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ImageStudioUiExtractorRequest = z.infer<typeof imageStudioUiExtractorRequestSchema>;

export const imageStudioUiExtractorResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      path: z.string().trim().min(1),
      control: imageStudioUiExtractorControlSchema,
      reason: z.string().trim().min(1).nullable().optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
  ),
});

export type ImageStudioUiExtractorResponse = z.infer<
  typeof imageStudioUiExtractorResponseSchema
>;

export const imageStudioMaskAiModeSchema = z.enum(['bbox', 'polygon']);

export type ImageStudioMaskAiMode = z.infer<typeof imageStudioMaskAiModeSchema>;

export const imageStudioMaskAiRequestSchema = z.object({
  imagePath: z.string().trim().min(1),
  mode: imageStudioMaskAiModeSchema.optional().default('bbox'),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ImageStudioMaskAiRequest = z.infer<typeof imageStudioMaskAiRequestSchema>;

export const imageStudioValidationPatternsLearnRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  limit: z.number().int().min(1).max(20).optional().default(8),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ImageStudioValidationPatternsLearnRequest = z.infer<
  typeof imageStudioValidationPatternsLearnRequestSchema
>;

export type ImageStudioDeleteVariantMode = 'slot_cascade' | 'asset_only' | 'noop';

export type ImageStudioDeleteVariantResponse = {
  ok: true;
  modeUsed: ImageStudioDeleteVariantMode;
  matchedSlotIds: string[];
  deletedSlotIds: string[];
  deletedFileIds: string[];
  deletedFilepaths: string[];
  warnings: string[];
};
