'use client';

import { useRef } from 'react';

import type {
  SelectorRegistryEntry,
  SelectorRegistryProbeSessionCluster,
  SelectorRegistryProbeSession,
} from '@/shared/contracts/integrations/selector-registry';
import { useSelectorRegistryProbeSessions } from './selector-registry-probe-sessions/useSelectorRegistryProbeSessions';
import { useProbeSessionActions } from './selector-registry-probe-sessions/useProbeSessionActions';
import { useProbeSessionSelection } from './selector-registry-probe-sessions/useProbeSessionSelection';
import { ProbeSessionsHeader } from './selector-registry-probe-sessions/ProbeSessionsHeader';
import { useProbeSessionData } from './selector-registry-probe-sessions/useProbeSessionData';
import { ProbeSessionsBody } from './selector-registry-probe-sessions/ProbeSessionsBody';

type Props = {
  sessions: SelectorRegistryProbeSession[];
  clusters?: SelectorRegistryProbeSessionCluster[];
  promotableEntries: SelectorRegistryEntry[];
  showArchived: boolean;
  onShowArchivedChange: (next: boolean) => void;
};

/**
 * Section for reviewing and promoting probe sessions in the selector registry.
 */
export function SelectorRegistryProbeSessionsSection(props: Props): React.JSX.Element | null {
  const { sessions, clusters, promotableEntries, showArchived, onShowArchivedChange } = props;

  const {
    activeSessions,
    selectedKeys,
    setSelectedKeys,
    manuallySelectedKeys,
    setManuallySelectedKeys,
    deleteMutation,
    restoreMutation,
  } = useSelectorRegistryProbeSessions(sessions);

  const data = useProbeSessionData({ sessions, activeSessions, clusters, promotableEntries, showArchived });
  const actions = useProbeSessionActions({ restoreMutation, deleteMutation });

  useProbeSessionSelection({
    activeSessions,
    resolvedClusters: data.resolvedClusters,
    defaultKeysByRole: data.defaultKeysByRole,
    manuallySelectedKeys,
    setManuallySelectedKeys,
    setSelectedKeys,
  });

  const sectionRef = useRef<HTMLElement | null>(null);

  if (activeSessions.length === 0 && data.archivedSessions.length === 0 && data.resolvedClusters.length === 0) {
    return null;
  }

  return (
    <section id='probe-sessions' ref={sectionRef} tabIndex={-1} className='space-y-4 rounded-lg border border-border bg-card/40 p-4'>
      <ProbeSessionsHeader
        resolvedClustersCount={data.resolvedClusters.length}
        activeSessionsCount={activeSessions.length}
        showArchived={showArchived}
        archivedSessionsCount={data.archivedSessions.length}
        storedSessionCount={data.storedSessionCount}
        onShowArchivedChange={onShowArchivedChange}
      />
      <ProbeSessionsBody
        resolvedClusters={data.resolvedClusters}
        selectedKeys={selectedKeys}
        manuallySelectedKeys={manuallySelectedKeys}
        defaultKeysByRole={data.defaultKeysByRole}
        showArchived={showArchived}
        archivedClusters={data.archivedClusters}
        archivedSessions={data.archivedSessions}
        restoreMutation={restoreMutation}
        actions={actions}
      />
    </section>
  );
}
