export * from './image-studio/base';
export * from './image-studio/project';
export * from './image-studio/slot';
export * from './image-studio/analysis';
export * from './image-studio/autoscaler';
export * from './image-studio/run';
export * from './image-studio/sequence';
export * from './image-studio/execution';
export * from './image-studio/misc';

// Forward common re-exports for convenience
export * from './image-studio-transform-contracts';

// Explicit re-exports to help static export analysis in bundlers.
export {
  imageStudioAutoScalerModeSchema,
  imageStudioAutoScalerRequestSchema,
  imageStudioAutoScalerResponseSchema,
  normalizeImageStudioAutoScalerMode,
} from './image-studio/autoscaler';
export type {
  ImageStudioAutoScalerMode,
  ImageStudioAutoScalerRequest,
  ImageStudioAutoScalerResponse,
  ImageStudioAutoScaleMetadata,
} from './image-studio/autoscaler';
export { imageStudioCenterResponseSchema } from './image-studio/slot';
export type { ImageStudioCenterResponse } from './image-studio/slot';
export { imageStudioWhitespaceMetricsSchema } from './image-studio/whitespace';
export type { ImageStudioWhitespaceMetrics } from './image-studio/whitespace';

// Explicitly resolve ambiguities if needed (though * should be fine if we manage them well)
// But typecheck said: Module './image-studio/analysis' has already exported a member named 'ImageStudioDetectionCandidateSummary'
// This happens because both analysis.ts and transform-contracts.ts might be exporting it now.
// Let's ensure only one does, or we explicitly pick one.
