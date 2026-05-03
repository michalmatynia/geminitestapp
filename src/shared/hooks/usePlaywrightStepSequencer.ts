import { invalidateSettingsCache } from '@/shared/api/settings-client';
import {
  PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
  PLAYWRIGHT_FLOWS_SETTINGS_KEY,
  PLAYWRIGHT_STEPS_SETTINGS_KEY,
  PLAYWRIGHT_STEP_SETS_SETTINGS_KEY,
  PLAYWRIGHT_WEBSITES_SETTINGS_KEY,
  type PlaywrightAction,
  type PlaywrightFlow,
  type PlaywrightStep,
  type PlaywrightStepSet,
  type PlaywrightWebsite,
} from '@/shared/contracts/playwright-steps';
import type { ListQuery, VoidMutation } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import {
  fetchPlaywrightActions,
  fetchPlaywrightFlows,
  fetchPlaywrightStepSets,
  fetchPlaywrightSteps,
  fetchPlaywrightWebsites,
} from '@/shared/lib/playwright/step-sequencer';
import { createListQueryV2, createUpdateMutationV2 } from '@/shared/lib/query-factories-v2';
import { playwrightKeys } from '@/shared/lib/query-key-exports';
import { serializeSetting } from '@/shared/utils/settings-json';

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export function usePlaywrightSteps(options?: { enabled?: boolean }): ListQuery<PlaywrightStep> {
  const queryKey = playwrightKeys.steps();
  return createListQueryV2({
    queryKey,
    queryFn: fetchPlaywrightSteps,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    meta: {
      source: 'shared.hooks.usePlaywrightSteps',
      operation: 'list',
      resource: 'playwright.steps',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'steps'],
      description: 'Loads playwright automation steps.',
    },
  });
}

export function useSavePlaywrightStepsMutation(): VoidMutation<{ steps: PlaywrightStep[] }> {
  const mutationKey = playwrightKeys.steps();
  return createUpdateMutationV2({
    mutationFn: async ({ steps }: { steps: PlaywrightStep[] }): Promise<void> => {
      await api.post<void>('/api/settings', {
        key: PLAYWRIGHT_STEPS_SETTINGS_KEY,
        value: serializeSetting(steps),
      });
      invalidateSettingsCache();
    },
    mutationKey,
    meta: {
      source: 'shared.hooks.useSavePlaywrightStepsMutation',
      operation: 'update',
      resource: 'playwright.steps',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'steps', 'save'],
      description: 'Persists playwright automation steps.',
    },
    invalidateKeys: [playwrightKeys.steps()],
  });
}

// ---------------------------------------------------------------------------
// Step Sets
// ---------------------------------------------------------------------------

export function usePlaywrightStepSets(options?: {
  enabled?: boolean;
}): ListQuery<PlaywrightStepSet> {
  const queryKey = playwrightKeys.stepSets();
  return createListQueryV2({
    queryKey,
    queryFn: fetchPlaywrightStepSets,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    meta: {
      source: 'shared.hooks.usePlaywrightStepSets',
      operation: 'list',
      resource: 'playwright.stepSets',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'step-sets'],
      description: 'Loads playwright step sets.',
    },
  });
}

export function useSavePlaywrightStepSetsMutation(): VoidMutation<{
  stepSets: PlaywrightStepSet[];
}> {
  const mutationKey = playwrightKeys.stepSets();
  return createUpdateMutationV2({
    mutationFn: async ({ stepSets }: { stepSets: PlaywrightStepSet[] }): Promise<void> => {
      await api.post<void>('/api/settings', {
        key: PLAYWRIGHT_STEP_SETS_SETTINGS_KEY,
        value: serializeSetting(stepSets),
      });
      invalidateSettingsCache();
    },
    mutationKey,
    meta: {
      source: 'shared.hooks.useSavePlaywrightStepSetsMutation',
      operation: 'update',
      resource: 'playwright.stepSets',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'step-sets', 'save'],
      description: 'Persists playwright step sets.',
    },
    invalidateKeys: [playwrightKeys.stepSets()],
  });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function usePlaywrightActions(options?: {
  enabled?: boolean;
}): ListQuery<PlaywrightAction> {
  const queryKey = playwrightKeys.actions();
  return createListQueryV2({
    queryKey,
    queryFn: fetchPlaywrightActions,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    meta: {
      source: 'shared.hooks.usePlaywrightActions',
      operation: 'list',
      resource: 'playwright.actions',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'actions'],
      description: 'Loads playwright constructed actions.',
    },
  });
}

export function useSavePlaywrightActionsMutation(): VoidMutation<{
  actions: PlaywrightAction[];
}> {
  const mutationKey = playwrightKeys.actions();
  return createUpdateMutationV2({
    mutationFn: async ({ actions }: { actions: PlaywrightAction[] }): Promise<void> => {
      await api.post<void>('/api/settings', {
        key: PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
        value: serializeSetting(actions),
      });
      invalidateSettingsCache();
    },
    mutationKey,
    meta: {
      source: 'shared.hooks.useSavePlaywrightActionsMutation',
      operation: 'update',
      resource: 'playwright.actions',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'actions', 'save'],
      description: 'Persists playwright constructed actions.',
    },
    invalidateKeys: [playwrightKeys.actions()],
  });
}

// ---------------------------------------------------------------------------
// Websites
// ---------------------------------------------------------------------------

export function usePlaywrightWebsites(options?: {
  enabled?: boolean;
}): ListQuery<PlaywrightWebsite> {
  const queryKey = playwrightKeys.websites();
  return createListQueryV2({
    queryKey,
    queryFn: fetchPlaywrightWebsites,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    meta: {
      source: 'shared.hooks.usePlaywrightWebsites',
      operation: 'list',
      resource: 'playwright.websites',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'websites'],
      description: 'Loads playwright website definitions.',
    },
  });
}

export function useSavePlaywrightWebsitesMutation(): VoidMutation<{
  websites: PlaywrightWebsite[];
}> {
  const mutationKey = playwrightKeys.websites();
  return createUpdateMutationV2({
    mutationFn: async ({ websites }: { websites: PlaywrightWebsite[] }): Promise<void> => {
      await api.post<void>('/api/settings', {
        key: PLAYWRIGHT_WEBSITES_SETTINGS_KEY,
        value: serializeSetting(websites),
      });
      invalidateSettingsCache();
    },
    mutationKey,
    meta: {
      source: 'shared.hooks.useSavePlaywrightWebsitesMutation',
      operation: 'update',
      resource: 'playwright.websites',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'websites', 'save'],
      description: 'Persists playwright website definitions.',
    },
    invalidateKeys: [playwrightKeys.websites()],
  });
}

// ---------------------------------------------------------------------------
// Flows
// ---------------------------------------------------------------------------

export function usePlaywrightFlows(options?: {
  enabled?: boolean;
}): ListQuery<PlaywrightFlow> {
  const queryKey = playwrightKeys.flows();
  return createListQueryV2({
    queryKey,
    queryFn: fetchPlaywrightFlows,
    ...(options?.enabled !== undefined ? { enabled: options.enabled } : {}),
    meta: {
      source: 'shared.hooks.usePlaywrightFlows',
      operation: 'list',
      resource: 'playwright.flows',
      domain: 'playwright',
      queryKey,
      tags: ['playwright', 'flows'],
      description: 'Loads playwright flow definitions.',
    },
  });
}

export function useSavePlaywrightFlowsMutation(): VoidMutation<{
  flows: PlaywrightFlow[];
}> {
  const mutationKey = playwrightKeys.flows();
  return createUpdateMutationV2({
    mutationFn: async ({ flows }: { flows: PlaywrightFlow[] }): Promise<void> => {
      await api.post<void>('/api/settings', {
        key: PLAYWRIGHT_FLOWS_SETTINGS_KEY,
        value: serializeSetting(flows),
      });
      invalidateSettingsCache();
    },
    mutationKey,
    meta: {
      source: 'shared.hooks.useSavePlaywrightFlowsMutation',
      operation: 'update',
      resource: 'playwright.flows',
      domain: 'playwright',
      mutationKey,
      tags: ['playwright', 'flows', 'save'],
      description: 'Persists playwright flow definitions.',
    },
    invalidateKeys: [playwrightKeys.flows()],
  });
}
