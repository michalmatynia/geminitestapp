'use client';

import type { MutationResult, VoidMutation } from '@/shared/contracts/ui/queries';
import { createMutationV2 } from '@/shared/lib/query-factories-v2';
import { api } from '@/shared/lib/api-client';
import { playwrightKeys } from '@/shared/lib/query-key-exports';

type PromotePlaywrightBrowserOwnershipVariables = {
  connectionId: string;
  payload: Record<string, unknown>;
};

type PromotePlaywrightBrowserOwnershipResponse = {
  connectionId: string;
  importActionId: string;
  importDraftActionName: string;
  listingActionId: string;
  listingDraftActionName: string;
};

type CleanupPlaywrightBrowserPersistenceVariables = {
  connectionId: string;
};

type CleanupAllPlaywrightBrowserPersistenceResponse = {
  cleanedCount: number;
};

type TestPlaywrightProgrammableConnectionVariables = {
  connectionId: string;
  scriptType: 'listing' | 'import';
};

export function usePromotePlaywrightBrowserOwnership(): MutationResult<
  PromotePlaywrightBrowserOwnershipResponse,
  PromotePlaywrightBrowserOwnershipVariables
> {
  const mutationKey = playwrightKeys.programmableConnections();

  return createMutationV2<
    PromotePlaywrightBrowserOwnershipResponse,
    PromotePlaywrightBrowserOwnershipVariables
  >({
    mutationFn: ({ connectionId, payload }) =>
      api.post<PromotePlaywrightBrowserOwnershipResponse>(
        `/api/playwright/programmable/connections/${connectionId}/promote-browser-ownership`,
        payload
      ),
    mutationKey,
    meta: {
      source: 'playwright.hooks.usePromotePlaywrightBrowserOwnership',
      operation: 'action',
      resource: 'playwright.programmable.browser-ownership',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'programmable', 'browser-ownership', 'promote'],
      description: 'Promotes legacy programmable browser settings into Playwright action drafts.',
    },
    invalidateKeys: [playwrightKeys.programmableConnections()],
  });
}

export function useCleanupPlaywrightBrowserPersistence(): VoidMutation<
  CleanupPlaywrightBrowserPersistenceVariables
> {
  const mutationKey = playwrightKeys.programmableConnections();

  return createMutationV2<void, CleanupPlaywrightBrowserPersistenceVariables>({
    mutationFn: ({ connectionId }) =>
      api.post(
        `/api/playwright/programmable/connections/${connectionId}/cleanup-browser-persistence`,
        {}
      ),
    mutationKey,
    meta: {
      source: 'playwright.hooks.useCleanupPlaywrightBrowserPersistence',
      operation: 'action',
      resource: 'playwright.programmable.browser-persistence',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'programmable', 'browser-persistence', 'cleanup'],
      description: 'Clears stored legacy programmable browser fields for one connection.',
    },
    invalidateKeys: [playwrightKeys.programmableConnections()],
  });
}

export function useCleanupAllPlaywrightBrowserPersistence(): MutationResult<
  CleanupAllPlaywrightBrowserPersistenceResponse,
  void
> {
  const mutationKey = playwrightKeys.programmableConnections();

  return createMutationV2<CleanupAllPlaywrightBrowserPersistenceResponse, void>({
    mutationFn: () =>
      api.post<CleanupAllPlaywrightBrowserPersistenceResponse>(
        '/api/playwright/programmable/connections/cleanup-browser-persistence',
        {}
      ),
    mutationKey,
    meta: {
      source: 'playwright.hooks.useCleanupAllPlaywrightBrowserPersistence',
      operation: 'action',
      resource: 'playwright.programmable.browser-persistence.bulk',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'programmable', 'browser-persistence', 'cleanup', 'bulk'],
      description: 'Clears stored legacy programmable browser fields for all safe connections.',
    },
    invalidateKeys: [playwrightKeys.programmableConnections()],
  });
}

export function useTestPlaywrightProgrammableConnection(): MutationResult<
  Record<string, unknown>,
  TestPlaywrightProgrammableConnectionVariables
> {
  const mutationKey = playwrightKeys.programmableConnections();

  return createMutationV2<Record<string, unknown>, TestPlaywrightProgrammableConnectionVariables>({
    mutationFn: ({ connectionId, scriptType }) =>
      api.post<Record<string, unknown>>('/api/playwright/programmable/test', {
        connectionId,
        scriptType,
      }),
    mutationKey,
    meta: {
      source: 'playwright.hooks.useTestPlaywrightProgrammableConnection',
      operation: 'action',
      resource: 'playwright.programmable.test',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'programmable', 'test'],
      description: 'Runs a programmable Playwright listing or import test.',
    },
  });
}
