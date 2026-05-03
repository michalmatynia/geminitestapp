'use client';

import { z } from 'zod';

import type { ListQuery, MutationResult, SingleQuery } from '@/shared/contracts/ui/queries';
import type { Integration } from '@/shared/contracts/integrations/base';
import type { ProgrammableIntegrationConnection } from '@/shared/contracts/integrations/connections';
import { integrationSchema } from '@/shared/contracts/integrations/base';
import { programmableIntegrationConnectionSchema } from '@/shared/contracts/integrations/connections';
import { api } from '@/shared/lib/api-client';
import {
  createListQueryV2,
  createMutationV2,
  createSingleQueryV2,
} from '@/shared/lib/query-factories-v2';
import { playwrightKeys } from '@/shared/lib/query-key-exports';

type UpsertPlaywrightProgrammableConnectionVariables = {
  connectionId?: string | null;
  payload: Record<string, unknown>;
};

export function usePlaywrightProgrammableIntegration(options?: {
  enabled?: boolean;
}): {
  integrationQuery: SingleQuery<Integration | null>;
  programmableIntegration: Integration | null;
} {
  const queryKey = playwrightKeys.programmableIntegration();
  const integrationQuery = createSingleQueryV2<Integration | null>({
    id: 'playwright-programmable',
    queryKey,
    queryFn: async (): Promise<Integration | null> => {
      const data = await api.get<Integration | null>('/api/playwright/programmable');
      return z.nullable(integrationSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    meta: {
      source: 'playwright.hooks.usePlaywrightProgrammableIntegration',
      operation: 'detail',
      resource: 'playwright.programmable.integration',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'programmable', 'integration'],
      description: 'Loads the programmable Playwright integration record.',
    },
  });

  return {
    integrationQuery,
    programmableIntegration: integrationQuery.data ?? null,
  };
}

export function usePlaywrightProgrammableConnections(options?: {
  enabled?: boolean;
}): ListQuery<ProgrammableIntegrationConnection> {
  const queryKey = playwrightKeys.programmableConnections();

  return createListQueryV2<ProgrammableIntegrationConnection>({
    queryKey,
    queryFn: async (): Promise<ProgrammableIntegrationConnection[]> => {
      const data = await api.get<ProgrammableIntegrationConnection[]>(
        '/api/playwright/programmable/connections'
      );
      return z.array(programmableIntegrationConnectionSchema).parse(data);
    },
    enabled: options?.enabled ?? true,
    meta: {
      source: 'playwright.hooks.usePlaywrightProgrammableConnections',
      operation: 'list',
      resource: 'playwright.programmable.connections',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'programmable', 'connections'],
      description: 'Loads programmable Playwright connections.',
    },
  });
}

export function useUpsertPlaywrightProgrammableConnection(): MutationResult<
  ProgrammableIntegrationConnection,
  UpsertPlaywrightProgrammableConnectionVariables
> {
  const mutationKey = playwrightKeys.programmableConnections();

  return createMutationV2<
    ProgrammableIntegrationConnection,
    UpsertPlaywrightProgrammableConnectionVariables
  >({
    mutationFn: async ({
      connectionId,
      payload,
    }): Promise<ProgrammableIntegrationConnection> => {
      const trimmedConnectionId = connectionId?.trim() ?? '';
      const data =
        trimmedConnectionId.length > 0
          ? await api.put<ProgrammableIntegrationConnection>(
              `/api/playwright/programmable/connections/${trimmedConnectionId}`,
              payload
            )
          : await api.post<ProgrammableIntegrationConnection>(
              '/api/playwright/programmable/connections',
              payload
            );

      return programmableIntegrationConnectionSchema.parse(data);
    },
    mutationKey,
    meta: {
      source: 'playwright.hooks.useUpsertPlaywrightProgrammableConnection',
      operation: 'action',
      resource: 'playwright.programmable.connections',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'programmable', 'connections', 'upsert'],
      description: 'Creates or updates a programmable Playwright connection.',
    },
    invalidateKeys: [
      playwrightKeys.programmableIntegration(),
      playwrightKeys.programmableConnections(),
    ],
  });
}
