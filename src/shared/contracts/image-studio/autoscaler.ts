import { z } from 'zod';
import {
  imageStudioCenterLayoutConfigSchema,
  imageStudioCenterObjectBoundsSchema,
  imageStudioObjectDetectionUsedSchema,
  imageStudioDetectionDetailsSchema,
  type ImageStudioCenterObjectBounds,
  type ImageStudioNormalizedCenterLayout,
} from '../image-studio-transform-contracts';
import {
  imageStudioWhitespaceMetricsSchema,
  type ImageStudioWhitespaceMetrics,
} from './whitespace';
import { imageStudioOperationLifecycleSchema } from './base';
import {
  imageStudioAnalysisResultSchema,
} from './analysis';
import { imageStudioSlotSchema } from './slot';
import { type ImageStudioDetectionDetails } from '../image-studio-transform-contracts';

export const imageStudioAutoScalerModeSchema = z.enum(['client_auto_scaler', 'server_auto_scaler']);
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

export const imageStudioAutoScalerResponseSchema = z.object({
  sourceSlotId: z.string().optional(),
  mode: imageStudioAutoScalerModeSchema,
  effectiveMode: imageStudioAutoScalerModeSchema,
  slot: imageStudioSlotSchema,
  output: z
    .object({
      id: z.string(),
      filename: z.string(),
      filepath: z.string(),
      mimetype: z.string(),
      size: z.number().finite().nonnegative(),
      width: z.number().finite().nullable().optional(),
      height: z.number().finite().nullable().optional(),
    })
    .passthrough()
    .optional(),
  sourceObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  targetObjectBounds: imageStudioCenterObjectBoundsSchema.nullable().optional(),
  layout: z
    .object({
      paddingPercent: z.number().finite().optional(),
      paddingXPercent: z.number().finite().optional(),
      paddingYPercent: z.number().finite().optional(),
      fillMissingCanvasWhite: z.boolean().optional(),
      targetCanvasWidth: z.number().int().positive().nullable().optional(),
      targetCanvasHeight: z.number().int().positive().nullable().optional(),
      whiteThreshold: z.number().int().finite().optional(),
      chromaThreshold: z.number().int().finite().optional(),
      shadowPolicy: z.enum(['auto', 'include_shadow', 'exclude_shadow']).optional(),
      layoutPolicyVersion: z.string().trim().min(1).nullable().optional(),
      detectionPolicyDecision: z.string().trim().min(1).nullable().optional(),
    })
    .nullable()
    .optional(),
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
