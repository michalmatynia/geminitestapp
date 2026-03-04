'use client';

import { Copy, Link2, SearchIcon, Trash2 } from 'lucide-react';
import React, { Suspense } from 'react';

import {
  SystemLogsProvider,
  useSystemLogsContext,
} from '@/features/observability/context/SystemLogsContext';
import { type SystemLogFilterFormValues } from '@/shared/lib/observability/log-triage-presets';
import { Button, PageLayout, CopyButton, Card, LoadingState } from '@/shared/ui';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';

import { LogDiagnostics } from '../components/LogDiagnostics';
import { LogMetrics } from '../components/LogMetrics';
import { AiLogInterpreter } from '../components/AiLogInterpreter';
import { LogTriagePresets } from '../components/LogTriagePresets';
import { EventStreamPanel } from '../components/EventStreamPanel';

function SystemLogsContent(): React.JSX.Element {
  const {
    filterFields,
    level,
    query,
    source,
    service,
    method,
    statusCode,
    requestId,
    traceId,
    correlationId,
    userId,
    fingerprint,
    category,
    fromDate,
    toDate,
    handleFilterChange,
    handleResetFilters,
    logs,
    logsJson,
    logsQuery,
    metricsQuery,
    confirmAction,
    handleClearLogs,
    clearLogsMutation,
  } = useSystemLogsContext();

  const currentFilterValues: SystemLogFilterFormValues = {
    level,
    query,
    source,
    service,
    method,
    statusCode,
    requestId,
    traceId,
    correlationId,
    userId,
    fingerprint,
    category,
    fromDate,
    toDate,
  };

  return (
    <PageLayout
      title='Observation Post'
      description='Aggregate telemetry and event logging across all platform components.'
      refresh={{
        onRefresh: (): void => {
          void logsQuery.refetch();
          void metricsQuery.refetch();
        },
        isRefreshing: logsQuery.isFetching || metricsQuery.isFetching,
      }}
      headerActions={
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='xs'
            className='h-8'
            onClick={() => window.location.assign('/admin/settings/logging')}
          >
            Settings
          </Button>
          <CopyButton
            value={typeof window !== 'undefined' ? window.location.href : ''}
            variant='outline'
            size='sm'
            className='h-8'
            showText
          >
            <Link2 className='size-3.5 mr-2' />
            Sync Link
          </CopyButton>
          <CopyButton
            value={logsJson}
            variant='outline'
            size='sm'
            className='h-8'
            disabled={logs.length === 0}
            showText
          >
            <Copy className='size-3.5 mr-2' />
            Export
          </CopyButton>
          <Button
            variant='outline'
            size='xs'
            className='h-8 border-rose-500/20 text-rose-300 hover:bg-rose-500/5'
            onClick={() =>
              confirmAction({
                title: 'Wipe Observation Logs',
                message:
                  'Permanently delete all captured telemetry data. This action is irreversible.',
                confirmText: 'Confirm Wipe',
                isDangerous: true,
                onConfirm: handleClearLogs,
              })
            }
            disabled={clearLogsMutation.isPending}
          >
            <Trash2 className='size-3.5 mr-2' />
            {clearLogsMutation.isPending ? 'Purging...' : 'Wipe Logs'}
          </Button>
        </div>
      }
    >
      <div className='space-y-6'>
        <LogTriagePresets />

        <Card variant='glass' padding='lg'>
          <div className='flex items-center gap-2 mb-6 text-xs font-bold uppercase text-gray-500'>
            <SearchIcon className='size-3.5' />
            Log Filters
          </div>
          <FilterPanel
            filters={filterFields}
            values={currentFilterValues}
            onFilterChange={(key, value) => handleFilterChange(key, value as string)}
            onSearchChange={(val) => handleFilterChange('query', val)}
            search={query}
            onReset={handleResetFilters}
            showHeader={false}
            compact
          />
        </Card>

        <LogDiagnostics />

        <div className='grid gap-6 lg:grid-cols-2'>
          <LogMetrics />
          <AiLogInterpreter />
        </div>

        <EventStreamPanel />
      </div>
    </PageLayout>
  );
}

export default function SystemLogsPage(): React.JSX.Element {
  return (
    <Suspense
      fallback={<LoadingState message='Mounting observation post...' className='h-screen' />}
    >
      <SystemLogsProvider>
        <SystemLogsContent />
      </SystemLogsProvider>
    </Suspense>
  );
}
