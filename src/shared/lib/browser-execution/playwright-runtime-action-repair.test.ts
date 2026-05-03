import { describe, expect, it } from 'vitest';

import { PLAYWRIGHT_RUNTIME_ACTION_SEEDS } from './playwright-runtime-action-seeds';
import {
  analyzePlaywrightRuntimeActionRepairPreview,
  repairPlaywrightRuntimeAction,
  repairPlaywrightRuntimeActionsBulk,
  selectPlaywrightRuntimeActionRepairPreview,
} from './playwright-runtime-action-repair';

describe('playwright-runtime-action-repair', () => {
  it('replaces all actions for a runtime key with the seeded action on reset', () => {
    const listSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_list'
    );
    const syncSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_sync'
    );
    if (listSeed === undefined || syncSeed === undefined) {
      throw new Error('Missing runtime seeds');
    }

    const result = repairPlaywrightRuntimeAction({
      actions: [
        { ...syncSeed },
        { ...listSeed, id: 'invalid_list_a', name: 'Invalid list A' },
        { ...listSeed, id: 'invalid_list_b', name: 'Invalid list B' },
      ],
      targetActionId: 'invalid_list_b',
      mode: 'reset_to_seed',
      nowIso: '2026-04-17T12:00:00.000Z',
      createId: () => 'unused',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.result.replacedActionIds).toEqual(['invalid_list_a', 'invalid_list_b']);
    expect(result.result.clonedDraftAction).toBeNull();
    expect(
      result.result.actions.filter((action) => action.runtimeKey === 'tradera_quicklist_list')
    ).toHaveLength(1);
    expect(result.result.actions[1]?.id).toBe('runtime_action__tradera_quicklist_list');
  });

  it('clones the broken manifest into a non-runtime draft and restores the seed', () => {
    const listSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_list'
    );
    if (listSeed === undefined) {
      throw new Error('Missing tradera_quicklist_list seed');
    }

    let idCounter = 0;
    const createId = (): string => {
      idCounter += 1;
      return `generated_${idCounter}`;
    };

    const brokenAction = {
      ...listSeed,
      id: 'broken_list_action',
      name: 'Broken list action',
      blocks: listSeed.blocks.filter((block) => block.refId !== 'publish_verify'),
    };

    const result = repairPlaywrightRuntimeAction({
      actions: [brokenAction],
      targetActionId: 'broken_list_action',
      mode: 'clone_to_draft_and_restore',
      nowIso: '2026-04-17T12:00:00.000Z',
      createId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.result.actions).toHaveLength(2);
    expect(result.result.actions[0]?.id).toBe('runtime_action__tradera_quicklist_list');
    expect(result.result.clonedDraftAction).toEqual(
      expect.objectContaining({
        id: 'generated_1',
        runtimeKey: null,
        name: 'Broken list action (draft)',
        createdAt: '2026-04-17T12:00:00.000Z',
        updatedAt: '2026-04-17T12:00:00.000Z',
      })
    );
    expect(result.result.actions[1]).toEqual(result.result.clonedDraftAction);
    expect(result.result.clonedDraftAction?.blocks[0]?.id).toBe('generated_2');
  });

  it('rejects repair attempts for non-runtime actions', () => {
    const result = repairPlaywrightRuntimeAction({
      actions: [
        {
          id: 'manual_action',
          name: 'Manual action',
          description: null,
          runtimeKey: null,
          blocks: [],
          stepSetIds: [],
          personaId: null,
          createdAt: '2026-04-17T12:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
        },
      ],
      targetActionId: 'manual_action',
      mode: 'reset_to_seed',
      nowIso: '2026-04-17T12:00:00.000Z',
      createId: () => 'unused',
    });

    expect(result).toEqual({
      ok: false,
      error: 'Selected action is not a seeded runtime action.',
    });
  });

  it('repairs multiple runtime keys to their seeds in one pass', () => {
    const listSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_list'
    );
    const syncSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_sync'
    );
    if (listSeed === undefined || syncSeed === undefined) {
      throw new Error('Missing runtime seeds');
    }

    const result = repairPlaywrightRuntimeActionsBulk({
      actions: [
        { ...listSeed, id: 'broken_list_a', name: 'Broken list A' },
        { ...syncSeed, id: 'broken_sync_a', name: 'Broken sync A' },
        { ...listSeed, id: 'broken_list_b', name: 'Broken list B' },
        {
          id: 'manual_action',
          name: 'Manual action',
          description: null,
          runtimeKey: null,
          blocks: [],
          stepSetIds: [],
          personaId: null,
          createdAt: '2026-04-17T12:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
        },
      ],
      targetActionIds: ['broken_list_a', 'broken_sync_a'],
      mode: 'reset_to_seed',
      nowIso: '2026-04-17T12:00:00.000Z',
      createId: () => 'unused',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.result.repairedRuntimeKeys).toEqual([
      'tradera_quicklist_list',
      'tradera_quicklist_sync',
    ]);
    expect(result.result.replacedActionIds).toEqual([
      'broken_list_a',
      'broken_sync_a',
      'broken_list_b',
    ]);
    expect(result.result.clonedDraftActions).toEqual([]);
    expect(result.result.actions.map((action) => action.id)).toEqual([
      'runtime_action__tradera_quicklist_list',
      'runtime_action__tradera_quicklist_sync',
      'manual_action',
    ]);
  });

  it('clones every replaced runtime action into drafts during bulk repair', () => {
    const listSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_list'
    );
    if (listSeed === undefined) {
      throw new Error('Missing tradera_quicklist_list seed');
    }

    let idCounter = 0;
    const createId = (): string => {
      idCounter += 1;
      return `generated_${idCounter}`;
    };

    const brokenListA = {
      ...listSeed,
      id: 'broken_list_a',
      name: 'Broken list A',
      blocks: listSeed.blocks.filter((block) => block.refId !== 'publish'),
    };
    const brokenListB = {
      ...listSeed,
      id: 'broken_list_b',
      name: 'Broken list B',
      blocks: listSeed.blocks.filter((block) => block.refId !== 'publish_verify'),
    };

    const result = repairPlaywrightRuntimeActionsBulk({
      actions: [brokenListA, brokenListB],
      targetActionIds: ['broken_list_a'],
      mode: 'clone_to_draft_and_restore',
      nowIso: '2026-04-17T12:00:00.000Z',
      createId,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.error);
    }

    expect(result.result.repairedRuntimeKeys).toEqual(['tradera_quicklist_list']);
    expect(result.result.replacedActionIds).toEqual(['broken_list_a', 'broken_list_b']);
    expect(result.result.actions[0]?.id).toBe('runtime_action__tradera_quicklist_list');
    expect(result.result.clonedDraftActions).toHaveLength(2);
    expect(result.result.clonedDraftActions.map((entry) => entry.sourceActionId)).toEqual([
      'broken_list_a',
      'broken_list_b',
    ]);
    expect(result.result.clonedDraftActions[0]?.action).toEqual(
      expect.objectContaining({
        id: 'generated_1',
        runtimeKey: null,
        name: 'Broken list A (draft)',
      })
    );
    expect(result.result.clonedDraftActions[1]?.action).toEqual(
      expect.objectContaining({
        runtimeKey: null,
        name: 'Broken list B (draft)',
      })
    );
    expect(result.result.actions.slice(1)).toEqual(
      result.result.clonedDraftActions.map((entry) => entry.action)
    );
  });

  it('rejects bulk repair when no seeded runtime actions are selected', () => {
    const result = repairPlaywrightRuntimeActionsBulk({
      actions: [
        {
          id: 'manual_action',
          name: 'Manual action',
          description: null,
          runtimeKey: null,
          blocks: [],
          stepSetIds: [],
          personaId: null,
          createdAt: '2026-04-17T12:00:00.000Z',
          updatedAt: '2026-04-17T12:00:00.000Z',
        },
      ],
      targetActionIds: ['manual_action'],
      mode: 'reset_to_seed',
      nowIso: '2026-04-17T12:00:00.000Z',
      createId: () => 'unused',
    });

    expect(result).toEqual({
      ok: false,
      error: 'No seeded runtime actions selected for repair.',
    });
  });

  it('builds a repair preview for grouped runtime replacements', () => {
    const listSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_list'
    );
    const syncSeed = PLAYWRIGHT_RUNTIME_ACTION_SEEDS.find(
      (action) => action.runtimeKey === 'tradera_quicklist_sync'
    );
    if (listSeed === undefined || syncSeed === undefined) {
      throw new Error('Missing runtime seeds');
    }

    const preview = analyzePlaywrightRuntimeActionRepairPreview({
      actions: [
        { ...listSeed, id: 'broken_list_a', name: 'Broken list A' },
        { ...listSeed, id: 'broken_list_b', name: 'Broken list B' },
        { ...syncSeed, id: 'broken_sync', name: 'Broken sync' },
        {
          ...listSeed,
          id: 'unknown_runtime',
          runtimeKey: 'unknown_runtime_key',
        },
      ],
      runtimeActionLoadErrorsById: {
        broken_list_a: 'list broken',
        broken_sync: 'sync broken',
        unknown_runtime: 'unknown runtime key',
      },
    });

    expect(preview).toEqual({
      nonRepairableQuarantinedActionIds: ['unknown_runtime'],
      repairableActionIds: ['broken_list_a', 'broken_sync'],
      repairedRuntimeKeys: ['tradera_quicklist_list', 'tradera_quicklist_sync'],
      replacedActionIds: ['broken_list_a', 'broken_list_b', 'broken_sync'],
    });
  });

  it('filters the repair preview to selected runtime keys', () => {
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
      { ...listSeed, id: 'broken_list_b', name: 'Broken list B' },
      { ...syncSeed, id: 'broken_sync', name: 'Broken sync' },
      { ...listSeed, id: 'manual_unknown', runtimeKey: 'unknown_runtime_key' },
    ];
    const preview = analyzePlaywrightRuntimeActionRepairPreview({
      actions,
      runtimeActionLoadErrorsById: {
        broken_list_a: 'list broken',
        broken_sync: 'sync broken',
        manual_unknown: 'unknown runtime key',
      },
    });

    expect(
      selectPlaywrightRuntimeActionRepairPreview({
        actions,
        preview,
        runtimeKeys: ['tradera_quicklist_sync'],
      })
    ).toEqual({
      nonRepairableQuarantinedActionIds: ['manual_unknown'],
      repairableActionIds: ['broken_sync'],
      repairedRuntimeKeys: ['tradera_quicklist_sync'],
      replacedActionIds: ['broken_sync'],
    });
  });
});
