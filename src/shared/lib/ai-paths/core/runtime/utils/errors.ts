/** Error name for AI job not found errors */
export const AI_JOB_NOT_FOUND_ERROR_NAME = 'AiJobNotFoundError';

/** Error name for AI job terminal errors (unrecoverable failures) */
export const AI_JOB_TERMINAL_ERROR_NAME = 'AiJobTerminalError';

/**
 * Creates an AbortError for cancelled operations.
 * Used when AI path execution is manually cancelled or times out.
 */
export const createAbortError = (): Error => {
  const error = new Error('Operation aborted.');
  (error as { name?: string }).name = 'AbortError';
  return error;
};

/**
 * Checks if error message indicates an AI job was not found.
 * Detects various "not found" message patterns from polling responses.
 */
export const isAiJobNotFoundErrorMessage = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes('job not found')) return true;
  if (normalized.includes('request failed with status 404')) return true;
  return normalized.includes('not found') && normalized.includes('job');
};

/**
 * Creates an error for when an AI job cannot be found during polling.
 * Indicates the job ID is invalid or the job was deleted.
 */
export const createAiJobNotFoundError = (jobId: string, message: string): Error => {
  const error = new Error(`AI job "${jobId}" not found while polling: ${message}`);
  (error as { name?: string }).name = AI_JOB_NOT_FOUND_ERROR_NAME;
  return error;
};

/**
 * Creates a terminal error for unrecoverable AI job failures.
 * Indicates the job failed permanently and should not be retried.
 */
export const createAiJobTerminalError = (message: string): Error => {
  const error = new Error(message);
  (error as { name?: string }).name = AI_JOB_TERMINAL_ERROR_NAME;
  return error;
};
