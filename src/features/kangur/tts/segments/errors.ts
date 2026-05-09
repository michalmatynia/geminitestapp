/* eslint-disable no-nested-ternary, @typescript-eslint/strict-boolean-expressions -- TTS error classification accepts unknown provider error shapes. */
/**
 * TTS generation failure stages for Kangur lessons.
 * Tracks where in the TTS pipeline the error occurred.
 */
export type KangurLessonTtsFailureStage =
  | 'openai_speech'   // OpenAI TTS API call failed
  | 'audio_buffer'    // Audio buffer processing failed
  | 'storage_upload'  // File upload to storage failed
  | 'unknown';        // Unknown or unclassified error

/**
 * Custom error for Kangur lesson TTS generation failures.
 * Captures the failure stage and root cause for debugging.
 */
export class KangurLessonTtsGenerationError extends Error {
  readonly stage: KangurLessonTtsFailureStage;
  override readonly cause: unknown;

  constructor(stage: KangurLessonTtsFailureStage, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'KangurLessonTtsGenerationError';
    this.stage = stage;
    this.cause = cause;
  }
}

/** Extract the TTS failure stage from an error */
export const getKangurLessonTtsFailureStage = (error: unknown): KangurLessonTtsFailureStage =>
  error instanceof KangurLessonTtsGenerationError ? error.stage : 'unknown';

/** Extract the root cause error from a wrapped TTS error */
export const getRootCauseError = (error: unknown): unknown =>
  error instanceof KangurLessonTtsGenerationError ? error.cause : error;

/** Extract error name for logging and debugging */
export const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : typeof error === 'string' ? 'Error' : 'UnknownError';

/** Extract error message for display */
export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Extract HTTP status code from error if available */
export const getErrorStatus = (error: unknown): number | null => {
  const rootCause = getRootCauseError(error);
  if (!rootCause || typeof rootCause !== 'object' || !('status' in rootCause)) {
    return null;
  }

  const value = (rootCause as { status: unknown }).status;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

/** Extract error code from error if available */
export const getErrorCode = (error: unknown): string | null => {
  const rootCause = getRootCauseError(error);
  if (!rootCause || typeof rootCause !== 'object' || !('code' in rootCause)) {
    return null;
  }

  const value = (rootCause as { code: unknown }).code;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};
