'use client';

import React from 'react';
import { 
  ConfirmModal 
} from '@/shared/ui';
import { JobQueueProvider, useJobQueueContext } from './JobQueueContext';
import { JobQueueControls } from './JobQueueControls';
import { JobQueueOverview } from './job-queue-overview';
import { JobQueueFilterPanel } from './JobQueueFilterPanel';
import { JobQueueList } from './JobQueueList';

function JobQueuePanelInner(): React.JSX.Element {
  const {
    queueStatus,
    queueHistory,
    lagThresholdMs,
    autoRefreshEnabled,
    autoRefreshInterval,
    showMetricsPanel,
    setShowMetricsPanel,
    setQueueHistory,
    clearScope,
    setClearScope,
    handleClearRuns,
    isClearingRuns,
    runToDelete,
    setRunToDelete,
    handleDeleteRun,
    isDeletingRun,
    isLoadingQueueStatus,
  } = useJobQueueContext();

  return (
    <div className='space-y-4'>
      <JobQueueControls />

      <JobQueueOverview
        queueStatus={queueStatus}
        queueStatusError={null} // Managed by context
        queueStatusFetching={isLoadingQueueStatus}
        queueHistory={queueHistory}
        lagThresholdMs={lagThresholdMs}
        autoRefreshEnabled={autoRefreshEnabled}
        autoRefreshInterval={autoRefreshInterval}
        showMetricsPanel={showMetricsPanel}
        onToggleMetricsPanel={() => setShowMetricsPanel((prev: boolean) => !prev)}
        onClearHistory={() => setQueueHistory([])}
      />

      <JobQueueFilterPanel />

      <JobQueueList />

      <ConfirmModal
        isOpen={clearScope === 'terminal'}
        onClose={() => setClearScope(null)}
        onConfirm={() => void handleClearRuns('terminal')}
        title='Clear finished AI Path runs'
        message='Delete completed, failed, canceled, and dead-lettered runs from this queue list.'
        confirmText='Clear Finished'
        isDangerous={true}
        loading={isClearingRuns}
      />

      <ConfirmModal
        isOpen={clearScope === 'all'}
        onClose={() => setClearScope(null)}
        onConfirm={() => void handleClearRuns('all')}
        title='Clear all AI Path runs'
        message='Delete all runs in this queue list, including queued, running, and paused entries.'
        confirmText='Clear All'
        isDangerous={true}
        loading={isClearingRuns}
      />

      <ConfirmModal
        isOpen={runToDelete !== null}
        onClose={() => setRunToDelete(null)}
        onConfirm={() => {
          if (!runToDelete) return;
          void handleDeleteRun(runToDelete.id);
        }}
        title='Delete AI Path run'
        message={`Delete run ${runToDelete?.id ?? ''}? This removes its run, node, and event history.`}
        confirmText='Delete Run'
        isDangerous={true}
        loading={runToDelete ? isDeletingRun(runToDelete.id) : false}
      />
    </div>
  );
}

export function JobQueuePanel(props: {
  activePathId?: string | null;
  sourceFilter?: string | null;
  sourceMode?: 'include' | 'exclude';
  isActive?: boolean;
}): React.JSX.Element {
  return (
    <JobQueueProvider {...props}>
      <JobQueuePanelInner />
    </JobQueueProvider>
  );
}
