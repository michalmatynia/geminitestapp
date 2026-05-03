import { useState, useMemo } from 'react';
import { 
  useArchiveSelectorRegistryProbeSessionMutation,
  useDeleteSelectorRegistryProbeSessionMutation,
  useRestoreSelectorRegistryProbeSessionMutation,
  useSaveSelectorRegistryEntryMutation,
} from '@/features/integrations/hooks/useSelectorRegistry';
import { buildSelectorRegistryProbeSessionClusters } from '../selectorRegistryProbeSessionClustering';
import type { SelectorRegistryProbeSession, SelectorRegistryProbeSessionCluster } from '@/shared/contracts/integrations/selector-registry';

export function useProbeSessionsController(sessions: SelectorRegistryProbeSession[], clusters: SelectorRegistryProbeSessionCluster[] | undefined, showArchived: boolean) {
  const [selectedKeys, setSelectedKeys] = useState<Record<string, string>>({});
  const [manuallySelectedKeys, setManuallySelectedKeys] = useState<Record<string, boolean>>({});
  
  const activeSessions = useMemo(() => sessions.filter(s => !s.archivedAt), [sessions]);
  const archivedSessions = useMemo(() => sessions.filter(s => s.archivedAt), [sessions]);
  
  const resolvedClusters = useMemo(() => 
      showArchived ? buildSelectorRegistryProbeSessionClusters(activeSessions) : (clusters ?? buildSelectorRegistryProbeSessionClusters(activeSessions)),
    [activeSessions, clusters, showArchived]
  );
  
  const archivedClusters = useMemo(() => buildSelectorRegistryProbeSessionClusters(archivedSessions), [archivedSessions]);

  const saveMutation = useSaveSelectorRegistryEntryMutation();
  const archiveMutation = useArchiveSelectorRegistryProbeSessionMutation();
  const restoreMutation = useRestoreSelectorRegistryProbeSessionMutation();
  const deleteMutation = useDeleteSelectorRegistryProbeSessionMutation();

  return {
    activeSessions,
    archivedSessions,
    resolvedClusters,
    archivedClusters,
    selectedKeys,
    setSelectedKeys,
    manuallySelectedKeys,
    setManuallySelectedKeys,
    saveMutation,
    archiveMutation,
    restoreMutation,
    deleteMutation,
  };
}
