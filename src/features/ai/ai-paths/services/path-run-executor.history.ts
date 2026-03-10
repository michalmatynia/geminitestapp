import { type RuntimeHistoryEntry } from '@/shared/contracts/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
} from '@/shared/lib/ai-paths';

export const resolveHistoryRetention = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return AI_PATHS_HISTORY_RETENTION_DEFAULT;
  }
  return Math.max(
    AI_PATHS_HISTORY_RETENTION_MIN,
    Math.min(AI_PATHS_HISTORY_RETENTION_MAX, Math.floor(value))
  );
};

export const pruneRuntimeHistory = (
  history: RuntimeHistoryEntry[],
  retention: number
): RuntimeHistoryEntry[] => {
  if (history.length <= retention) return history;
  return history.slice(-retention);
};
