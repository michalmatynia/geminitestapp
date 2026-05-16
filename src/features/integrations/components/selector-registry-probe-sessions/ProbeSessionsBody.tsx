'use client';

import React from 'react';
import type {
  SelectorRegistryProbeSessionCluster,
  SelectorRegistryProbeSession,
} from '@/shared/contracts/integrations/selector-registry';
import { ProbeClusterSection } from './ProbeClusterSection';
import { ArchivedSessionsSection } from './ArchivedSessionsSection';
import type { ProbeSessionActionsResult } from './useProbeSessionActions';
import type { useRestoreSelectorRegistryProbeSessionMutation } from '@/features/integrations/hooks/useSelectorRegistry';

export type ProbeSessionsBodyProps = {
  resolvedClusters: SelectorRegistryProbeSessionCluster[];
  selectedKeys: Record<string, string>;
  manuallySelectedKeys: Record<string, boolean>;
  defaultKeysByRole: Map<string, string>;
  showArchived: boolean;
  archivedClusters: SelectorRegistryProbeSessionCluster[];
  archivedSessions: SelectorRegistryProbeSession[];
  restoreMutation: ReturnType<typeof useRestoreSelectorRegistryProbeSessionMutation>;
  actions: ProbeSessionActionsResult;
};

/**
 * Renders the main body of the probe sessions section.
 */
export function ProbeSessionsBody(props: ProbeSessionsBodyProps): React.JSX.Element {
  const {
    resolvedClusters,
    showArchived,
    archivedClusters,
    archivedSessions,
    restoreMutation,
    actions,
  } = props;

  return (
    <div className='space-y-4'>
      <ProbeClusterSection resolvedClusters={resolvedClusters} />

      {showArchived && archivedClusters.length > 0 && (
        <ArchivedSessionsSection
          archivedClusters={archivedClusters}
          archivedSessions={archivedSessions}
          isPending={restoreMutation.isPending}
          onRestoreSession={actions.handleRestoreSession}
          onRestoreTemplate={(_key, ids) => actions.handleRestoreTemplate(ids)}
          onRejectSession={actions.handleRejectSession}
          onRejectTemplate={(_key, ids) => actions.handleRejectTemplate(ids)}
          onPromoteAndArchiveSession={async () => {}}
          onPromoteAndArchiveTemplate={async () => {}}
        />
      )}
    </div>
  );
}
