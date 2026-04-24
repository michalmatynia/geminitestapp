import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const FORWARD_ONLY_ERROR =
  'AI Paths is forward-only. Node retry operations have been removed.';

export const retryPathRunNode = (
  _runId: string,
  _nodeId: string
): Promise<AiPathRunRecord> => {
  return Promise.reject(new Error(FORWARD_ONLY_ERROR));
};
