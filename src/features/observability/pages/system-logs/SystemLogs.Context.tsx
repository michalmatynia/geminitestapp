'use client';

import React from 'react';
import { useSystemLogsState } from '@/features/observability/context/SystemLogsContext';
import { buildSystemLogsWorkspaceContextBundle } from '@/shared/lib/observability/runtime-context/system-logs-workspace';
import { useRegisterContextRegistryPageSource } from '@/shared/lib/ai-context-registry/page-context';

export function SystemLogsContextRegistrySource(): React.JSX.Element {
  const {
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
    total,
    totalPages,
    logs,
    metrics,
    insightsQuery,
    logInterpretations,
  } = useSystemLogsState();

  const registrySource = React.useMemo(
    () => ({
      label: 'Observation Post Workspace State',
      resolved: buildSystemLogsWorkspaceContextBundle({
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
        total,
        totalPages,
        logs,
        metrics,
        insights: insightsQuery.data?.insights ?? [],
        interpretationCount: Object.keys(logInterpretations).length,
      }),
    }),
    [
      category,
      correlationId,
      fingerprint,
      fromDate,
      insightsQuery.data?.insights,
      level,
      logInterpretations,
      logs,
      method,
      metrics,
      minDurationMs,
      page,
      pageSize,
      query,
      requestId,
      service,
      source,
      statusCode,
      toDate,
      total,
      totalPages,
      traceId,
      userId,
    ]
  );

  useRegisterContextRegistryPageSource('system-logs-workspace-state', registrySource);

  return <></>;
}
