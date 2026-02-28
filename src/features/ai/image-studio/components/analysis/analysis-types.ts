import type {
  ImageStudioAnalysisSummary,
  ImageStudioAnalysisResponse,
  ImageStudioAnalysisMode,
} from '../../contracts/analysis';
import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterShadowPolicy,
} from '../../contracts/center';

export type AnalysisStatus = 'idle' | 'resolving' | 'processing';
export type AnalysisMode = ImageStudioAnalysisMode;
export type ShadowPolicy = ImageStudioCenterShadowPolicy;
export type DetectionMode = ImageStudioCenterDetectionMode;
export type AnalysisResult = ImageStudioAnalysisSummary &
  Pick<ImageStudioAnalysisResponse, 'effectiveMode' | 'authoritativeSource'>;

export const PADDING_DEFAULT = 8;
export const PADDING_MIN = 0;
export const PADDING_MAX = 40;
export const WHITE_THRESHOLD_DEFAULT = 16;
export const WHITE_THRESHOLD_MIN = 1;
export const WHITE_THRESHOLD_MAX = 80;
export const CHROMA_THRESHOLD_DEFAULT = 10;
export const CHROMA_THRESHOLD_MIN = 0;
export const CHROMA_THRESHOLD_MAX = 80;
export const ANALYSIS_REQUEST_TIMEOUT_MS = 60_000;
