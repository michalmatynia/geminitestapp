import {
  AI_PATH_RUN_TERMINAL_STATUSES,
  aiPathRunsDeleteQuerySchema,
  aiPathRunsListQuerySchema,
  type AiPathRunStatus,
} from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
export const TERMINAL_STATUSES: AiPathRunStatus[] = [...AI_PATH_RUN_TERMINAL_STATUSES];
export const listQuerySchema = aiPathRunsListQuerySchema;
export const deleteQuerySchema = aiPathRunsDeleteQuerySchema;

export const resolveAiPathRunsQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});
