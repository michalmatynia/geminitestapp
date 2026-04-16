import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { normalizePlaywrightAction } from '@/shared/contracts/playwright-steps';

import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';

type RuntimeActionSeedDefinition = {
  description: string;
  name: string;
};

const SEEDED_ACTION_TIMESTAMP = '2026-04-17T00:00:00.000Z';

const RUNTIME_ACTION_SEED_DEFINITIONS: Record<ActionSequenceKey, RuntimeActionSeedDefinition> = {
  tradera_auth: {
    name: 'Tradera Auth',
    description: 'Default Tradera session validation and login recovery flow.',
  },
  tradera_quicklist_list: {
    name: 'Tradera Quicklist List',
    description: 'Default Tradera quicklist publish flow.',
  },
  tradera_quicklist_relist: {
    name: 'Tradera Quicklist Relist',
    description: 'Default Tradera relist flow.',
  },
  tradera_quicklist_sync: {
    name: 'Tradera Quicklist Sync',
    description: 'Default Tradera sync/edit flow.',
  },
  tradera_check_status: {
    name: 'Tradera Check Status',
    description: 'Default Tradera live status-check flow.',
  },
  tradera_fetch_categories: {
    name: 'Tradera Fetch Categories',
    description: 'Default Tradera public category crawl flow.',
  },
  vinted_list: {
    name: 'Vinted List',
    description: 'Default Vinted listing publish flow.',
  },
  vinted_relist: {
    name: 'Vinted Relist',
    description: 'Default Vinted relist flow.',
  },
  vinted_sync: {
    name: 'Vinted Sync',
    description: 'Default Vinted edit/sync flow.',
  },
};

const createSeedActionId = (runtimeKey: ActionSequenceKey): string =>
  `runtime_action__${runtimeKey}`;

const createSeedBlockId = (
  runtimeKey: ActionSequenceKey,
  stepId: string,
  index: number
): string => `${createSeedActionId(runtimeKey)}__runtime_step__${index}__${stepId}`;

const createSeedAction = (runtimeKey: ActionSequenceKey): PlaywrightAction => {
  const definition = RUNTIME_ACTION_SEED_DEFINITIONS[runtimeKey];

  return normalizePlaywrightAction({
    id: createSeedActionId(runtimeKey),
    name: definition.name,
    description: definition.description,
    runtimeKey,
    blocks: ACTION_SEQUENCES[runtimeKey].map((stepId, index) => ({
      id: createSeedBlockId(runtimeKey, stepId, index),
      kind: 'runtime_step',
      refId: stepId,
      enabled: true,
      label: null,
    })),
    stepSetIds: [],
    personaId: null,
    createdAt: SEEDED_ACTION_TIMESTAMP,
    updatedAt: SEEDED_ACTION_TIMESTAMP,
  });
};

export const PLAYWRIGHT_RUNTIME_ACTION_SEEDS: readonly PlaywrightAction[] = (
  Object.keys(RUNTIME_ACTION_SEED_DEFINITIONS) as ActionSequenceKey[]
).map((runtimeKey) => createSeedAction(runtimeKey));

export function mergeSeededPlaywrightActions(actions: PlaywrightAction[]): PlaywrightAction[] {
  const normalizedActions = actions.map((action) => normalizePlaywrightAction(action));
  const existingRuntimeKeys = new Set(
    normalizedActions
      .map((action) => action.runtimeKey)
      .filter((runtimeKey): runtimeKey is string => typeof runtimeKey === 'string' && runtimeKey.length > 0)
  );
  const existingIds = new Set(normalizedActions.map((action) => action.id));

  const missingSeeds = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.filter((seed) => {
    const runtimeKey = seed.runtimeKey;
    return runtimeKey === null
      ? !existingIds.has(seed.id)
      : !existingRuntimeKeys.has(runtimeKey);
  });

  return [...normalizedActions, ...missingSeeds];
}
