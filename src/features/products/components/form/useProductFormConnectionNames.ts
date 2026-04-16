'use client';

import { useMemo } from 'react';
import { useIntegrationsWithConnections } from '@/shared/hooks/useIntegrationQueries';

export function useProductFormConnectionNames(): Map<string, string> {
  const query = useIntegrationsWithConnections();
  const integrationData = query.data;

  return useMemo((): Map<string, string> => {
    const names = new Map<string, string>();
    if (integrationData === undefined) return names;

    integrationData.forEach((integration) => {
      integration.connections.forEach((connection) => {
        const id = connection.id.trim();
        const name = connection.name.trim();
        if (id === '' || name === '' || names.has(id)) return;
        names.set(id, name);
      });
    });

    return names;
  }, [integrationData]);
}
