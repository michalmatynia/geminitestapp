export type KangurLessonTtsFailureStage =
  | 'openai_speech'
  | 'audio_buffer'
  | 'storage_upload'
  | 'unknown';

export class KangurLessonTtsGenerationError extends Error {
  readonly stage: KangurLessonTtsFailureStage;
  readonly cause: unknown;

  constructor(stage: KangurLessonTtsFailureStage, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = 'KangurLessonTtsGenerationError';
    this.stage = stage;
    this.cause = cause;
  }
}

export const getKangurLessonTtsFailureStage = (error: unknown): KangurLessonTtsFailureStage =>
  error instanceof KangurLessonTtsGenerationError ? error.stage : 'unknown';

export const getRootCauseError = (error: unknown): unknown =>
  error instanceof KangurLessonTtsGenerationError ? error.cause : error;

export const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : typeof error === 'string' ? 'Error' : 'UnknownError';

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const getErrorStatus = (error: unknown): number | null => {
  const rootCause = getRootCauseError(error);
  if (!rootCause || typeof rootCause !== 'object' || !('status' in rootCause)) {
    return null;
  }

  const value = (rootCause as { status: unknown }).status;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

export const getErrorCode = (error: unknown): string | null => {
  const rootCause = getRootCauseError(error);
  if (!rootCause || typeof rootCause !== 'object' || !('code' in rootCause)) {
    return null;
  }

  const value = (rootCause as { code: unknown }).code;
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};
