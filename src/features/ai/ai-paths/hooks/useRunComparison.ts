'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { buildRunTraceComparison } from '../components/run-trace-utils';

export function useRunComparison(runs: AiPathRunRecord[]) {
  const [compareMode, setCompareMode] = useState(false);
  const [primaryRunId, setPrimaryRunId] = useState<string | null>(null);
  const [secondaryRunId, setSecondaryRunId] = useState<string | null>(null);
  const [compareInspectorRowKey, setCompareInspectorRowKey] = useState<string | null>(null);

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => !prev);
    setPrimaryRunId(null);
    setSecondaryRunId(null);
    setCompareInspectorRowKey(null);
  }, []);

  const primaryRun = useMemo(
    () => runs.find((run) => run.id === primaryRunId) ?? null,
    [runs, primaryRunId]
  );

  const secondaryRun = useMemo(
    () => runs.find((run) => run.id === secondaryRunId) ?? null,
    [runs, secondaryRunId]
  );

  const traceComparison = useMemo(
    () => buildRunTraceComparison(primaryRun, secondaryRun),
    [primaryRun, secondaryRun]
  );

  const displayedComparisonRows = useMemo(
    () => traceComparison?.rows ?? [],
    [traceComparison]
  );

  useEffect(() => {
    if (!compareMode || !compareInspectorRowKey) return;
    if (displayedComparisonRows.some((row) => row.key === compareInspectorRowKey)) return;
    setCompareInspectorRowKey(null);
  }, [compareInspectorRowKey, compareMode, displayedComparisonRows]);

  return {
    compareMode,
    toggleCompareMode,
    primaryRunId,
    setPrimaryRunId,
    secondaryRunId,
    setSecondaryRunId,
    compareInspectorRowKey,
    setCompareInspectorRowKey,
    primaryRun,
    secondaryRun,
    traceComparison,
    displayedComparisonRows,
  };
}
