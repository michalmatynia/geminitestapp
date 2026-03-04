import { z } from 'zod';
import { dtoBaseSchema } from './base';
import { imageFileSchema } from './files';
import { asset3DRecordSchema } from './viewer3d';
import type { ImageStudioRunRequest } from './image-studio';
import {
  imageStudioCenterShadowPolicySchema,
  imageStudioCenterDetectionModeSchema,
  type ImageStudioCenterDetectionMode,
  type ImageStudioCenterObjectBounds,
  imageStudioCenterObjectBoundsSchema,
  imageStudioAnalysisModeSchema,
  imageStudioCropModeSchema,
  imageStudioCropRectSchema,
  imageStudioCropCanvasContextSchema,
  imageStudioUpscaleModeSchema,
  imageStudioUpscaleStrategySchema,
  imageStudioUpscaleSmoothingQualitySchema,
  imageStudioCenterModeSchema,
  imageStudioAutoScalerModeSchema,
} from './image-studio-shared';

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
export type ImageStudioSlotRecord = ImageStudioSlot;
export type ImageStudioSlotDto = ImageStudioSlot;

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
  canvasWidthPx: z.number().nullable(),
  canvasHeightPx: z.number().nullable(),
});

export type ImageStudioProject = z.infer<typeof imageStudioProjectSchema>;
export type ImageStudioProjectRecord = ImageStudioProject;

export const imageStudioRunDispatchModeSchema = z.enum(['queued', 'inline']);
export type ImageStudioRunDispatchMode = z.infer<typeof imageStudioRunDispatchModeSchema>;
export type ImageStudioRunDispatchModeDto = ImageStudioRunDispatchMode;

export const studioProjectsResponseSchema = z.object({
  projects: z.array(imageStudioProjectSchema),
});

export type StudioProjectsResponse = z.infer<typeof studioProjectsResponseSchema>;

export const studioSlotsResponseSchema = z.object({
  slots: z.array(imageStudioSlotSchema),
});

export type StudioSlotsResponse = z.infer<typeof studioSlotsResponseSchema>;

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

export type UploadedClientCenterImage = {
  buffer: Buffer;
  mime: string;
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

export type UploadedClientAutoScaleImage = {
  buffer: Buffer;
  mime: string;
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

