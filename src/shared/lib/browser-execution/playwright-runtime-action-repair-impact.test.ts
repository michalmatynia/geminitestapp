import { describe, expect, it } from 'vitest';

import { PLAYWRIGHT_RUNTIME_ACTION_SEEDS } from './playwright-runtime-action-seeds';
import { buildPlaywrightRuntimeActionRepairImpact } from './playwright-runtime-action-repair-impact';
import {
  analyzePlaywrightRuntimeActionRepairPreview,
  selectPlaywrightRuntimeActionRepairPreview,
} from './playwright-runtime-action-repair';

describe('playwright-runtime-action-repair-impact', () => {
  it('builds grouped replacement details and draft names for a selected preview', () => {
    const listSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_list'
    );
    const syncSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_sync'
    );
    if (listSeed === undefined || syncSeed === undefined) {
      throw new Error('Missing runtime seeds');
    }

    const actions = [
      { ...listSeed, id: 'broken_list_a', name: 'Broken list A' },
      { ...syncSeed, id: 'broken_sync', name: 'Broken sync' },
      { ...listSeed, id: 'broken_list_b', name: 'Broken list B' },
    ];
    const preview = analyzePlaywrightRuntimeActionRepairPreview({
      actions,
      runtimeActionLoadErrorsById: {
        broken_list_a: 'list broken',
        broken_sync: 'sync broken',
      },
    });
    const selectedPreview = selectPlaywrightRuntimeActionRepairPreview({
      actions,
      preview,
      runtimeKeys: ['tradera_quicklist_list'],
    });

    expect(
      buildPlaywrightRuntimeActionRepairImpact({
        actions,
        preview: selectedPreview,
      })
    ).toEqual({
      groups: [
        {
          runtimeKey: 'tradera_quicklist_list',
          actions: [
            {
              actionId: 'broken_list_a',
              actionName: 'Broken list A',
              draftName: 'Broken list A (draft)',
              runtimeKey: 'tradera_quicklist_list',
            },
            {
              actionId: 'broken_list_b',
              actionName: 'Broken list B',
              draftName: 'Broken list B (draft)',
              runtimeKey: 'tradera_quicklist_list',
            },
          ],
        },
      ],
    });
  });
});
