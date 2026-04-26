'use client';

import Link from 'next/link';
import React from 'react';

import { TraderaExecutionSteps } from '@/features/integrations/components/listings/TraderaExecutionSteps';
import { useTraderaLiveExecution } from '@/features/integrations/hooks/useTraderaLiveExecution';
import { JsonViewer } from '@/shared/ui/data-display.public';
import { Button } from '@/shared/ui/primitives.public';

type TraderaQuickExportRecoveryDiagnosticsProps = {
  runId: string;
};

type RecoveryExecution = NonNullable<ReturnType<typeof useTraderaLiveExecution>>;

const buildActionRunHref = (runId: string): string =>
  `/admin/playwright/action-runs?query=${encodeURIComponent(runId)}`;

function TraderaRecoveryDiagnosticsUnavailable(): React.JSX.Element {
  return (
    <p className='text-xs text-gray-400'>
      Run diagnostics are loading or unavailable. Open run history to inspect the
      stored browser execution.
    </p>
  );
}

function TraderaRecoveryRunHistoryLink({
  runId,
}: TraderaQuickExportRecoveryDiagnosticsProps): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <div className='text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
        Browser run history
      </div>
      <Button asChild type='button' variant='outline' size='sm'>
        <Link href={buildActionRunHref(runId)}>Open run history</Link>
      </Button>
    </div>
  );
}

function TraderaRecoveryExecutionSteps({
  execution,
}: {
  execution: RecoveryExecution;
}): React.JSX.Element | null {
  if (execution.executionSteps.length === 0) {
    return null;
  }

  const isLive = execution.status === 'queued' || execution.status === 'running';

  return (
    <TraderaExecutionSteps
      title='Failed run steps'
      steps={execution.executionSteps}
      live={isLive}
      liveStatus={isLive ? execution.status : null}
    />
  );
}

function TraderaRecoveryRunResult({
  execution,
}: {
  execution: RecoveryExecution;
}): React.JSX.Element | null {
  if (execution.rawResult === null) {
    return null;
  }

  return (
    <JsonViewer
      title='Tradera run result'
      data={execution.rawResult}
      maxHeight={220}
      className='bg-white/5'
    />
  );
}

function TraderaRecoveryFailureDiagnostics({
  execution,
}: {
  execution: RecoveryExecution;
}): React.JSX.Element | null {
  const failureArtifacts = execution.failureArtifacts ?? [];
  const hasDiagnostics =
    execution.error !== null ||
    execution.logTail.length > 0 ||
    failureArtifacts.length > 0 ||
    execution.runtimePosture !== null;

  if (!hasDiagnostics) {
    return null;
  }

  return (
    <JsonViewer
      title='Tradera failure diagnostics'
      data={{
        error: execution.error,
        logTail: execution.logTail.length > 0 ? execution.logTail : null,
        failureArtifacts: failureArtifacts.length > 0 ? failureArtifacts : null,
        runtimePosture: execution.runtimePosture,
      }}
      maxHeight={220}
      className='bg-white/5'
    />
  );
}

function TraderaQuickExportRecoveryDiagnosticsContent({
  runId,
  execution,
}: TraderaQuickExportRecoveryDiagnosticsProps & {
  execution: RecoveryExecution;
}): React.JSX.Element {
  return (
    <div className='space-y-3 border-t border-white/10 pt-3'>
      <TraderaRecoveryRunHistoryLink runId={runId} />
      <TraderaRecoveryExecutionSteps execution={execution} />
      <TraderaRecoveryRunResult execution={execution} />
      <TraderaRecoveryFailureDiagnostics execution={execution} />
    </div>
  );
}

export function TraderaQuickExportRecoveryDiagnostics({
  runId,
}: TraderaQuickExportRecoveryDiagnosticsProps): React.JSX.Element {
  const execution = useTraderaLiveExecution({ runId, action: 'list' });

  if (execution === null) {
    return (
      <div className='space-y-3 border-t border-white/10 pt-3'>
        <TraderaRecoveryRunHistoryLink runId={runId} />
        <TraderaRecoveryDiagnosticsUnavailable />
      </div>
    );
  }

  return (
    <TraderaQuickExportRecoveryDiagnosticsContent
      runId={runId}
      execution={execution}
    />
  );
}
