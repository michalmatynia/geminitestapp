export const AI_JOB_NOT_FOUND_ERROR_NAME = 'AiJobNotFoundError';
export const AI_JOB_TERMINAL_ERROR_NAME = 'AiJobTerminalError';

export const createAbortError = (): Error => {
  const error = new Error('Operation aborted.');
  (error as { name?: string }).name = 'AbortError';
  return error;
};

export const isAiJobNotFoundErrorMessage = (message: string): boolean => {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.includes('job not found')) return true;
  if (normalized.includes('request failed with status 404')) return true;
  return normalized.includes('not found') && normalized.includes('job');
};

export const createAiJobNotFoundError = (jobId: string, message: string): Error => {
  const error = new Error(`AI job "${jobId}" not found while polling: ${message}`);
  (error as { name?: string }).name = AI_JOB_NOT_FOUND_ERROR_NAME;
  return error;
};

export const createAiJobTerminalError = (message: string): Error => {
  const error = new Error(message);
  (error as { name?: string }).name = AI_JOB_TERMINAL_ERROR_NAME;
  return error;
};
