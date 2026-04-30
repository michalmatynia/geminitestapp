import {
  type IntegrationWithConnections,
  isBaseIntegrationSlug,
} from '@/features/integrations/product-integrations-adapter';

const collectBaseConnectionCandidate = (
  seen: Set<string>,
  candidates: string[],
  connectionId: string
): void => {
  if (connectionId === '' || seen.has(connectionId)) return;
  seen.add(connectionId);
  candidates.push(connectionId);
};

export const resolveBaseConnectionCandidates = (
  integrations: IntegrationWithConnections[] | null | undefined
): string[] => {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const integration of Array.isArray(integrations) ? integrations : []) {
    if (isBaseIntegrationSlug(integration.slug) === false) continue;
    for (const connection of integration.connections) {
      collectBaseConnectionCandidate(seen, candidates, connection.id.trim());
    }
  }

  return candidates;
};
