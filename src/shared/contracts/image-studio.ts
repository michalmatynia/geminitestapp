import { z } from 'zod';

import { dtoBaseSchema } from './base';
import { imageFileSchema, type ImageFileRecord } from './files';
export type { ImageFileRecord };
import {
  imageStudioCenterDetectionModeSchema,
  imageStudioCenterLayoutConfigSchema,
  imageStudioCenterModeSchema,
  imageStudioCenterObjectBoundsSchema,
  imageStudioCenterShadowPolicySchema,
  imageStudioCropCanvasContextSchema,
  imageStudioCropModeSchema,
  imageStudioCropRectSchema,
  imageStudioUpscaleModeSchema,
  imageStudioUpscaleSmoothingQualitySchema,
  imageStudioUpscaleStrategySchema,
} from './image-studio-transform-contracts';
import { contextRegistryConsumerEnvelopeSchema } from './ai-context-registry';
import { promptValidationIssueSchema } from './prompt-engine';
import { asset3DRecordSchema } from './viewer3d';

import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterMode,
  ImageStudioCenterObjectBounds,
} from './image-studio-transform-contracts';

export type ImageStudioProjectListItem = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export interface StudioProjectDetail extends ImageStudioProjectListItem {
  description?: string;
  settings?: Record<string, unknown>;
}

export type LandingSlotLike = {
  index: number;
  status: string;
  output?: ImageFileRecord | null;
};

export type MaskShapeForExport = {
  id: string;
  type: string;
  points: Array<{ x: number; y: number }>;
  closed?: boolean;
  visible?: boolean;
  metadata?: Record<string, unknown>;
};

/**
 * Image Studio DTOs
 */
export * from './image-studio-transform-contracts';

export const IMAGE_STUDIO_ANALYSIS_ERROR_CODES = {
  INVALID_PAYLOAD: 'IMAGE_STUDIO_ANALYSIS_INVALID_PAYLOAD',
  SOURCE_SLOT_MISSING: 'IMAGE_STUDIO_ANALYSIS_SOURCE_SLOT_MISSING',
  SOURCE_IMAGE_MISSING: 'IMAGE_STUDIO_ANALYSIS_SOURCE_IMAGE_MISSING',
  SOURCE_IMAGE_INVALID: 'IMAGE_STUDIO_ANALYSIS_SOURCE_IMAGE_INVALID',
  SOURCE_DIMENSIONS_INVALID: 'IMAGE_STUDIO_ANALYSIS_SOURCE_DIMENSIONS_INVALID',
  SOURCE_OBJECT_NOT_FOUND: 'IMAGE_STUDIO_ANALYSIS_SOURCE_OBJECT_NOT_FOUND',
  OUTPUT_INVALID: 'IMAGE_STUDIO_ANALYSIS_OUTPUT_INVALID',
} as const;

export type ImageStudioAnalysisErrorCode =
  (typeof IMAGE_STUDIO_ANALYSIS_ERROR_CODES)[keyof typeof IMAGE_STUDIO_ANALYSIS_ERROR_CODES];

const IMAGE_STUDIO_ANALYSIS_MODE_VALUES = ['client_analysis', 'server_analysis'] as const;

export const imageStudioAnalysisModeSchema = z.enum(IMAGE_STUDIO_ANALYSIS_MODE_VALUES);
export type ImageStudioAnalysisMode = z.infer<typeof imageStudioAnalysisModeSchema>;

export const normalizeImageStudioAnalysisMode = (
  value: string | null | undefined
): ImageStudioAnalysisMode | null => {
  if (typeof value !== 'string') return null;
  const parsed = imageStudioAnalysisModeSchema.safeParse(value.trim());
  return parsed.success ? parsed.data : null;
};

export const imageStudioAnalysisRequestSchema = z.object({
  mode: imageStudioAnalysisModeSchema.optional().default('server_analysis'),
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  requestId: z.string().trim().min(8).max(160).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioAnalysisRequest = z.infer<typeof imageStudioAnalysisRequestSchema>;

export const IMAGE_STUDIO_AUTOSCALER_ERROR_CODES = {
  INVALID_PAYLOAD: 'IMAGE_STUDIO_AUTOSCALER_INVALID_PAYLOAD',
  SOURCE_SLOT_MISSING: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_SLOT_MISSING',
  SOURCE_IMAGE_MISSING: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_IMAGE_MISSING',
  SOURCE_IMAGE_INVALID: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_IMAGE_INVALID',
  SOURCE_DIMENSIONS_INVALID: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_DIMENSIONS_INVALID',
  SOURCE_IMAGE_TOO_LARGE: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_IMAGE_TOO_LARGE',
  SOURCE_OBJECT_NOT_FOUND: 'IMAGE_STUDIO_AUTOSCALER_SOURCE_OBJECT_NOT_FOUND',
  CLIENT_IMAGE_REQUIRED: 'IMAGE_STUDIO_AUTOSCALER_CLIENT_IMAGE_REQUIRED',
  CLIENT_DATA_URL_INVALID: 'IMAGE_STUDIO_AUTOSCALER_CLIENT_DATA_URL_INVALID',
  OUTPUT_INVALID: 'IMAGE_STUDIO_AUTOSCALER_OUTPUT_INVALID',
  OUTPUT_PERSIST_FAILED: 'IMAGE_STUDIO_AUTOSCALER_OUTPUT_PERSIST_FAILED',
} as const;

export type ImageStudioAutoScalerErrorCode =
  (typeof IMAGE_STUDIO_AUTOSCALER_ERROR_CODES)[keyof typeof IMAGE_STUDIO_AUTOSCALER_ERROR_CODES];

const IMAGE_STUDIO_AUTOSCALER_MODE_VALUES = ['client_auto_scaler', 'server_auto_scaler'] as const;

export const imageStudioAutoScalerModeSchema = z.enum(IMAGE_STUDIO_AUTOSCALER_MODE_VALUES);
export type ImageStudioAutoScalerMode = z.infer<typeof imageStudioAutoScalerModeSchema>;

export const normalizeImageStudioAutoScalerMode = (
  value: string | null | undefined
): ImageStudioAutoScalerMode | null => {
  if (typeof value !== 'string') return null;
  const parsed = imageStudioAutoScalerModeSchema.safeParse(value.trim());
  return parsed.success ? parsed.data : null;
};

export const imageStudioAutoScalerRequestSchema = z.object({
  mode: imageStudioAutoScalerModeSchema,
  dataUrl: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(180).optional(),
  requestId: z.string().trim().min(8).max(160).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioAutoScalerRequest = z.infer<typeof imageStudioAutoScalerRequestSchema>;

// --- Composite ---

export const compositeLayerConfigSchema = z.object({
  slotId: z.string(),
  order: z.number(),
  opacity: z.number().optional(),
  blendMode: z.enum(['normal', 'multiply', 'screen', 'overlay']).optional(),
});

export type CompositeLayerConfig = z.infer<typeof compositeLayerConfigSchema>;

export const slotGenerationMetadataSchema = z.object({
  role: z.enum(['generation', 'merge', 'base', 'import', 'composite']).optional(),
  sourceSlotId: z.string().optional(),
  relationType: z.string().optional(),
  generationFileId: z.string().optional(),
  generationRunId: z.string().optional(),
  generationOutputIndex: z.number().optional(),
  generationOutputCount: z.number().optional(),
  sourceSlotIds: z.array(z.string()).optional(),
  sourceReferenceIds: z.array(z.string()).optional(),
  outputFile: z
    .object({
      id: z.string(),
      filename: z.string(),
      filepath: z.string(),
      mimetype: z.string(),
      size: z.number(),
      width: z.number().nullable(),
      height: z.number().nullable(),
      tags: z.array(z.string()),
    })
    .optional(),
  generationRequest: z.record(z.string(), z.unknown()).optional(),
  generationSettings: z.record(z.string(), z.unknown()).optional(),
  crop: z.record(z.string(), z.unknown()).optional(),
  center: z.record(z.string(), z.unknown()).optional(),
  upscale: z.record(z.string(), z.unknown()).optional(),
  autoscale: z.record(z.string(), z.unknown()).optional(),
  generationCosts: z
    .object({
      currency: z.literal('USD'),
      estimated: z.literal(true),
      promptTokens: z.number(),
      promptCostUsdTotal: z.number(),
      promptCostUsdPerOutput: z.number(),
      imageCostUsdPerOutput: z.number(),
      totalCostUsdPerOutput: z.number(),
      outputCount: z.number(),
      actualCostUsd: z.number().optional(),
      tokenCostUsd: z.number().optional(),
    })
    .optional(),
  maskData: z
    .object({
      shapes: z.array(
        z.object({
          type: z.string(),
          points: z.array(z.object({ x: z.number(), y: z.number() })),
          closed: z.boolean(),
        })
      ),
      invert: z.boolean(),
      feather: z.number(),
      attachedAt: z.string(),
    })
    .optional(),
  variant: z.string().optional(),
  inverted: z.boolean().optional(),
  generationMode: z.string().optional(),
  polygonCount: z.number().optional(),
  generationParams: z
    .object({
      prompt: z.string().optional(),
      model: z.string().optional(),
      timestamp: z.string().optional(),
      runId: z.string().optional(),
      outputIndex: z.number().optional(),
      outputCount: z.number().optional(),
    })
    .optional(),
  annotation: z.string().optional(),
  sequence: z
    .object({
      runId: z.string().optional(),
    })
    .optional(),
  compositeConfig: z
    .object({
      layers: z.array(compositeLayerConfigSchema),
      flattenedSlotId: z.string().optional(),
    })
    .optional(),
});

export type SlotGenerationMetadata = z.infer<typeof slotGenerationMetadataSchema>;

export const imageStudioSlotSchema = dtoBaseSchema.extend({
  projectId: z.string(),
  index: z.number().optional(),
  name: z.string().nullable(),
  folderPath: z.string().nullable(),
  position: z.number().nullable().optional(),
  filename: z.string().nullable().optional(),
  filepath: z.string().nullable().optional(),
  mimetype: z.string().nullable().optional(),
  size: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  imageFileId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageBase64: z.string().nullable().optional(),
  asset3dId: z.string().nullable().optional(),
  screenshotFileId: z.string().nullable().optional(),
  metadata: slotGenerationMetadataSchema.nullable().optional(),
  imageFile: imageFileSchema.nullable().optional(),
  screenshotFile: imageFileSchema.nullable().optional(),
  asset3d: asset3DRecordSchema.nullable().optional(),
});

export type ImageStudioSlot = z.infer<typeof imageStudioSlotSchema>;
export type { ImageStudioSlot as ImageStudioSlotRecord, ImageStudioSlot as ImageStudioSlotDto };

export const createImageStudioSlotSchema = z.object({
  name: z.string().nullable().optional(),
  folderPath: z.string().nullable().optional(),
  imageFileId: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  imageBase64: z.string().nullable().optional(),
  asset3dId: z.string().nullable().optional(),
  metadata: slotGenerationMetadataSchema.nullable().optional(),
});

export type CreateImageStudioSlotDto = z.infer<typeof createImageStudioSlotSchema>;

export const updateImageStudioSlotSchema = createImageStudioSlotSchema.partial();

export type UpdateImageStudioSlotDto = z.infer<typeof updateImageStudioSlotSchema>;

export const imageStudioAssetDtoSchema = z.object({
  id: z.string(),
  filepath: z.string(),
  filename: z.string().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
});

export type ImageStudioAssetDto = z.infer<typeof imageStudioAssetDtoSchema>;

export const imageStudioProjectSchema = dtoBaseSchema.extend({
  name: z.string().nullable().optional(),
  canvasWidthPx: z.number().nullable(),
  canvasHeightPx: z.number().nullable(),
});

export type ImageStudioProject = z.infer<typeof imageStudioProjectSchema>;
export type ImageStudioProjectRecord = ImageStudioProject;

export const imageStudioRunDispatchModeSchema = z.enum(['queued', 'inline']);
export type ImageStudioRunDispatchMode = z.infer<typeof imageStudioRunDispatchModeSchema>;
type ImageStudioRunDispatchModeDto = ImageStudioRunDispatchMode;
export type { ImageStudioRunDispatchModeDto };

export const studioProjectsResponseSchema = z.object({
  projects: z.array(imageStudioProjectSchema),
});

export type StudioProjectsResponse = z.infer<typeof studioProjectsResponseSchema>;

export const studioSlotsResponseSchema = z.object({
  slots: z.array(imageStudioSlotSchema),
});

export type StudioSlotsResponse = z.infer<typeof studioSlotsResponseSchema>;

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

export const imageStudioObjectDetectionUsedSchema = z.enum([
  'alpha_bbox',
  'white_bg_first_colored_pixel',
]);

export type ImageStudioObjectDetectionUsed = z.infer<typeof imageStudioObjectDetectionUsedSchema>;

export const imageStudioWhitespaceMetricsSchema = z.object({
  px: z.object({
    left: z.number().finite(),
    top: z.number().finite(),
    right: z.number().finite(),
    bottom: z.number().finite(),
  }),
  percent: z.object({
    left: z.number().finite(),
    top: z.number().finite(),
    right: z.number().finite(),
    bottom: z.number().finite(),
  }),
});

export type ImageStudioWhitespaceMetrics = z.infer<typeof imageStudioWhitespaceMetricsSchema>;

export const imageStudioNormalizedCenterLayoutSchema = z.object({
  paddingPercent: z.number().finite(),
  paddingXPercent: z.number().finite(),
  paddingYPercent: z.number().finite(),
  fillMissingCanvasWhite: z.boolean(),
  targetCanvasWidth: z.number().int().positive().nullable(),
  targetCanvasHeight: z.number().int().positive().nullable(),
  whiteThreshold: z.number().int().finite(),
  chromaThreshold: z.number().int().finite(),
  shadowPolicy: imageStudioCenterShadowPolicySchema,
  detection: imageStudioCenterDetectionModeSchema,
});

export type ImageStudioNormalizedCenterLayout = z.infer<
  typeof imageStudioNormalizedCenterLayoutSchema
>;

export const imageStudioCenterLayoutMetadataSchema = z.object({
  paddingPercent: z.number().finite().optional(),
  paddingXPercent: z.number().finite().optional(),
  paddingYPercent: z.number().finite().optional(),
  fillMissingCanvasWhite: z.boolean().optional(),
  targetCanvasWidth: z.number().int().positive().nullable().optional(),
  targetCanvasHeight: z.number().int().positive().nullable().optional(),
  whiteThreshold: z.number().int().finite().optional(),
  chromaThreshold: z.number().int().finite().optional(),
  shadowPolicy: imageStudioCenterShadowPolicySchema.optional(),
  layoutPolicyVersion: z.string().trim().min(1).nullable().optional(),
  detectionPolicyDecision: z.string().trim().min(1).nullable().optional(),
  detectionUsed: imageStudioCenterDetectionModeSchema.nullable().optional(),
  scale: z.number().finite().nullable().optional(),
});

export type ImageStudioCenterLayoutMetadata = z.infer<typeof imageStudioCenterLayoutMetadataSchema>;

export const imageStudioAutoScalerLayoutMetadataSchema = z.object({
  paddingPercent: z.number().finite().optional(),
  paddingXPercent: z.number().finite().optional(),
  paddingYPercent: z.number().finite().optional(),
  fillMissingCanvasWhite: z.boolean().optional(),
  targetCanvasWidth: z.number().int().positive().nullable().optional(),
  targetCanvasHeight: z.number().int().positive().nullable().optional(),
  whiteThreshold: z.number().int().finite().optional(),
  chromaThreshold: z.number().int().finite().optional(),
  shadowPolicy: imageStudioCenterShadowPolicySchema.optional(),
  layoutPolicyVersion: z.string().trim().min(1).nullable().optional(),
  detectionPolicyDecision: z.string().trim().min(1).nullable().optional(),
});

export type ImageStudioAutoScalerLayoutMetadata = z.infer<
  typeof imageStudioAutoScalerLayoutMetadataSchema
>;

export const imageStudioOperationLifecycleSchema = z.object({
  state: z.enum(['analyzed', 'persisted']),
  durationMs: z.number().int().nonnegative(),
});

export type ImageStudioOperationLifecycle = z.infer<typeof imageStudioOperationLifecycleSchema>;

export const imageStudioDetectionCandidateScoreSchema = z.object({
  confidence: z.number().finite().min(0).max(1),
  area: z.number().int().positive(),
});

export type ImageStudioDetectionCandidateScore = z.infer<
  typeof imageStudioDetectionCandidateScoreSchema
>;

export const imageStudioDetectionCandidateSummarySchema = z.object({
  alpha_bbox: imageStudioDetectionCandidateScoreSchema.nullable(),
  white_bg_first_colored_pixel: imageStudioDetectionCandidateScoreSchema.nullable(),
});

export type ImageStudioDetectionCandidateSummary = z.infer<
  typeof imageStudioDetectionCandidateSummarySchema
>;

export const imageStudioDetectionDetailsSchema = z.object({
  shadowPolicyRequested: imageStudioCenterShadowPolicySchema,
  shadowPolicyApplied: imageStudioCenterShadowPolicySchema,
  componentCount: z.number().int().nonnegative(),
  coreComponentCount: z.number().int().nonnegative(),
  selectedComponentPixels: z.number().int().nonnegative(),
  selectedComponentCoverage: z.number().finite().min(0).max(1),
  foregroundPixels: z.number().int().nonnegative(),
  corePixels: z.number().int().nonnegative(),
  touchesBorder: z.boolean(),
  maskSource: z.enum(['foreground', 'core']),
  policyVersion: z.string().trim().min(1).optional(),
  policyReason: z.string().trim().min(1).optional(),
  fallbackApplied: z.boolean().optional(),
  candidateDetections: imageStudioDetectionCandidateSummarySchema.optional(),
});

export type ImageStudioDetectionDetails = z.infer<typeof imageStudioDetectionDetailsSchema>;

export type ImageStudioDetectionCandidate<TDetails> = {
  detectionUsed: Exclude<ImageStudioCenterDetectionMode, 'auto'>;
  bounds: ImageStudioCenterObjectBounds;
  confidence: number;
  detectionDetails?: TDetails | null;
  details?: TDetails | null;
};

export type ImageStudioDetectionCandidateScoreSummary = {
  confidence: number;
  area: number;
};

export type ImageStudioDetectionPolicyDecision<TDetails> = {
  selected: ImageStudioDetectionCandidate<TDetails> | null;
  policyVersion: string;
  reason: string;
  fallbackApplied: boolean;
  candidateDetections: ImageStudioDetectionCandidateSummary;
};

/**
 * Image Analysis DTOs
 */

export type PixelData = ArrayLike<number>;

export const whiteBackgroundModelSchema = z.object({
  r: z.number(),
  g: z.number(),
  b: z.number(),
  chroma: z.number(),
  whiteThreshold: z.number(),
  chromaThreshold: z.number(),
  chromaDeltaThreshold: z.number(),
});

export type WhiteBackgroundModel = z.infer<typeof whiteBackgroundModelSchema>;

export const whiteForegroundMaskSourceSchema = z.enum(['foreground', 'core']);
export type WhiteForegroundMaskSource = z.infer<typeof whiteForegroundMaskSourceSchema>;

export const connectedComponentSchema = z.object({
  left: z.number(),
  top: z.number(),
  right: z.number(),
  bottom: z.number(),
  pixelCount: z.number(),
  touchesBorder: z.boolean(),
  centroidX: z.number(),
  centroidY: z.number(),
});

export type ConnectedComponent = z.infer<typeof connectedComponentSchema>;

export const imageStudioAnalysisResultSchema = z.object({
  sourceObjectBounds: imageStudioCenterObjectBoundsSchema,
  bounds: imageStudioCenterObjectBoundsSchema,
  detectionUsed: imageStudioObjectDetectionUsedSchema,
  confidence: z.number().finite().min(0).max(1),
  detectionDetails: imageStudioDetectionDetailsSchema.nullable().optional(),
  details: imageStudioDetectionDetailsSchema.nullable().optional(),
  policyVersion: z.string(),
  policyReason: z.string(),
  fallbackApplied: z.boolean(),
  candidateDetections: imageStudioDetectionCandidateSummarySchema,
  whitespace: imageStudioWhitespaceMetricsSchema,
  objectAreaPercent: z.number(),
  layout: imageStudioNormalizedCenterLayoutSchema,
});

export type ImageStudioAnalysisResult = z.infer<typeof imageStudioAnalysisResultSchema>;

export const imageStudioAutoScalePlanSchema = z.object({
  targetWidth: z.number(),
  targetHeight: z.number(),
  outputWidth: z.number(),
  outputHeight: z.number(),
  scale: z.number(),
  offsetX: z.number(),
  offsetY: z.number(),
  paddingX: z.number(),
  paddingY: z.number(),
  sourceObjectBounds: imageStudioCenterObjectBoundsSchema,
  targetObjectBounds: imageStudioCenterObjectBoundsSchema,
  whitespaceBefore: imageStudioWhitespaceMetricsSchema,
  whitespaceAfter: imageStudioWhitespaceMetricsSchema,
  whitespace: imageStudioWhitespaceMetricsSchema,
  objectAreaPercentBefore: z.number(),
  objectAreaPercentAfter: z.number(),
});

export type ImageStudioAutoScalePlan = z.infer<typeof imageStudioAutoScalePlanSchema>;

export const imageStudioAutoScaleAnalysisSchema = z.object({
  analysis: imageStudioAnalysisResultSchema,
  plan: imageStudioAutoScalePlanSchema,
});

export type ImageStudioAutoScaleAnalysis = z.infer<typeof imageStudioAutoScaleAnalysisSchema>;

export const imageStudioAnalysisSummarySchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sourceObjectBounds: imageStudioCenterObjectBoundsSchema,
  detectionUsed: imageStudioObjectDetectionUsedSchema,
  confidence: z.number().finite().min(0).max(1),
  detectionDetails: imageStudioDetectionDetailsSchema.nullable().optional(),
  policyVersion: z.string().trim().min(1),
  policyReason: z.string().trim().min(1),
  fallbackApplied: z.boolean(),
  candidateDetections: imageStudioDetectionCandidateSummarySchema,
  whitespace: imageStudioWhitespaceMetricsSchema,
  objectAreaPercent: z.number().finite(),
  layout: imageStudioNormalizedCenterLayoutSchema,
  suggestedPlan: z.object({
    outputWidth: z.number().int().positive(),
    outputHeight: z.number().int().positive(),
    targetObjectBounds: imageStudioCenterObjectBoundsSchema,
    scale: z.number().finite(),
    whitespace: imageStudioWhitespaceMetricsSchema,
  }),
});

export type ImageStudioAnalysisSummary = z.infer<typeof imageStudioAnalysisSummarySchema>;

export const imageStudioAnalysisResponseSchema = z.object({
  sourceSlotId: z.string(),
  mode: imageStudioAnalysisModeSchema,
  effectiveMode: imageStudioAnalysisModeSchema,
  authoritativeSource: z.enum(['source_slot', 'client_upload']),
  sourceMimeHint: z.string().nullable(),
  analysis: imageStudioAnalysisSummarySchema,
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioAnalysisResponse = z.infer<typeof imageStudioAnalysisResponseSchema>;

const imageStudioOutputImageSchema = z
  .object({
    id: z.string(),
    filename: z.string(),
    filepath: z.string(),
    mimetype: z.string(),
    size: z.number().finite().nonnegative(),
    width: z.number().finite().nullable().optional(),
    height: z.number().finite().nullable().optional(),
  })
  .passthrough();

export const imageStudioCropResponseSchema = z.object({
  sourceSlotId: z.string().optional(),
  mode: imageStudioCropModeSchema,
  effectiveMode: imageStudioCropModeSchema,
  slot: imageStudioSlotSchema,
  imageFile: imageStudioOutputImageSchema.optional(),
  cropRect: imageStudioCropRectSchema.nullable().optional(),
  canvasContext: imageStudioCropCanvasContextSchema.nullable().optional(),
  requestId: z.string().nullable().optional(),
  fingerprint: z.string().optional(),
  deduplicated: z.boolean(),
  dedupeReason: z.enum(['request', 'fingerprint']).optional(),
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioCropResponse = z.infer<typeof imageStudioCropResponseSchema>;

export const imageStudioUpscaleResponseSchema = z.object({
  sourceSlotId: z.string().optional(),
  mode: imageStudioUpscaleModeSchema,
  effectiveMode: imageStudioUpscaleModeSchema,
  strategy: imageStudioUpscaleStrategySchema,
  scale: z.number().finite().nullable().optional(),
  targetWidth: z.number().int().positive().nullable().optional(),
  targetHeight: z.number().int().positive().nullable().optional(),
  smoothingQuality: imageStudioUpscaleSmoothingQualitySchema.nullable().optional(),
  slot: imageStudioSlotSchema,
  output: imageStudioOutputImageSchema.optional(),
  requestId: z.string().nullable().optional(),
  fingerprint: z.string().optional(),
  deduplicated: z.boolean(),
  dedupeReason: z.enum(['request', 'fingerprint']).optional(),
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioUpscaleResponse = z.infer<typeof imageStudioUpscaleResponseSchema>;

export const imageStudioCenterResponseSchema = z.object({
  sourceSlotId: z.string().optional(),
  mode: imageStudioCenterModeSchema,
  effectiveMode: imageStudioCenterModeSchema,
  slot: imageStudioSlotSchema,
  output: imageStudioOutputImageSchema.optional(),
  sourceObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  targetObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  layout: imageStudioCenterLayoutMetadataSchema.nullable().optional(),
  detectionUsed: imageStudioObjectDetectionUsedSchema.nullable().optional(),
  confidenceBefore: z.number().finite().min(0).max(1).nullable().optional(),
  detectionDetails: imageStudioDetectionDetailsSchema.nullable().optional(),
  scale: z.number().finite().nullable().optional(),
  requestId: z.string().nullable().optional(),
  fingerprint: z.string().optional(),
  deduplicated: z.boolean(),
  dedupeReason: z.enum(['request', 'fingerprint']).optional(),
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioCenterResponse = z.infer<typeof imageStudioCenterResponseSchema>;

export const imageStudioAutoScalerResponseSchema = z.object({
  sourceSlotId: z.string().optional(),
  mode: imageStudioAutoScalerModeSchema,
  effectiveMode: imageStudioAutoScalerModeSchema,
  slot: imageStudioSlotSchema,
  output: imageStudioOutputImageSchema.optional(),
  sourceObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  targetObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  layout: imageStudioAutoScalerLayoutMetadataSchema.nullable().optional(),
  detectionUsed: imageStudioObjectDetectionUsedSchema.nullable().optional(),
  confidenceBefore: z.number().finite().min(0).max(1).nullable().optional(),
  detectionDetails: imageStudioDetectionDetailsSchema.nullable().optional(),
  scale: z.number().finite().nullable().optional(),
  whitespaceBefore: imageStudioWhitespaceMetricsSchema.nullable().optional(),
  whitespaceAfter: imageStudioWhitespaceMetricsSchema.nullable().optional(),
  objectAreaPercentBefore: z.number().finite().nullable().optional(),
  objectAreaPercentAfter: z.number().finite().nullable().optional(),
  requestId: z.string().nullable().optional(),
  fingerprint: z.string().optional(),
  deduplicated: z.boolean(),
  dedupeReason: z.enum(['request', 'fingerprint']).optional(),
  lifecycle: imageStudioOperationLifecycleSchema,
  pipelineVersion: z.string().trim().min(1),
});

export type ImageStudioAutoScalerResponse = z.infer<typeof imageStudioAutoScalerResponseSchema>;

export type UploadedImageBinaryDto = {
  buffer: Buffer;
  mime: string;
};
export type {
  UploadedImageBinaryDto as UploadedImageBinary,
  UploadedImageBinaryDto as UploadedClientAnalysisImage,
  UploadedImageBinaryDto as UploadedClientCenterImage,
  UploadedImageBinaryDto as UploadedClientCropImage,
  UploadedImageBinaryDto as UploadedClientAutoScaleImage,
};

export type ImageStudioCenterMetadata = {
  effectiveMode?: string;
  sourceObjectBounds?: ImageStudioCenterObjectBounds | null;
  targetObjectBounds?: ImageStudioCenterObjectBounds | null;
  layout?: ImageStudioCenterLayoutMetadata | null;
  detectionUsed?: ImageStudioObjectDetectionUsed | null;
  confidenceBefore?: number | null;
  detectionDetails?: ImageStudioDetectionDetails | null;
  scale?: number | null;
};

export type ImageStudioAutoScaleMetadata = {
  effectiveMode?: string;
  sourceObjectBounds?: ImageStudioCenterObjectBounds | null;
  targetObjectBounds?: ImageStudioCenterObjectBounds | null;
  layout?: ImageStudioNormalizedCenterLayout | null;
  detectionUsed?: string | null;
  confidenceBefore?: number | null;
  detectionDetails?: ImageStudioDetectionDetails | null;
  scale?: number | null;
  whitespaceBefore?: ImageStudioWhitespaceMetrics | null;
  whitespaceAfter?: ImageStudioWhitespaceMetrics | null;
  objectAreaPercentBefore?: number | null;
  objectAreaPercentAfter?: number | null;
};

export type ImageStudioRunStatus = 'queued' | 'running' | 'completed' | 'failed';

export type ImageStudioRunHistoryEventSource = 'api' | 'queue' | 'worker' | 'stream' | 'client';

export type ImageStudioRunHistoryEvent = {
  id: string;
  type: string;
  source: ImageStudioRunHistoryEventSource;
  message: string;
  at: string;
  payload?: Record<string, unknown>;
};

export type ImageStudioRunOutputRecord = ImageFileRecord;

export type ImageStudioRunRecord = {
  id: string;
  projectId: string;
  status: ImageStudioRunStatus;
  dispatchMode: 'queued' | 'inline' | null;
  request: ImageStudioRunRequest;
  expectedOutputs: number;
  outputs: ImageStudioRunOutputRecord[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  historyEvents: ImageStudioRunHistoryEvent[];
};

export type ImageStudioRunDetailResponse = {
  run: ImageStudioRunRecord;
};

// --- Sequence Runs ---

export type ImageStudioSequenceRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

type ImageStudioSequenceRunDispatchMode = ImageStudioRunDispatchMode;
export type { ImageStudioSequenceRunDispatchMode };

export type ImageStudioSequenceRunHistoryEventSource =
  | 'api'
  | 'queue'
  | 'worker'
  | 'stream'
  | 'client';

export type ImageStudioSequenceMaskContext = {
  polygons: Array<Array<{ x: number; y: number }>>;
  invert: boolean;
  feather: number;
  slotId?: string | null;
} | null;

export type ImageStudioSequenceRunRequest = {
  projectId: string;
  sourceSlotId: string;
  prompt: string;
  paramsState: Record<string, unknown> | null;
  referenceSlotIds: string[];
  steps: unknown[]; // Avoid circular dependency with studio-settings for now or move steps to contract
  mask: ImageStudioSequenceMaskContext;
  studioSettings: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  contextRegistry?: z.infer<typeof contextRegistryConsumerEnvelopeSchema> | null;
};

const imageStudioSequencePointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const imageStudioSequenceRunStartRequestSchema = z.object({
  projectId: z.string().trim().min(1),
  sourceSlotId: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  paramsState: z.record(z.string(), z.unknown()).nullable().optional(),
  referenceSlotIds: z.array(z.string().trim().min(1)).optional(),
  mask: z
    .object({
      polygons: z.array(z.array(imageStudioSequencePointSchema).min(3)).min(1),
      invert: z.boolean().optional(),
      feather: z.number().min(0).max(50).optional(),
    })
    .nullable()
    .optional(),
  studioSettings: z.record(z.string(), z.unknown()).nullable().optional(),
  steps: z.array(z.unknown()).optional(),
  presetId: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ImageStudioSequenceRunStartRequest = z.infer<
  typeof imageStudioSequenceRunStartRequestSchema
>;

export type ImageStudioSequenceRunHistoryEvent = ImageStudioRunHistoryEvent;

export type ImageStudioSequenceRunRecord = {
  id: string;
  projectId: string;
  sourceSlotId: string;
  currentSlotId: string;
  status: ImageStudioSequenceRunStatus;
  dispatchMode: ImageStudioSequenceRunDispatchMode | null;
  request: ImageStudioSequenceRunRequest;
  activeStepIndex: number | null;
  activeStepId: string | null;
  outputSlotIds: string[];
  runtimeMask: ImageStudioSequenceMaskContext;
  cancelRequested: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  historyEvents: ImageStudioSequenceRunHistoryEvent[];
};

export type ImageStudioSequenceRunStartResponseDto = {
  runId: string;
  status: ImageStudioSequenceRunStatus;
  dispatchMode: ImageStudioSequenceRunDispatchMode;
  currentSlotId: string;
  stepCount: number;
};
export type ImageStudioSequenceRunStartResponse = ImageStudioSequenceRunStartResponseDto;

export type RunStudioEnqueueResult = {
  ok: boolean;
  runId: string;
  status: ImageStudioRunStatus;
  dispatchMode: 'queued' | 'inline';
  expectedOutputs: number;
};

export type RunsTotalResponseDto<TRun> = {
  runs: TRun[];
  total: number;
};
export type RunsTotalResponse<TRun> = RunsTotalResponseDto<TRun>;

export type ImageStudioRunsResponse = RunsTotalResponseDto<ImageStudioRunRecord>;

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

// --- Run Execution ---

export const imageStudioRunMaskSchema = z.union([
  z.object({
    type: z.literal('polygon'),
    points: z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })).min(3),
    closed: z.boolean(),
  }),
  z.object({
    type: z.literal('polygons'),
    polygons: z
      .array(z.array(z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })).min(3))
      .min(1),
    invert: z.boolean().optional(),
    feather: z.number().min(0).max(50).optional(),
  }),
]);

export type ImageStudioRunMask = z.infer<typeof imageStudioRunMaskSchema>;

export const imageStudioRunCenterSchema = z.object({
  mode: imageStudioCenterModeSchema.default('server_alpha_bbox'),
  dataUrl: z.string().trim().min(1).optional(),
  layout: imageStudioCenterLayoutConfigSchema.optional(),
});

export type ImageStudioRunCenter = z.infer<typeof imageStudioRunCenterSchema>;

export const imageStudioRunRequestSchema = z.object({
  projectId: z.string().min(1).max(120),
  operation: z.enum(['generate', 'center_object']).default('generate').optional(),
  asset: z
    .object({
      filepath: z.string().min(1),
      id: z.string().optional(),
    })
    .optional(),
  referenceAssets: z
    .array(
      z.object({
        filepath: z.string().min(1),
        id: z.string().optional(),
      })
    )
    .optional(),
  prompt: z.string().min(1),
  mask: imageStudioRunMaskSchema.nullable().optional(),
  center: imageStudioRunCenterSchema.optional(),
  studioSettings: z.record(z.string(), z.unknown()).optional(),
  contextRegistry: contextRegistryConsumerEnvelopeSchema.optional(),
});

export type ImageStudioRunRequest = z.infer<typeof imageStudioRunRequestSchema>;
export type RunStudioPayload = ImageStudioRunRequest;

export type ImageStudioGenerationExecutionMeta = {
  operation: 'generate';
  modelRequested: string;
  modelUsed: string;
  outputFormat: 'png' | 'jpeg' | 'webp';
  requestedOutputCount: number;
  responseImageCount: number;
  inputImageCount: number;
  usedMask: boolean;
  requestedSize: string | null;
  effectiveSize: string | null;
  requestedQuality: string | null;
  effectiveQuality: string | null;
  requestedBackground: string | null;
  effectiveBackground: string | null;
  unknownParameterDrops: string[];
  usedDalle2ModelFallback: boolean;
  apiAttemptCount: number;
};

export type ImageStudioCenterExecutionMeta = {
  operation: 'center_object';
  mode: ImageStudioCenterMode;
  outputFormat: 'png' | 'jpeg' | 'webp';
  requestedOutputCount: 1;
  responseImageCount: 1;
  inputImageCount: 1;
  sourceObjectBounds: ImageStudioCenterObjectBounds | null;
  targetObjectBounds: ImageStudioCenterObjectBounds | null;
  layout: {
    paddingPercent: number;
    paddingXPercent: number;
    paddingYPercent: number;
    fillMissingCanvasWhite: boolean;
    targetCanvasWidth: number | null;
    targetCanvasHeight: number | null;
    whiteThreshold: number;
    chromaThreshold: number;
    shadowPolicy: 'auto' | 'include_shadow' | 'exclude_shadow';
    detectionUsed: ImageStudioCenterDetectionMode | null;
    scale: number | null;
  } | null;
};

export type ImageStudioRunExecutionMeta =
  | ImageStudioGenerationExecutionMeta
  | ImageStudioCenterExecutionMeta;

export type ImageStudioRunExecutionResult = {
  projectId: string;
  outputs: ImageFileRecord[];
  executionMeta: ImageStudioRunExecutionMeta;
};
