
import type {
  AiInsightRecord,
  AiInsightResponse,
  AiInsightsResponse,
} from '@/shared/contracts/ai-insights';
import type {
  ClearLogsResponseDto as ClearLogsResponse,
  ClearLogsTargetDto as ClearLogsTarget,
  MongoCollectionIndexStatusDto as MongoCollectionIndexStatus,
  MongoDiagnosticsResponseDto as MongoDiagnosticsResponse,
  MongoRebuildIndexesResponseDto as MongoRebuildIndexesResponse,
  SystemLogLevelDto as SystemLogLevel,
  SystemLogMetricsDto as SystemLogMetrics,
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts/observability';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { FilterField } from '@/shared/contracts/ui/ui/panels';
import type { Toast } from '@/shared/contracts/ui/ui/base';

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { ComponentType, Dispatch, SetStateAction } from 'react';

const levelOptions: Array<LabeledOptionDto<SystemLogLevel | 'all'>> = [
  { value: 'all', label: 'All levels' },
  { value: 'error', label: 'Errors' },
  { value: 'warn', label: 'Warnings' },
  { value: 'info', label: 'Info' },
];

export const systemLogFilterFields: FilterField[] = [
  { key: 'level', label: 'Level', type: 'select', options: levelOptions },
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
  mongoDiagnosticsQuery: UseQueryResult<MongoDiagnosticsResponse, Error>;
  insightsQuery: UseQueryResult<AiInsightsResponse, Error>;
  runInsightMutation: UseMutationResult<AiInsightResponse, Error, void>;
  interpretLogMutation: UseMutationResult<AiInsightResponse, Error, string>;
  clearLogsMutation: UseMutationResult<ClearLogsResponse, Error, ClearLogsTarget>;
  rebuildIndexesMutation: UseMutationResult<MongoRebuildIndexesResponse, Error, void>;
  confirmAction: (config: {
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    isDangerous?: boolean;
  }) => void;
  ConfirmationModal: ComponentType;
  handleClearLogs: (target: ClearLogsTarget) => Promise<void>;
  handleRebuildMongoIndexes: () => Promise<void>;
  handleRunInsight: () => Promise<void>;
  handleInterpretLog: (logId: string) => Promise<void>;
  isClearLogsConfirmOpen: boolean;
  setIsClearLogsConfirmOpen: Dispatch<SetStateAction<boolean>>;
  isRebuildIndexesConfirmOpen: boolean;
  setIsRebuildIndexesConfirmOpen: Dispatch<SetStateAction<boolean>>;
  toast: Toast;
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
