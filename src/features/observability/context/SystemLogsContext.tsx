'use client';

import { type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import {
  useClearLogsMutation,
  useRebuildIndexesMutation,
  useRunLogInsight,
  useInterpretLog,
} from '@/features/observability/hooks/useLogMutations';
import {
  useSystemLogs,
  useSystemLogMetrics,
  useMongoDiagnostics,
  useLogInsights,
} from '@/features/observability/hooks/useLogQueries';
import { readSystemLogUrlState, writeSystemLogUrlState } from '../lib/system-log-filter-url-state';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import type {
  MongoCollectionIndexStatusDto as MongoCollectionIndexStatus,
  SystemLogLevelDto as SystemLogLevel,
} from '@/shared/contracts/observability';
import type {
  SystemLogRecordDto as SystemLogRecord,
  SystemLogMetricsDto as SystemLogMetrics,
} from '@/shared/contracts/observability';
import { internalError } from '@/shared/errors/app-error';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast, type FilterField } from '@/shared/ui';

const levelOptions: Array<{ value: SystemLogLevel | 'all'; label: string }> = [
  { value: 'all', label: 'All levels' },
  { value: 'error', label: 'Errors' },
  { value: 'warn', label: 'Warnings' },
  { value: 'info', label: 'Info' },
];

const filterFields: FilterField[] = [
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

interface MongoDiagnosticsData {
  collections?: MongoCollectionIndexStatus[];
  generatedAt?: string;
}

const formatDateParam = (value: string, endOfDay: boolean = false): string | null => {
  if (!value) return null;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parseStatusCodeInput = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const parseMinDurationInput = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
};

type ToastFn = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
) => void;

type SystemLogsContextValue = {
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
  setPage: React.Dispatch<React.SetStateAction<number>>;
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
  ConfirmationModal: React.ComponentType;
  handleClearLogs: () => Promise<void>;
  handleRebuildMongoIndexes: () => Promise<void>;
  handleRunInsight: () => Promise<void>;
  handleInterpretLog: (logId: string) => Promise<void>;
  isClearLogsConfirmOpen: boolean;
  setIsClearLogsConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRebuildIndexesConfirmOpen: boolean;
  setIsRebuildIndexesConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toast: ToastFn;
};

type SystemLogsStateContextValue = Omit<
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

type SystemLogsActionsContextValue = Pick<
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

const SystemLogsStateContext = createContext<SystemLogsStateContextValue | null>(null);
const SystemLogsActionsContext = createContext<SystemLogsActionsContextValue | null>(null);

export const useSystemLogsState = (): SystemLogsStateContextValue => {
  const context = useContext(SystemLogsStateContext);
  if (!context) {
    throw internalError('useSystemLogsState must be used within SystemLogsProvider');
  }
  return context;
};

export const useSystemLogsActions = (): SystemLogsActionsContextValue => {
  const context = useContext(SystemLogsActionsContext);
  if (!context) {
    throw internalError('useSystemLogsActions must be used within SystemLogsProvider');
  }
  return context;
};

export function SystemLogsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrlState = readSystemLogUrlState(searchParams?.toString() ?? '');

  const [level, setLevel] = useState<SystemLogLevel | 'all'>(() => initialUrlState.level);
  const [query, setQuery] = useState(() => initialUrlState.query);
  const [source, setSource] = useState(() => initialUrlState.source);
  const [service, setService] = useState(() => initialUrlState.service);
  const [method, setMethod] = useState(() => initialUrlState.method);
  const [statusCode, setStatusCode] = useState(() => initialUrlState.statusCode);
  const [minDurationMs, setMinDurationMs] = useState(() => initialUrlState.minDurationMs);
  const [requestId, setRequestId] = useState(() => initialUrlState.requestId);
  const [traceId, setTraceId] = useState(() => initialUrlState.traceId);
  const [correlationId, setCorrelationId] = useState(() => initialUrlState.correlationId);
  const [userId, setUserId] = useState(() => initialUrlState.userId);
  const [fingerprint, setFingerprint] = useState(() => initialUrlState.fingerprint);
  const [category, setCategory] = useState(() => initialUrlState.category);
  const [fromDate, setFromDate] = useState(() => initialUrlState.fromDate);
  const [toDate, setToDate] = useState(() => initialUrlState.toDate);

  const [isClearLogsConfirmOpen, setIsClearLogsConfirmOpen] = useState(false);
  const [isRebuildIndexesConfirmOpen, setIsRebuildIndexesConfirmOpen] = useState(false);

  const { confirm: confirmAction, ConfirmationModal } = useConfirm();
  const [logInterpretations, setLogInterpretations] = useState<Record<string, AiInsightRecord>>({});

  const [page, setPage] = useState(() => initialUrlState.page);
  const pageSize = 50;

  useEffect(() => {
    const nextSearch = writeSystemLogUrlState(searchParams?.toString() ?? '', {
      level,
      query,
      source,
      service,
      method,
      statusCode,
      minDurationMs,
      requestId,
      traceId,
      correlationId,
      userId,
      fingerprint,
      category,
      fromDate,
      toDate,
      page,
    });
    const currentSearch = searchParams?.toString() ?? '';
    if (nextSearch === currentSearch) return;
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [
    category,
    fingerprint,
    fromDate,
    level,
    method,
    page,
    pathname,
    query,
    requestId,
    traceId,
    correlationId,
    router,
    searchParams,
    service,
    source,
    statusCode,
    minDurationMs,
    toDate,
    userId,
  ]);

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      level: level === 'all' ? null : level,
      query,
      source,
      service,
      method,
      statusCode: parseStatusCodeInput(statusCode),
      minDurationMs: parseMinDurationInput(minDurationMs),
      requestId,
      traceId,
      correlationId,
      userId,
      fingerprint,
      category,
      from: formatDateParam(fromDate),
      to: formatDateParam(toDate, true),
    }),
    [
      page,
      pageSize,
      level,
      query,
      source,
      method,
      statusCode,
      minDurationMs,
      requestId,
      traceId,
      correlationId,
      userId,
      fingerprint,
      category,
      fromDate,
      toDate,
      service,
    ]
  );

  const metricsFilters = useMemo(
    () => ({
      level: level === 'all' ? null : level,
      query,
      source,
      service,
      method,
      statusCode: parseStatusCodeInput(statusCode),
      minDurationMs: parseMinDurationInput(minDurationMs),
      requestId,
      traceId,
      correlationId,
      userId,
      fingerprint,
      category,
      from: formatDateParam(fromDate),
      to: formatDateParam(toDate, true),
    }),
    [
      level,
      query,
      source,
      method,
      statusCode,
      minDurationMs,
      requestId,
      traceId,
      correlationId,
      userId,
      fingerprint,
      category,
      fromDate,
      toDate,
      service,
    ]
  );

  const logsQuery = useSystemLogs(filters);
  const metricsQuery = useSystemLogMetrics(metricsFilters);
  const mongoDiagnosticsQuery = useMongoDiagnostics();
  const insightsQuery = useLogInsights({ limit: 5 });

  const runInsightMutation = useRunLogInsight();

  const handleRunInsight = async () => {
    try {
      const data = await runInsightMutation.mutateAsync();
      if (data.insight) {
        toast('AI log insight generated.', { variant: 'success' });
      }
    } catch (error) {
      logClientError(error, { context: { source: 'SystemLogsContext', action: 'runInsight' } });
      toast(error instanceof Error ? error.message : 'Failed to generate log insight.', {
        variant: 'error',
      });
    }
  };

  const interpretLogMutation = useInterpretLog();

  const handleInterpretLog = async (logId: string) => {
    try {
      const data = await interpretLogMutation.mutateAsync(logId);
      if (!data.insight) return;
      const context = data.insight.metadata || {};
      const key = typeof context['logId'] === 'string' ? context['logId'] : data.insight.id;
      setLogInterpretations((prev: Record<string, AiInsightRecord>) => ({
        ...prev,
        [key]: data.insight,
      }));
      toast('AI interpretation added.', { variant: 'success' });
    } catch (error) {
      logClientError(error, {
        context: { source: 'SystemLogsContext', action: 'interpretLog', logId },
      });
      toast(error instanceof Error ? error.message : 'Failed to interpret log.', {
        variant: 'error',
      });
    }
  };

  const clearLogsMutation = useClearLogsMutation();
  const rebuildIndexesMutation = useRebuildIndexesMutation();

  useEffect(() => {
    if (logsQuery.error) {
      logClientError(logsQuery.error, {
        context: { source: 'SystemLogsContext', action: 'loadLogs' },
      });
      toast(logsQuery.error.message, { variant: 'error' });
    }
  }, [logsQuery.error, toast]);

  useEffect(() => {
    if (metricsQuery.error) {
      logClientError(metricsQuery.error, {
        context: { source: 'SystemLogsContext', action: 'loadMetrics' },
      });
      toast(metricsQuery.error.message, { variant: 'error' });
    }
  }, [metricsQuery.error, toast]);

  useEffect(() => {
    if (mongoDiagnosticsQuery.error) {
      logClientError(mongoDiagnosticsQuery.error, {
        context: { source: 'SystemLogsContext', action: 'loadDiagnostics' },
      });
      toast(mongoDiagnosticsQuery.error.message, { variant: 'error' });
    }
  }, [mongoDiagnosticsQuery.error, toast]);

  const logs = useMemo(() => logsQuery.data?.logs ?? [], [logsQuery.data]);
  const total = logsQuery.data?.total ?? 0;
  const metrics = metricsQuery.data?.metrics ?? null;
  const diagnostics = useMemo((): MongoCollectionIndexStatus[] => {
    const data = mongoDiagnosticsQuery.data as MongoDiagnosticsData | undefined;
    return data?.collections ?? [];
  }, [mongoDiagnosticsQuery.data]);
  const diagnosticsUpdatedAt =
    (mongoDiagnosticsQuery.data as MongoDiagnosticsData | undefined)?.generatedAt ?? null;
  const logsJson = useMemo(() => JSON.stringify(logs, null, 2), [logs]);

  const totalPages: number = useMemo((): number => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const levels = metrics?.levels ?? { error: 0, warn: 0, info: 0 };

  const handleFilterChange = (key: string, value: string): void => {
    setPage(1);
    if (key === 'level') setLevel(value as SystemLogLevel | 'all');
    if (key === 'query') setQuery(value);
    if (key === 'source') setSource(value);
    if (key === 'service') setService(value);
    if (key === 'method') setMethod(value);
    if (key === 'statusCode') setStatusCode(value);
    if (key === 'minDurationMs') setMinDurationMs(value);
    if (key === 'requestId') setRequestId(value);
    if (key === 'traceId') setTraceId(value);
    if (key === 'correlationId') setCorrelationId(value);
    if (key === 'userId') setUserId(value);
    if (key === 'fingerprint') setFingerprint(value);
    if (key === 'category') setCategory(value);
    if (key === 'fromDate') setFromDate(value);
    if (key === 'toDate') setToDate(value);
  };

  const handleResetFilters = (): void => {
    setLevel('all');
    setQuery('');
    setSource('');
    setService('');
    setMethod('');
    setStatusCode('');
    setMinDurationMs('');
    setRequestId('');
    setTraceId('');
    setCorrelationId('');
    setUserId('');
    setFingerprint('');
    setCategory('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleClearLogs = async (): Promise<void> => {
    try {
      const result = await clearLogsMutation.mutateAsync();
      const deleted = typeof result?.deleted === 'number' ? result.deleted : 0;
      toast(`System logs cleared (${deleted}).`, { variant: 'success' });
      void logsQuery.refetch();
      void metricsQuery.refetch();
      void insightsQuery.refetch();
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'SystemLogsContext', action: 'clearLogs' } });
      toast(error instanceof Error ? error.message : 'Failed to clear logs.', {
        variant: 'error',
      });
    }
  };

  const handleRebuildMongoIndexes = async (): Promise<void> => {
    try {
      const result = (await rebuildIndexesMutation.mutateAsync()) as { created?: unknown[] };
      const createdCount = result?.created?.length ?? 0;
      toast(
        createdCount > 0
          ? `Rebuilt ${createdCount} index(es).`
          : 'Mongo indexes already up to date.',
        { variant: 'success' }
      );
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'SystemLogsContext', action: 'rebuildIndexes' } });
      toast(error instanceof Error ? error.message : 'Failed to rebuild indexes.', {
        variant: 'error',
      });
    }
  };

  const stateValue: SystemLogsStateContextValue = {
    level,
    query,
    source,
    service,
    method,
    statusCode,
    minDurationMs,
    requestId,
    traceId,
    correlationId,
    userId,
    fingerprint,
    category,
    fromDate,
    toDate,
    page,
    pageSize,
    filterFields,
    logs,
    logsJson,
    total,
    totalPages,
    metrics,
    levels,
    diagnostics,
    diagnosticsUpdatedAt,
    logInterpretations,
    logsQuery,
    metricsQuery,
    mongoDiagnosticsQuery,
    insightsQuery,
    runInsightMutation,
    interpretLogMutation,
    clearLogsMutation,
    rebuildIndexesMutation,
    ConfirmationModal,
    isClearLogsConfirmOpen,
    isRebuildIndexesConfirmOpen,
  };
  const actionsValue: SystemLogsActionsContextValue = {
    setPage,
    handleFilterChange,
    handleResetFilters,
    confirmAction,
    handleClearLogs,
    handleRebuildMongoIndexes,
    handleRunInsight,
    handleInterpretLog,
    setIsClearLogsConfirmOpen,
    setIsRebuildIndexesConfirmOpen,
    toast,
  };

  return (
    <SystemLogsActionsContext.Provider value={actionsValue}>
      <SystemLogsStateContext.Provider value={stateValue}>
        {children}
      </SystemLogsStateContext.Provider>
    </SystemLogsActionsContext.Provider>
  );
}
