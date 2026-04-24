import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const FORWARD_ONLY_ERROR =
  'AI Paths is forward-only. Resume and replay operations have been removed.';

export const resumePathRun = (
  _runId: string,
  _mode: 'resume' | 'replay' = 'resume'
): Promise<AiPathRunRecord> => {
  return Promise.reject(new Error(FORWARD_ONLY_ERROR));
};
