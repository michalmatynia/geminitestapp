'use client';

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
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import type {
  MongoCollectionIndexStatusDto as MongoCollectionIndexStatus,
  SystemLogLevelDto as SystemLogLevel,
} from '@/shared/contracts/observability';
import { internalError } from '@/shared/errors/app-error';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  formatDateParam,
  parseMinDurationInput,
  parseStatusCodeInput,
  systemLogFilterFields,
} from './SystemLogsContext.shared';
import { readSystemLogUrlState, writeSystemLogUrlState } from '../lib/system-log-filter-url-state';

import type {
  SystemLogsActionsContextValue,
  SystemLogsStateContextValue,
} from './SystemLogsContext.shared';

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
      logClientError(error);
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
      const insight = data.insight;
      if (!insight) return;
      const context = insight.metadata || {};
      const key = typeof context['logId'] === 'string' ? context['logId'] : insight.id;
      setLogInterpretations((prev: Record<string, AiInsightRecord>) => ({
        ...prev,
        [key]: insight,
      }));
      toast('AI interpretation added.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
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
  const diagnostics = useMemo(
    (): MongoCollectionIndexStatus[] => mongoDiagnosticsQuery.data?.collections ?? [],
    [mongoDiagnosticsQuery.data]
  );
  const diagnosticsUpdatedAt = mongoDiagnosticsQuery.data?.generatedAt ?? null;
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
      logClientError(error);
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
      logClientError(error);
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
    filterFields: systemLogFilterFields,
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
