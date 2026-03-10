import { NextRequest, NextResponse } from 'next/server';

import { listBaseImportRuns } from '@/features/integrations/services/imports/base-import-run-repository';
import { startBaseImportRunResponse } from '@/features/integrations/services/imports/base-import-run-starter';
import type {
  BaseImportRunsListQuery,
  BaseImportRunsResponse,
  BaseImportRunStartPayload,
  BaseImportStartResponse,
} from '@/shared/contracts/integrations';
import {
  baseImportRunsListQuerySchema,
  baseImportRunStartPayloadSchema,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export const startRunSchema = baseImportRunStartPayloadSchema;
export const listRunsQuerySchema = baseImportRunsListQuerySchema;

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = (ctx.query ?? {}) as BaseImportRunsListQuery;
  const runs = await listBaseImportRuns(query.limit ?? 25);
  const response: BaseImportRunsResponse = { runs };
  return NextResponse.json(
    response,
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const rawConnectionId =
    typeof (ctx.body as Record<string, unknown> | undefined)?.['connectionId'] === 'string'
      ? String((ctx.body as Record<string, unknown>)['connectionId']).trim()
      : '';
  if (!rawConnectionId) {
    throw badRequestError('Base.com connection is required.');
  }

  const data = ctx.body as BaseImportRunStartPayload;
  const response: BaseImportStartResponse = await startBaseImportRunResponse({
    connectionId: rawConnectionId,
    inventoryId: data.inventoryId,
    catalogId: data.catalogId,
    imageMode: data.imageMode,
    uniqueOnly: data.uniqueOnly,
    allowDuplicateSku: data.allowDuplicateSku,
    ...(data.templateId ? { templateId: data.templateId } : {}),
    ...(typeof data.limit === 'number' ? { limit: data.limit } : {}),
    ...(Array.isArray(data.selectedIds) ? { selectedIds: data.selectedIds } : {}),
    ...(typeof data.dryRun === 'boolean' ? { dryRun: data.dryRun } : {}),
    ...(data.mode ? { mode: data.mode } : {}),
    ...(data.requestId ? { requestId: data.requestId } : {}),
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
