import { type NextRequest, NextResponse } from 'next/server';

import { getBaseImportRunDetailOrThrow } from '@/features/integrations/server';
import type { BaseImportItemStatus, BaseImportRunDetailResponse, BaseImportRunReportResponse } from '@/shared/contracts/integrations/base-com';
import { baseImportRunReportQuerySchema } from '@/shared/contracts/integrations/base-com';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const querySchema = baseImportRunReportQuerySchema;
const REPORT_PAGE_SIZE = 1000;

const escapeCsv = (value: unknown): string => {
  const raw =
    value === null || value === undefined ? '' : typeof value === 'string' ? value : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

type CustomFieldImportMetadata = {
  seededFieldNames?: string[];
  autoMatchedFieldNames?: string[];
  explicitMappedFieldNames?: string[];
  skippedFieldNames?: string[];
  overriddenFieldNames?: string[];
};

const readStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry: unknown): entry is string => typeof entry === 'string')
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0);
};

const readCustomFieldImportMetadata = (value: unknown): CustomFieldImportMetadata => {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const record = value as Record<string, unknown>;
  return {
    seededFieldNames: readStringList(record['seededFieldNames']),
    autoMatchedFieldNames: readStringList(record['autoMatchedFieldNames']),
    explicitMappedFieldNames: readStringList(record['explicitMappedFieldNames']),
    skippedFieldNames: readStringList(record['skippedFieldNames']),
    overriddenFieldNames: readStringList(record['overriddenFieldNames']),
  };
};

const stringifyStringList = (value: string[] | undefined): string => (value ?? []).join('; ');

const buildCsv = (detail: BaseImportRunDetailResponse): string => {
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
    'parameterExtracted',
    'parameterResolved',
    'parameterCreated',
    'parameterWritten',
    'customFieldSeeded',
    'customFieldAutoMatched',
    'customFieldExplicitMapped',
    'customFieldSkipped',
    'customFieldOverridden',
    'startedAt',
    'finishedAt',
  ];

  const rows = detail.items.map((item) => {
    const customFieldImport = readCustomFieldImportMetadata(
      item.metadata && typeof item.metadata === 'object'
        ? item.metadata['customFieldImport']
        : null
    );
    return [
      item.itemId,
      item.status,
      item.action,
      item.baseProductId ?? '',
      item.sku ?? '',
      item.importedProductId ?? '',
      item.errorCode ?? '',
      item.errorMessage ?? '',
      item.attempt,
      item.parameterImportSummary?.extracted ?? '',
      item.parameterImportSummary?.resolved ?? '',
      item.parameterImportSummary?.created ?? '',
      item.parameterImportSummary?.written ?? '',
      stringifyStringList(customFieldImport.seededFieldNames),
      stringifyStringList(customFieldImport.autoMatchedFieldNames),
      stringifyStringList(customFieldImport.explicitMappedFieldNames),
      stringifyStringList(customFieldImport.skippedFieldNames),
      stringifyStringList(customFieldImport.overriddenFieldNames),
      item.startedAt ?? '',
      item.finishedAt ?? '',
    ]
      .map((cell) => escapeCsv(cell))
      .join(',');
  });

  return `${header.join(',')}\n${rows.join('\n')}`;
};

const loadReportDetail = async (input: {
  runId: string;
  statuses: BaseImportItemStatus[];
}): Promise<BaseImportRunDetailResponse> => {
  const first: BaseImportRunDetailResponse = await getBaseImportRunDetailOrThrow(input.runId, {
    ...(input.statuses.length > 0 ? { statuses: input.statuses } : {}),
    page: 1,
    pageSize: REPORT_PAGE_SIZE,
  });
  const totalPages = first.pagination?.totalPages ?? 1;
  if (totalPages <= 1) {
    return first;
  }

  const allItems = [...first.items];
  for (let page = 2; page <= totalPages; page += 1) {
    const detail = await getBaseImportRunDetailOrThrow(input.runId, {
      ...(input.statuses.length > 0 ? { statuses: input.statuses } : {}),
      page,
      pageSize: REPORT_PAGE_SIZE,
    });
    allItems.push(...detail.items);
  }

  return {
    ...first,
    items: allItems,
    pagination: {
      page: 1,
      pageSize: allItems.length,
      totalItems: allItems.length,
      totalPages: 1,
    },
  };
};

export async function getHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const parsed = querySchema.safeParse({
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  });
  const format = parsed.success ? (parsed.data.format ?? 'json') : 'json';
  const statusesRaw = parsed.success ? (parsed.data.statuses ?? '') : '';
  const statuses = statusesRaw
    .split(',')
    .map((value: string): string => value.trim())
    .filter((value: string): boolean => value.length > 0)
    .filter(
      (value: string): boolean =>
        value === 'pending' ||
        value === 'processing' ||
        value === 'imported' ||
        value === 'updated' ||
        value === 'skipped' ||
        value === 'failed'
    ) as BaseImportItemStatus[];

  const detail = await loadReportDetail({
    runId: params.runId,
    statuses,
  });

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

  const response: BaseImportRunReportResponse = {
    generatedAt: new Date().toISOString(),
    ...detail,
  };
  return NextResponse.json(
    response,
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
