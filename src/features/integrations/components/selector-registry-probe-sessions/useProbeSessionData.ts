'use client';

import { useMemo } from 'react';
import type {
  SelectorRegistryEntry,
  SelectorRegistryProbeSession,
  SelectorRegistryProbeSessionCluster,
} from '@/shared/contracts/integrations/selector-registry';
import {
  buildSelectorRegistryProbeCarryForwardDefaultKeysByRole,
} from '@/shared/lib/browser-execution/selector-registry-probe-carry-forward';
import { buildSelectorRegistryProbeSessionClusters } from '../selectorRegistryProbeSessionClustering';

export type ProbeSessionDataResult = {
  defaultKeysByRole: Record<string, string>;
  archivedSessions: SelectorRegistryProbeSession[];
  resolvedClusters: SelectorRegistryProbeSessionCluster[];
  archivedClusters: SelectorRegistryProbeSessionCluster[];
  storedSessionCount: number;
};

/**
 * Hook for orchestrating probe session data and derived state.
 */
export function useProbeSessionData(params: {
  sessions: SelectorRegistryProbeSession[];
  activeSessions: SelectorRegistryProbeSession[];
  clusters?: SelectorRegistryProbeSessionCluster[];
  promotableEntries: SelectorRegistryEntry[];
  showArchived: boolean;
}): ProbeSessionDataResult {
  const { sessions, activeSessions, clusters, promotableEntries, showArchived } = params;

  const defaultKeysByRole = useMemo(
    () => buildSelectorRegistryProbeCarryForwardDefaultKeysByRole(promotableEntries),
    [promotableEntries]
  );

  const archivedSessions = useMemo(
    () => sessions.filter((session) => session.archivedAt !== null),
    [sessions]
  );

  const resolvedClusters = useMemo(
    () =>
      showArchived
        ? buildSelectorRegistryProbeSessionClusters(activeSessions)
        : clusters ?? buildSelectorRegistryProbeSessionClusters(activeSessions),
    [activeSessions, clusters, showArchived]
  );

  const archivedClusters = useMemo(
    () => buildSelectorRegistryProbeSessionClusters(archivedSessions),
    [archivedSessions]
  );

  const storedSessionCount = useMemo(
    () =>
      sessions.length > 0
        ? sessions.length
        : resolvedClusters.reduce((sum, cluster) => sum + cluster.sessionCount, 0),
    [sessions.length, resolvedClusters]
  );

  return {
    defaultKeysByRole,
    archivedSessions,
    resolvedClusters,
    archivedClusters,
    storedSessionCount,
  };
}
