export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getBaseImportRunDetailOrThrow } from '@/features/integrations/services/imports/base-import-service';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const querySchema = z.object({
  format: z.enum(['json', 'csv']).optional(),
});

const escapeCsv = (value: unknown): string => {
  const raw =
    value === null || value === undefined
      ? ''
      : typeof value === 'string'
        ? value
        : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

const buildCsv = (
  detail: Awaited<ReturnType<typeof getBaseImportRunDetailOrThrow>>
): string => {
  const header = [
    'itemId',
    'status',
    'action',
    'baseProductId',
    'sku',
    'importedProductId',
    'errorCode',
    'errorMessage',
    'attempt',
    'startedAt',
    'finishedAt',
  ];

  const rows = detail.items.map((item) =>
    [
      item.itemId,
      item.status,
      item.action,
      item.baseProductId ?? '',
      item.sku ?? '',
      item.importedProductId ?? '',
      item.errorCode ?? '',
      item.errorMessage ?? '',
      item.attempt,
      item.startedAt ?? '',
      item.finishedAt ?? '',
    ]
      .map((cell) => escapeCsv(cell))
      .join(',')
  );

  return `${header.join(',')}\n${rows.join('\n')}`;
};

async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const parsed = querySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams.entries())
  );
  const format = parsed.success ? parsed.data.format ?? 'json' : 'json';

  const detail = await getBaseImportRunDetailOrThrow(params.runId);

  if (format === 'csv') {
    const filename = `base-import-${detail.run.id}.csv`;
    return new NextResponse(buildCsv(detail), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      ...detail,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, {
  source: 'integrations.imports.base.runs.[runId].report.GET',
  requireCsrf: false,
});
