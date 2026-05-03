import type {
  SelectorRegistryProbeSession,
  SelectorRegistryProbeSessionCluster,
} from '@/shared/contracts/integrations/selector-registry';
import {
  buildSelectorRegistryProbeTemplateFingerprint,
  formatSelectorRegistryProbeTemplateLabel,
} from './selector-registry-probe-template';

export const buildSelectorRegistryProbeSessionClusters = (
  sessions: SelectorRegistryProbeSession[]
): SelectorRegistryProbeSessionCluster[] => {
  const clusters = new Map<string, SelectorRegistryProbeSessionCluster>();

  for (const session of sessions) {
    const templateFingerprint =
      session.templateFingerprint ?? buildSelectorRegistryProbeTemplateFingerprint(session);
    const { host, normalizedPath, roleSignature, clusterKey } = templateFingerprint;
    const existing = clusters.get(clusterKey);

    if (existing) {
      existing.sessions.push(session);
      existing.sessionCount += 1;
      existing.suggestionCount += session.suggestionCount;
      if (session.updatedAt > existing.latestUpdatedAt) {
        existing.latestUpdatedAt = session.updatedAt;
      }
      continue;
    }

    clusters.set(clusterKey, {
      clusterKey,
      label: formatSelectorRegistryProbeTemplateLabel(templateFingerprint),
      host,
      normalizedPath,
      roleSignature,
      sessionCount: 1,
      suggestionCount: session.suggestionCount,
      latestUpdatedAt: session.updatedAt,
      sessions: [session],
    });
  }

  return Array.from(clusters.values())
    .map((cluster) => ({
      ...cluster,
      sessions: [...cluster.sessions].sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      ),
    }))
    .sort((left, right) => right.latestUpdatedAt.localeCompare(left.latestUpdatedAt));
};
