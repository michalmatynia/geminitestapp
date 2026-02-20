export * from '@/shared/contracts/image-studio';

import type {
  ImageStudioAnalysisErrorCode as ImageStudioAnalysisErrorCodeDto,
  ImageStudioAnalysisModeDto,
  ImageStudioAnalysisRequestDto,
} from '@/shared/contracts/image-studio';

export type ImageStudioAnalysisMode = ImageStudioAnalysisModeDto;
export type ImageStudioAnalysisRequest = ImageStudioAnalysisRequestDto;
export type ImageStudioAnalysisErrorCode = ImageStudioAnalysisErrorCodeDto;
