import { describe, expect, it } from 'vitest';

import {
  analyzeLoadedPlaywrightActions,
  parseAndValidatePlaywrightActionsSettingValue,
} from './playwright-actions-settings-validation';
import { PLAYWRIGHT_RUNTIME_ACTION_SEEDS } from './playwright-runtime-action-seeds';
import { defaultPlaywrightActionExecutionSettings } from '@/shared/contracts/playwright-steps';

describe('playwright-actions-settings-validation', () => {
  it('normalizes valid actions into canonical JSON', () => {
    const result = parseAndValidatePlaywrightActionsSettingValue(JSON.stringify([
      {
        id: 'legacy_action',
        name: 'Legacy action',
        description: null,
        runtimeKey: null,
        blocks: [],
        stepSetIds: ['step_set_1'],
        personaId: null,
        createdAt: '2026-04-17T00:00:00.000Z',
        updatedAt: '2026-04-17T00:00:00.000Z',
      },
    ]));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.actions[0]?.blocks).toEqual([
      {
        id: 'legacy_action__step_set__0',
        kind: 'step_set',
        refId: 'step_set_1',
        enabled: true,
        label: null,
        config: {
          viewportWidth: null,
          viewportHeight: null,
          settleDelayMs: null,
          locale: null,
          timezoneId: null,
          userAgent: null,
          colorScheme: null,
          reducedMotion: null,
          geolocationLatitude: null,
          geolocationLongitude: null,
          permissions: [],
        },
      },
    ]);
    expect(result.actions[0]?.executionSettings).toEqual(defaultPlaywrightActionExecutionSettings);
    expect(JSON.parse(result.value)).toEqual(result.actions);
  });

  it('rejects non-array payloads', () => {
    expect(parseAndValidatePlaywrightActionsSettingValue('{}')).toEqual({
      ok: false,
      error: 'playwright_actions must be a JSON array.',
    });
  });

  it('rejects unknown runtime keys', () => {
    const result = parseAndValidatePlaywrightActionsSettingValue(JSON.stringify([
      {
        ...PLAYWRIGHT_RUNTIME_ACTION_SEEDS[0],
        runtimeKey: 'unknown_runtime_key',
      },
    ]));

    expect(result).toEqual({
      ok: false,
      error: 'playwright_actions contains an unknown runtimeKey: unknown_runtime_key.',
    });
  });

  it('rejects duplicate runtime keys', () => {
    const seed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_list'
    );
    if (seed === undefined) {
      throw new Error('Missing tradera_quicklist_list seed');
    }

    const result = parseAndValidatePlaywrightActionsSettingValue(JSON.stringify([
      seed,
      {
        ...seed,
        id: 'duplicate_runtime_action',
        name: 'Duplicate runtime action',
      },
    ]));

    expect(result).toEqual({
      ok: false,
      error: 'playwright_actions cannot define runtimeKey "tradera_quicklist_list" more than once.',
    });
  });

  it('rejects invalid runtime manifests', () => {
    const seed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_list'
    );
    if (seed === undefined) {
      throw new Error('Missing tradera_quicklist_list seed');
    }

    const result = parseAndValidatePlaywrightActionsSettingValue(JSON.stringify([
      {
        ...seed,
        blocks: seed.blocks.filter((block) => block.refId !== 'publish_verify'),
      },
    ]));

    expect(result).toEqual({
      ok: false,
      error: 'Runtime action "tradera_quicklist_list" must include publish and publish_verify.',
    });
  });

  it('marks duplicate and invalid runtime actions during load analysis', () => {
    const listSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_list'
    );
    const syncSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_sync'
    );
    if (listSeed === undefined || syncSeed === undefined) {
      throw new Error('Missing required runtime seeds');
    }

    const analysis = analyzeLoadedPlaywrightActions([
      listSeed,
      {
        ...listSeed,
        id: 'duplicate_runtime_action',
        name: 'Duplicate runtime action',
      },
      {
        ...syncSeed,
        id: 'invalid_sync_action',
        blocks: syncSeed.blocks.filter((block) => block.refId !== 'sync_check'),
      },
    ]);

    expect(analysis.runtimeActionErrorsById).toEqual({
      runtime_action__tradera_quicklist_list:
        'playwright_actions cannot define runtimeKey "tradera_quicklist_list" more than once.',
      duplicate_runtime_action:
        'playwright_actions cannot define runtimeKey "tradera_quicklist_list" more than once.',
      invalid_sync_action:
        'Runtime action "tradera_quicklist_sync" must include sync_check.',
    });
  });
});
