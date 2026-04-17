import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import {
  defaultPlaywrightActionBlockConfig,
  defaultPlaywrightActionExecutionSettings,
  normalizePlaywrightAction,
} from '@/shared/contracts/playwright-steps';

import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';
import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_NAME,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_NAME,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_LEGACY_RUNTIME_NAME,
} from './amazon-runtime-constants';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY } from './supplier-1688-runtime-constants';

type RuntimeActionSeedDefinition = {
  description: string;
  name: string;
};

const SEEDED_ACTION_TIMESTAMP = '2026-04-17T00:00:00.000Z';

const RUNTIME_ACTION_SEED_DEFINITIONS: Record<ActionSequenceKey, RuntimeActionSeedDefinition> = {
  playwright_programmable_listing: {
    name: 'Programmable Listing Session',
    description:
      'Default programmable listing browser-session profile. Owns execution settings and browser_preparation for programmable listing scripts.',
  },
  playwright_programmable_import: {
    name: 'Programmable Import Session',
    description:
      'Default programmable import browser-session profile. Owns execution settings and browser_preparation for programmable import scripts.',
  },
  tradera_auth: {
    name: 'Tradera Auth',
    description: 'Default Tradera session validation and login recovery flow.',
  },
  tradera_standard_list: {
    name: 'Tradera Standard List',
    description: 'Default Tradera standard browser listing flow.',
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
  [AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY]: {
    name: AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_NAME,
    description:
      'Runs Google Lens, collects Amazon matches, probes retained candidates for preview data, and stops for manual candidate selection.',
  },
  [AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY]: {
    name: AMAZON_CANDIDATE_EXTRACTION_RUNTIME_NAME,
    description:
      'Starts from a selected Amazon candidate and performs probe, extraction, evaluation, and ASIN update.',
  },
  [AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY]: {
    name: AMAZON_REVERSE_IMAGE_SCAN_LEGACY_RUNTIME_NAME,
    description:
      'Legacy compatibility runtime covering Google Lens candidate discovery, Amazon extraction, evaluation, follow-up queueing, and ASIN update in one action.',
  },
  [SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY]: {
    name: '1688 Supplier Probe Scan',
    description: 'Default 1688 supplier reverse-image probe scan flow.',
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
      config: defaultPlaywrightActionBlockConfig,
    })),
    stepSetIds: [],
    personaId: null,
    executionSettings: defaultPlaywrightActionExecutionSettings,
    createdAt: SEEDED_ACTION_TIMESTAMP,
    updatedAt: SEEDED_ACTION_TIMESTAMP,
  });
};

export const PLAYWRIGHT_RUNTIME_ACTION_SEEDS: readonly PlaywrightAction[] = (
  Object.keys(RUNTIME_ACTION_SEED_DEFINITIONS) as ActionSequenceKey[]
).map((runtimeKey) => createSeedAction(runtimeKey));

export function getPlaywrightRuntimeActionSeed(
  runtimeKey: ActionSequenceKey
): PlaywrightAction | null {
  const seed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find((action) => action.runtimeKey === runtimeKey);
  if (seed === undefined) {
    return null;
  }

  return normalizePlaywrightAction({
    ...seed,
    blocks: seed.blocks.map((block) => ({ ...block })),
  });
}

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
