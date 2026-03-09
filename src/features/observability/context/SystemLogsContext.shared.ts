import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { ComponentType, Dispatch, SetStateAction } from 'react';

import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import type {
  MongoCollectionIndexStatusDto as MongoCollectionIndexStatus,
  SystemLogLevelDto as SystemLogLevel,
  SystemLogMetricsDto as SystemLogMetrics,
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts/observability';
import type { Toast as ToastFn } from '@/shared/contracts/ui';
import type { FilterField } from '@/shared/ui';

const levelOptions: Array<{ value: SystemLogLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All levels' },
  { value: 'error', label: 'Errors' },
  { value: 'warn', label: 'Warnings' },
  { value: 'info', label: 'Info' },
];

export const systemLogFilterFields: FilterField[] = [
  { key: 'level', label: 'Level', type: 'select', options: [...levelOptions] },
  { key: 'query', label: 'Search', type: 'text', placeholder: 'Message or source' },
  { key: 'source', label: 'Source', type: 'text', placeholder: 'api/products, auth, etc.' },
  { key: 'service', label: 'Service', type: 'text', placeholder: 'domain.feature' },
  { key: 'method', label: 'Method', type: 'text', placeholder: 'GET, POST, PATCH...' },
  { key: 'statusCode', label: 'Status', type: 'number', placeholder: '500' },
  { key: 'minDurationMs', label: 'Min Duration', type: 'number', placeholder: '750' },
  { key: 'requestId', label: 'Request ID', type: 'text', placeholder: 'x-request-id' },
  { key: 'traceId', label: 'Trace ID', type: 'text', placeholder: 'x-trace-id' },
  { key: 'correlationId', label: 'Correlation ID', type: 'text', placeholder: 'request scope id' },
  { key: 'userId', label: 'User ID', type: 'text', placeholder: 'auth user id' },
  { key: 'fingerprint', label: 'Fingerprint', type: 'text', placeholder: 'error fingerprint' },
  { key: 'category', label: 'Category', type: 'text', placeholder: 'validation, db, network...' },
  { key: 'fromDate', label: 'From', type: 'date' },
  { key: 'toDate', label: 'To', type: 'date' },
];

export interface MongoDiagnosticsData {
  collections?: MongoCollectionIndexStatus[];
  generatedAt?: string;
}

export const formatDateParam = (value: string, endOfDay: boolean = false): string | null => {
  if (!value) return null;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

export const parseStatusCodeInput = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

export const parseMinDurationInput = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

export type SystemLogsContextValue = {
  level: SystemLogLevel | 'all';
  query: string;
  source: string;
  service: string;
  method: string;
  statusCode: string;
  minDurationMs: string;
  requestId: string;
  traceId: string;
  correlationId: string;
  userId: string;
  fingerprint: string;
  category: string;
  fromDate: string;
  toDate: string;
  page: number;
  pageSize: number;
  filterFields: FilterField[];
  setPage: Dispatch<SetStateAction<number>>;
  handleFilterChange: (key: string, value: string) => void;
  handleResetFilters: () => void;
  logs: SystemLogRecord[];
  logsJson: string;
  total: number;
  totalPages: number;
  metrics: SystemLogMetrics | null;
  levels: { error: number; warn: number; info: number };
  diagnostics: MongoCollectionIndexStatus[];
  diagnosticsUpdatedAt: string | null;
  logInterpretations: Record<string, AiInsightRecord>;
  logsQuery: UseQueryResult<
    {
      logs?: SystemLogRecord[] | undefined;
      total?: number | undefined;
      page?: number | undefined;
      pageSize?: number | undefined;
    },
    Error
  >;
  metricsQuery: UseQueryResult<{ metrics?: SystemLogMetrics | undefined }, Error>;
  mongoDiagnosticsQuery: UseQueryResult<unknown, Error>;
  insightsQuery: UseQueryResult<{ insights: AiInsightRecord[] }, Error>;
  runInsightMutation: UseMutationResult<{ insight: AiInsightRecord }, Error, void>;
  interpretLogMutation: UseMutationResult<{ insight: AiInsightRecord }, Error, string>;
  clearLogsMutation: UseMutationResult<{ deleted: number }, Error, void>;
  rebuildIndexesMutation: UseMutationResult<unknown, Error, void>;
  confirmAction: (config: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  }) => void;
  ConfirmationModal: ComponentType;
  handleClearLogs: () => Promise<void>;
  handleRebuildMongoIndexes: () => Promise<void>;
  handleRunInsight: () => Promise<void>;
  handleInterpretLog: (logId: string) => Promise<void>;
  isClearLogsConfirmOpen: boolean;
  setIsClearLogsConfirmOpen: Dispatch<SetStateAction<boolean>>;
  isRebuildIndexesConfirmOpen: boolean;
  setIsRebuildIndexesConfirmOpen: Dispatch<SetStateAction<boolean>>;
  toast: ToastFn;
};

export type SystemLogsStateContextValue = Omit<
  SystemLogsContextValue,
  | 'setPage'
  | 'handleFilterChange'
  | 'handleResetFilters'
  | 'confirmAction'
  | 'handleClearLogs'
  | 'handleRebuildMongoIndexes'
  | 'handleRunInsight'
  | 'handleInterpretLog'
  | 'setIsClearLogsConfirmOpen'
  | 'setIsRebuildIndexesConfirmOpen'
  | 'toast'
>;

export type SystemLogsActionsContextValue = Pick<
  SystemLogsContextValue,
  | 'setPage'
  | 'handleFilterChange'
  | 'handleResetFilters'
  | 'confirmAction'
  | 'handleClearLogs'
  | 'handleRebuildMongoIndexes'
  | 'handleRunInsight'
  | 'handleInterpretLog'
  | 'setIsClearLogsConfirmOpen'
  | 'setIsRebuildIndexesConfirmOpen'
  | 'toast'
>;
