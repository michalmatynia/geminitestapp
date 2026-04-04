import {
  IMAGE_STUDIO_ANALYSIS_ERROR_CODES,
  type ImageStudioAnalysisErrorCode,
} from '@/features/ai/image-studio/contracts/analysis';
import { badRequestError, isAppError } from '@/shared/errors/app-error';

type AnalysisFailureRule = {
  pattern: RegExp;
  code: ImageStudioAnalysisErrorCode;
  message: string;
};

const ANALYSIS_FAILURE_RULES: readonly AnalysisFailureRule[] = [
  {
    pattern: /No visible object pixels were detected/i,
    code: IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_OBJECT_NOT_FOUND,
    message: 'No visible object pixels were detected to analyze.',
  },
  {
    pattern: /dimensions are invalid/i,
    code: IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
    message: 'Source image dimensions are invalid.',
  },
] as const;

export const analysisBadRequest = (
  analysisErrorCode: ImageStudioAnalysisErrorCode,
  message: string,
  meta?: Record<string, unknown>
) => badRequestError(message, { analysisErrorCode, ...(meta ?? {}) });

export const normalizeAnalysisRequestBody = (body: unknown): Record<string, unknown> => {
  const normalizedBody =
    body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>) }
      : {};

  const normalizedMode =
    typeof normalizedBody['mode'] === 'string' ? normalizedBody['mode'].trim() : '';
  if (!normalizedMode) {
    normalizedBody['mode'] = 'server_analysis';
  }

  return normalizedBody;
};

export const mapAnalysisFailureToError = (error: unknown): Error => {
  if (isAppError(error)) return error;

  if (error instanceof Error) {
    const matchedRule = ANALYSIS_FAILURE_RULES.find((rule) => rule.pattern.test(error.message));
    if (matchedRule) {
      return analysisBadRequest(matchedRule.code, matchedRule.message);
    }
  }

  return analysisBadRequest(
    IMAGE_STUDIO_ANALYSIS_ERROR_CODES.OUTPUT_INVALID,
    error instanceof Error ? error.message : 'Failed to analyze source image.'
  );
};
