import { z } from 'zod';

import type { AiPathRunStatus } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const RUN_STATUS_VALUES = [
  'queued',
  'running',
  'blocked_on_lease',
  'handoff_ready',
  'paused',
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
 ] as const;

const RUN_STATUSES: AiPathRunStatus[] = [...RUN_STATUS_VALUES];

export const TERMINAL_STATUSES: AiPathRunStatus[] = [
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
];

const listStatusSchema = z.preprocess((value) => {
  const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
  return normalized && RUN_STATUSES.includes(normalized as AiPathRunStatus) ? normalized : undefined;
}, z.enum(RUN_STATUS_VALUES).optional());

export const listQuerySchema = z.object({
  visibility: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'global' ? 'global' : 'scoped';
  }, z.enum(['scoped', 'global'])).default('scoped'),
  pathId: optionalTrimmedQueryString(),
  nodeId: optionalTrimmedQueryString(),
  requestId: optionalTrimmedQueryString(),
  query: optionalTrimmedQueryString(),
  source: optionalTrimmedQueryString(),
  sourceMode: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'exclude' ? 'exclude' : 'include';
  }, z.enum(['include', 'exclude'])).default('include'),
  status: listStatusSchema,
  limit: optionalIntegerQuerySchema(z.number().int().min(1).max(500)),
  offset: optionalIntegerQuerySchema(z.number().int().min(0)),
  includeTotal: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return !(normalized === '0' || normalized === 'false' || normalized === 'no');
  }, z.boolean()).default(true),
  fresh: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
  }, z.boolean()).default(false),
});

export const deleteQuerySchema = z.object({
  scope: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'all' ? 'all' : 'terminal';
  }, z.enum(['terminal', 'all'])).default('terminal'),
  pathId: optionalTrimmedQueryString(),
  source: optionalTrimmedQueryString(),
  sourceMode: z.preprocess((value) => {
    const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
    return normalized === 'exclude' ? 'exclude' : 'include';
  }, z.enum(['include', 'exclude'])).default('include'),
});

export const resolveAiPathRunsQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});
