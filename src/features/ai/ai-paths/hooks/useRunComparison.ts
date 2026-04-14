'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import {
  buildRunTraceComparison,
  runTraceComparisonRowHasResumeChange,
} from '../components/run-trace-utils';

export function useRunComparison(runs: AiPathRunRecord[]) {
  const [compareMode, setCompareMode] = useState(false);
  const [primaryRunId, setPrimaryRunId] = useState<string | null>(null);
  const [secondaryRunId, setSecondaryRunId] = useState<string | null>(null);
  const [compareInspectorRowKey, setCompareInspectorRowKey] = useState<string | null>(null);
  const [compareResumeChangesOnly, setCompareResumeChangesOnly] = useState(false);

  const toggleCompareMode = useCallback(() => {
    setCompareMode((prev) => !prev);
    setPrimaryRunId(null);
    setSecondaryRunId(null);
    setCompareInspectorRowKey(null);
    setCompareResumeChangesOnly(false);
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
    () =>
      compareResumeChangesOnly
        ? (traceComparison?.rows.filter((row) => runTraceComparisonRowHasResumeChange(row)) ?? [])
        : (traceComparison?.rows ?? []),
    [compareResumeChangesOnly, traceComparison]
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
    compareResumeChangesOnly,
    setCompareResumeChangesOnly,
    primaryRun,
    secondaryRun,
    traceComparison,
    displayedComparisonRows,
  };
}
