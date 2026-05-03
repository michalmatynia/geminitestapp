import { isObjectRecord } from '@/shared/utils/object-utils';

export type WriteStatus = 'created' | 'dry_run' | 'failed' | 'no_write' | 'unknown';
export type WriteStatusFilter = 'all' | WriteStatus;
export type WriteStatusSortMode = 'input_order' | 'failures_first';

export type ParsedWriteOutcomeRow = {
  createdRecord: unknown | null;
  errorMessage: string | null;
  index: number;
  payloadRecord: unknown;
  status: WriteStatus;
};

const getStringValue = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

export const inferWriteStatus = ({
  executionMode,
  hasCreatedRecord,
  hasPayloadRecord,
}: {
  executionMode: string | null;
  hasCreatedRecord: boolean;
  hasPayloadRecord: boolean;
}): WriteStatus => {
  if (executionMode === 'dry_run') {
    return 'dry_run';
  }

  if (hasCreatedRecord) {
    return 'created';
  }

  if (hasPayloadRecord) {
    return 'no_write';
  }

  return 'unknown';
};

export const getWriteStatusPresentation = (
  status: WriteStatus
): { label: string; className: string } => {
  switch (status) {
    case 'created':
      return {
        label: 'created',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
      };
    case 'dry_run':
      return {
        label: 'dry-run',
        className: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
      };
    case 'failed':
      return {
        label: 'failed',
        className: 'border-red-500/30 bg-red-500/10 text-red-200',
      };
    case 'no_write':
      return {
        label: 'no-write',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      };
    case 'unknown':
    default:
      return {
        label: 'unknown',
        className: 'border-border/40 bg-background/40 text-gray-300',
      };
  }
};

export const WRITE_STATUS_FILTER_ORDER: WriteStatus[] = [
  'created',
  'dry_run',
  'failed',
  'no_write',
  'unknown',
];

export const getWriteStatusFilterLabel = (status: WriteStatusFilter): string =>
  status === 'all' ? 'all' : getWriteStatusPresentation(status).label;

export const isFailedWriteStatusRow = (row: ParsedWriteOutcomeRow): boolean =>
  row.status === 'failed' || row.errorMessage !== null;

export const hasWriteStatusFailures = (rows: ParsedWriteOutcomeRow[]): boolean =>
  rows.some((row) => isFailedWriteStatusRow(row));

export const getDefaultWriteStatusSortMode = (
  rows: ParsedWriteOutcomeRow[]
): WriteStatusSortMode => (hasWriteStatusFailures(rows) ? 'failures_first' : 'input_order');

export const countWriteStatusRows = (
  rows: ParsedWriteOutcomeRow[],
  status: WriteStatus
): number => rows.filter((row) => row.status === status).length;

export const sortWriteRows = (
  rows: ParsedWriteOutcomeRow[],
  mode: WriteStatusSortMode
): ParsedWriteOutcomeRow[] => {
  if (mode === 'input_order') {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const leftPriority = isFailedWriteStatusRow(left) ? 0 : 1;
    const rightPriority = isFailedWriteStatusRow(right) ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.index - right.index;
  });
};

export const parseWriteOutcomeRows = ({
  kind,
  value,
}: {
  kind: 'draft' | 'product';
  value: unknown;
}): ParsedWriteOutcomeRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, fallbackIndex) => {
    if (!isObjectRecord(item) || item['kind'] !== kind) {
      return [];
    }

    const rawStatus = item['status'];
    const rawIndex = item['index'];
    const status: WriteStatus =
      rawStatus === 'created' || rawStatus === 'dry_run' || rawStatus === 'failed'
        ? rawStatus
        : 'unknown';

    return [
      {
        createdRecord: item['record'] ?? null,
        errorMessage: getStringValue(item['errorMessage']),
        index: typeof rawIndex === 'number' && Number.isFinite(rawIndex) ? rawIndex : fallbackIndex,
        payloadRecord: item['payload'],
        status,
      },
    ];
  });
};

export const parseFlowResultWriteRows = ({
  executionMode,
  value,
}: {
  executionMode: string | null;
  value: unknown;
}): ParsedWriteOutcomeRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    if (isObjectRecord(item) && item['kind'] === 'write_error') {
      return {
        createdRecord: null,
        errorMessage: getStringValue(item['errorMessage']),
        index,
        payloadRecord: item['payload'],
        status: 'failed' as const,
      };
    }

    if (executionMode === 'dry_run') {
      return {
        createdRecord: null,
        errorMessage: null,
        index,
        payloadRecord: item,
        status: 'dry_run' as const,
      };
    }

    return {
      createdRecord: item,
      errorMessage: null,
      index,
      payloadRecord: null,
      status: 'created' as const,
    };
  });
};
