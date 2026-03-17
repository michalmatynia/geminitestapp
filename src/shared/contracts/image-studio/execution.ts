import {
  type ImageStudioCenterMode,
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterDetectionMode,
} from '../image-studio-transform-contracts';
import { type ImageFileRecord } from '../files';

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
