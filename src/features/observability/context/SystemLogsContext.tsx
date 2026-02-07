'use client';

import { type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { useClearLogsMutation, useRebuildIndexesMutation, useRunLogInsight, useInterpretLog } from '@/features/observability/hooks/useLogMutations';
import { useSystemLogs, useSystemLogMetrics, useMongoDiagnostics, useLogInsights } from '@/features/observability/hooks/useLogQueries';
import type { SystemLogMetrics, SystemLogRecord, SystemLogLevel, AiInsightRecord } from '@/shared/types';
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
  { key: 'fromDate', label: 'From', type: 'date' },
  { key: 'toDate', label: 'To', type: 'date' },
];

type MongoIndexInfo = {
  name?: string;
  key: Record<string, unknown>;
};

type MongoCollectionIndexStatus = {
  name: string;
  expected: MongoIndexInfo[];
  existing: MongoIndexInfo[];
  missing: MongoIndexInfo[];
  extra: MongoIndexInfo[];
  error?: string;
};

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

type ToastFn = (
  message: string,
  options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
) => void;

type SystemLogsContextValue = {
  level: SystemLogLevel | 'all';
  query: string;
  source: string;
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
  logsQuery: UseQueryResult<{ logs?: SystemLogRecord[]; total?: number; page?: number; pageSize?: number }, Error>;
  metricsQuery: UseQueryResult<{ metrics?: SystemLogMetrics }, Error>;
  mongoDiagnosticsQuery: UseQueryResult<unknown, Error>;
  insightsQuery: UseQueryResult<{ insights: AiInsightRecord[] }, Error>;
  runInsightMutation: UseMutationResult<{ insight: AiInsightRecord }, Error, void>;
  interpretLogMutation: UseMutationResult<{ insight: AiInsightRecord }, Error, string>;
  clearLogsMutation: UseMutationResult<boolean, Error, void>;
  rebuildIndexesMutation: UseMutationResult<unknown, Error, void>;
  isClearLogsConfirmOpen: boolean;
  setIsClearLogsConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRebuildIndexesConfirmOpen: boolean;
  setIsRebuildIndexesConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleClearLogs: () => Promise<void>;
  handleRebuildMongoIndexes: () => Promise<void>;
  handleRunInsight: () => Promise<void>;
  handleInterpretLog: (logId: string) => Promise<void>;
  toast: ToastFn;
};

const SystemLogsContext = createContext<SystemLogsContextValue | null>(null);

export const useSystemLogsContext = (): SystemLogsContextValue => {
  const context = useContext(SystemLogsContext);
  if (!context) {
    throw new Error('useSystemLogsContext must be used within SystemLogsProvider');
  }
  return context;
};

export function SystemLogsProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [level, setLevel] = useState<SystemLogLevel | 'all'>(() => {
    const p = searchParams?.get('level');
    if (p && levelOptions.some((option: (typeof levelOptions)[number]) => option.value === p)) {
      return p as SystemLogLevel | 'all';
    }
    return 'all';
  });

  const [query, setQuery] = useState(() => searchParams?.get('query') ?? '');
  const [source, setSource] = useState(() => searchParams?.get('source') ?? '');

  const [fromDate, setFromDate] = useState(() => {
    const p = searchParams?.get('from');
    if (!p) return '';
    const date = new Date(p);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  });

  const [toDate, setToDate] = useState(() => {
    const p = searchParams?.get('to');
    if (!p) return '';
    const date = new Date(p);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  });

  const [isClearLogsConfirmOpen, setIsClearLogsConfirmOpen] = useState(false);
  const [isRebuildIndexesConfirmOpen, setIsRebuildIndexesConfirmOpen] = useState(false);
  const [logInterpretations, setLogInterpretations] = useState<Record<string, AiInsightRecord>>({});

  const [page, setPage] = useState(1);
  const pageSize = 50;

  const filters = useMemo(
    () => ({
      page,
      pageSize,
      level,
      query,
      source,
      from: formatDateParam(fromDate),
      to: formatDateParam(toDate, true),
    }),
    [page, pageSize, level, query, source, fromDate, toDate]
  );

  const metricsFilters = useMemo(
    () => ({
      level,
      query,
      source,
      from: formatDateParam(fromDate),
      to: formatDateParam(toDate, true),
    }),
    [level, query, source, fromDate, toDate]
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
      toast(error instanceof Error ? error.message : 'Failed to generate log insight.', { variant: 'error' });
    }
  };

  const interpretLogMutation = useInterpretLog();

  const handleInterpretLog = async (logId: string) => {
    try {
      const data = await interpretLogMutation.mutateAsync(logId);
      if (!data.insight) return;
      const key = typeof data.insight.context?.logId === 'string' ? data.insight.context.logId : data.insight.id;
      setLogInterpretations((prev: Record<string, AiInsightRecord>) => ({
        ...prev,
        [key]: data.insight,
      }));
      toast('AI interpretation added.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to interpret log.', { variant: 'error' });
    }
  };

  const clearLogsMutation = useClearLogsMutation();
  const rebuildIndexesMutation = useRebuildIndexesMutation();

  useEffect(() => {
    if (logsQuery.error) toast(logsQuery.error.message, { variant: 'error' });
  }, [logsQuery.error, toast]);

  useEffect(() => {
    if (metricsQuery.error) toast(metricsQuery.error.message, { variant: 'error' });
  }, [metricsQuery.error, toast]);

  useEffect(() => {
    if (mongoDiagnosticsQuery.error) toast(mongoDiagnosticsQuery.error.message, { variant: 'error' });
  }, [mongoDiagnosticsQuery.error, toast]);

  const logs = useMemo(() => logsQuery.data?.logs ?? [], [logsQuery.data]);
  const total = logsQuery.data?.total ?? 0;
  const metrics = metricsQuery.data?.metrics ?? null;
  const diagnostics = useMemo((): MongoCollectionIndexStatus[] => {
    const data = mongoDiagnosticsQuery.data as MongoDiagnosticsData | undefined;
    return data?.collections ?? [];
  }, [mongoDiagnosticsQuery.data]);
  const diagnosticsUpdatedAt = (mongoDiagnosticsQuery.data as MongoDiagnosticsData | undefined)?.generatedAt ?? null;
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
    if (key === 'fromDate') setFromDate(value);
    if (key === 'toDate') setToDate(value);
  };

  const handleResetFilters = (): void => {
    setLevel('all');
    setQuery('');
    setSource('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const handleClearLogs = async (): Promise<void> => {
    try {
      await clearLogsMutation.mutateAsync();
      toast('System logs cleared.', { variant: 'success' });
    } catch (error: unknown) {
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
      toast(error instanceof Error ? error.message : 'Failed to rebuild indexes.', {
        variant: 'error',
      });
    }
  };

  const value: SystemLogsContextValue = {
    level,
    query,
    source,
    fromDate,
    toDate,
    page,
    pageSize,
    filterFields,
    setPage,
    handleFilterChange,
    handleResetFilters,
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
    isClearLogsConfirmOpen,
    setIsClearLogsConfirmOpen,
    isRebuildIndexesConfirmOpen,
    setIsRebuildIndexesConfirmOpen,
    handleClearLogs,
    handleRebuildMongoIndexes,
    handleRunInsight,
    handleInterpretLog,
    toast,
  };

  return <SystemLogsContext.Provider value={value}>{children}</SystemLogsContext.Provider>;
}
