import type { AiPathRunStatus } from '@/shared/contracts/ai-paths';

export const TERMINAL_AI_PATH_RUN_STATUSES = [
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
] as const satisfies readonly AiPathRunStatus[];

export type TerminalAiPathRunStatus = (typeof TERMINAL_AI_PATH_RUN_STATUSES)[number];

const TERMINAL_AI_PATH_RUN_STATUS_SET = new Set<TerminalAiPathRunStatus>(
  TERMINAL_AI_PATH_RUN_STATUSES
);

export const isTerminalAiPathRunStatus = (value: unknown): value is TerminalAiPathRunStatus =>
  typeof value === 'string' &&
  TERMINAL_AI_PATH_RUN_STATUS_SET.has(value as TerminalAiPathRunStatus);
