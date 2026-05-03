import { type NextRequest, NextResponse } from 'next/server';

import {
  playwrightActionRunStatusSchema,
  type PlaywrightActionRunListFilters,
} from '@/shared/contracts/playwright-action-runs';
import { listPlaywrightActionRuns } from '@/shared/lib/playwright/action-run-history-repository';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const readStringParam = (params: URLSearchParams, key: string): string | undefined => {
  const value = params.get(key)?.trim();
  return value ? value : undefined;
};

const readLimit = (params: URLSearchParams): number | undefined => {
  const value = params.get('limit');
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
};

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const params = req.nextUrl.searchParams;
  const rawStatus = readStringParam(params, 'status');
  const parsedStatus =
    rawStatus && rawStatus !== 'all' ? playwrightActionRunStatusSchema.safeParse(rawStatus) : null;

  const actionId = readStringParam(params, 'actionId');
  const runtimeKey = readStringParam(params, 'runtimeKey');
  const selectorProfile = readStringParam(params, 'selectorProfile');
  const instanceKind = readStringParam(params, 'instanceKind');
  const dateFrom = readStringParam(params, 'dateFrom');
  const dateTo = readStringParam(params, 'dateTo');
  const query = readStringParam(params, 'query');
  const limit = readLimit(params);
  const cursor = readStringParam(params, 'cursor');
  const status = rawStatus === 'all' ? 'all' : parsedStatus?.success ? parsedStatus.data : undefined;

  const filters: PlaywrightActionRunListFilters = {
    ...(actionId ? { actionId } : {}),
    ...(runtimeKey ? { runtimeKey } : {}),
    ...(status ? { status } : {}),
    ...(selectorProfile ? { selectorProfile } : {}),
    ...(instanceKind ? { instanceKind } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(query ? { query } : {}),
    ...(limit !== undefined ? { limit } : {}),
    ...(cursor ? { cursor } : {}),
  };

  const response = await listPlaywrightActionRuns(filters);
  return NextResponse.json(response);
}
