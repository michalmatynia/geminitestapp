import React from 'react';

import type { AiPathRunVisibility } from '@/shared/lib/ai-paths';
import { ConfirmModal } from '@/shared/ui/templates.public';

import { JobQueueOverview } from './job-queue-overview';
import { JobQueueProvider, useJobQueueActions, useJobQueueState } from './JobQueueContext';
import { JobQueueControls } from './JobQueueControls';
import { JobQueueFilterPanel } from './JobQueueFilterPanel';
import { JobQueueList } from './JobQueueList';

type JobQueueConfirmModalConfig = {
  key: string;
} & Pick<
  React.ComponentProps<typeof ConfirmModal>,
  'isOpen' | 'onClose' | 'onConfirm' | 'title' | 'message' | 'confirmText' | 'loading'
>;

function JobQueuePanelInner(): React.JSX.Element {
  const {
    queueStatus,
    queueHistory,
    lagThresholdMs,
    autoRefreshEnabled,
    autoRefreshInterval,
    showMetricsPanel,
    clearScope,
    runToDelete,
    isDeletingRun,
    isLoadingQueueStatus,
    isClearingRuns,
  } = useJobQueueState();
  const {
    setShowMetricsPanel,
    setQueueHistory,
    setClearScope,
    handleClearRuns,
    setRunToDelete,
    handleDeleteRun,
  } = useJobQueueActions();

  const confirmModalConfigs: JobQueueConfirmModalConfig[] = [
    {
      key: 'clear-terminal',
      isOpen: clearScope === 'terminal',
      onClose: () => setClearScope(null),
      onConfirm: () => void handleClearRuns('terminal'),
      title: 'Clear finished AI Path runs',
      message:
        'Delete completed, failed, canceled, and dead-lettered runs from this queue list.',
      confirmText: 'Clear Finished',
      loading: isClearingRuns,
    },
    {
      key: 'clear-all',
      isOpen: clearScope === 'all',
      onClose: () => setClearScope(null),
      onConfirm: () => void handleClearRuns('all'),
      title: 'Clear all AI Path runs',
      message:
        'Delete all runs in this queue list, including queued, running, and paused entries.',
      confirmText: 'Clear All',
      loading: isClearingRuns,
    },
    {
      key: 'delete-run',
      isOpen: runToDelete !== null,
      onClose: () => setRunToDelete(null),
      onConfirm: () => {
        if (!runToDelete) return;
        void handleDeleteRun(runToDelete.id);
      },
      title: 'Delete AI Path run',
      message: `Delete run ${runToDelete?.id ?? ''}? This removes its run, node, and event history.`,
      confirmText: 'Delete Run',
      loading: runToDelete ? isDeletingRun(runToDelete.id) : false,
    },
  ];

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

      {confirmModalConfigs.map(({ key, ...modalConfig }: JobQueueConfirmModalConfig) => (
        <ConfirmModal key={key} {...modalConfig} isDangerous={true} />
      ))}
    </div>
  );
}

export function JobQueuePanel(props: {
  activePathId?: string | null;
  initialSearchQuery?: string | null;
  initialExpandedRunId?: string | null;
  sourceFilter?: string | null;
  sourceMode?: 'include' | 'exclude';
  visibility?: AiPathRunVisibility;
  isActive?: boolean;
}): React.JSX.Element {
  const {
    activePathId,
    initialSearchQuery,
    initialExpandedRunId,
    sourceFilter,
    sourceMode,
    visibility,
    isActive,
  } = props;

  return (
    <JobQueueProvider
      activePathId={activePathId}
      initialSearchQuery={initialSearchQuery}
      initialExpandedRunId={initialExpandedRunId}
      sourceFilter={sourceFilter}
      sourceMode={sourceMode}
      visibility={visibility}
      isActive={isActive}
    >
      <JobQueuePanelInner />
    </JobQueueProvider>
  );
}
