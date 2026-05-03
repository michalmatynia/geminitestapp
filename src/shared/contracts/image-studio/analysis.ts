import { z } from 'zod';
import {
  imageStudioCenterLayoutConfigSchema,
  imageStudioCenterObjectBoundsSchema,
  type imageStudioCenterDetectionModeSchema,
} from '../image-studio-transform-contracts';
import {
  imageStudioDetectionCandidateSummarySchema,
  imageStudioDetectionDetailsSchema,
  imageStudioNormalizedCenterLayoutSchema,
  imageStudioObjectDetectionUsedSchema,
} from '../image-studio-transform-contracts';
import { imageStudioWhitespaceMetricsSchema } from './whitespace';
import { imageStudioOperationLifecycleSchema } from './base';
import type {
  ImageStudioCenterObjectBounds,
  ImageStudioDetectionCandidateSummary,
} from '../image-studio-transform-contracts';

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

export type ImageStudioDetectionCandidate<TDetails> = {
  detectionUsed: Exclude<ImageStudioCenterDetectionModeSchema, 'auto'>;
  bounds: ImageStudioCenterObjectBounds;
  confidence: number;
  detectionDetails?: TDetails | null;
  details?: TDetails | null;
};

type ImageStudioCenterDetectionModeSchema = z.infer<typeof imageStudioCenterDetectionModeSchema>;

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
