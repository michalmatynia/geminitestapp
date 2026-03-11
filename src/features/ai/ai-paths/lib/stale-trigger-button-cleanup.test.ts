import { describe, expect, it } from 'vitest';

import { buildStaleTriggerButtonCleanupPlan } from './stale-trigger-button-cleanup';

describe('buildStaleTriggerButtonCleanupPlan', () => {
  it('removes buttons bound to missing paths or missing config payloads', () => {
    const plan = buildStaleTriggerButtonCleanupPlan({
      triggerButtonsRaw: JSON.stringify([
        {
          id: 'btn-live',
          name: 'Live Button',
          iconId: null,
          pathId: 'path-live',
          enabled: true,
          locations: ['product_row'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
          sortIndex: 0,
        },
        {
          id: 'btn-missing-index',
          name: 'Missing Index',
          iconId: null,
          pathId: 'path-missing-index',
          enabled: true,
          locations: ['product_row'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
          sortIndex: 1,
        },
        {
          id: 'btn-missing-config',
          name: 'Missing Config',
          iconId: null,
          pathId: 'path-missing-config',
          enabled: true,
          locations: ['product_row'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
          sortIndex: 2,
        },
        {
          id: 'btn-unbound',
          name: 'Unbound Button',
          iconId: null,
          pathId: null,
          enabled: true,
          locations: ['product_modal'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
          sortIndex: 3,
        },
      ]),
      indexRaw: JSON.stringify([
        {
          id: 'path-live',
          name: 'Live Path',
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
        },
        {
          id: 'path-missing-config',
          name: 'Missing Config Path',
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
        },
      ]),
      existingSettingKeys: [
        'ai_paths_index',
        'ai_paths_trigger_buttons',
        'ai_paths_config_path-live',
      ],
    });

    expect(plan).toEqual({
      removedTriggerButtons: 2,
      staleButtonIds: ['btn-missing-index', 'btn-missing-config'],
      stalePathIds: ['path-missing-config', 'path-missing-index'],
      nextTriggerButtonsRaw: JSON.stringify([
        {
          id: 'btn-live',
          name: 'Live Button',
          iconId: null,
          pathId: 'path-live',
          enabled: true,
          locations: ['product_row'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
          sortIndex: 0,
        },
        {
          id: 'btn-unbound',
          name: 'Unbound Button',
          iconId: null,
          pathId: null,
          enabled: true,
          locations: ['product_modal'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
          sortIndex: 1,
        },
      ]),
    });
  });

  it('keeps stable payloads unchanged when every bound path is available', () => {
    const triggerButtonsRaw = JSON.stringify([
      {
        id: 'btn-live',
        name: 'Live Button',
        iconId: null,
        pathId: 'path-live',
        enabled: true,
        locations: ['product_row'],
        mode: 'click',
        display: 'icon_label',
        createdAt: '2026-03-11T00:00:00.000Z',
        updatedAt: '2026-03-11T00:00:00.000Z',
        sortIndex: 0,
      },
    ]);

    const plan = buildStaleTriggerButtonCleanupPlan({
      triggerButtonsRaw,
      indexRaw: JSON.stringify([
        {
          id: 'path-live',
          name: 'Live Path',
          createdAt: '2026-03-11T00:00:00.000Z',
          updatedAt: '2026-03-11T00:00:00.000Z',
        },
      ]),
      existingSettingKeys: [
        'ai_paths_index',
        'ai_paths_trigger_buttons',
        'ai_paths_config_path-live',
      ],
    });

    expect(plan.removedTriggerButtons).toBe(0);
    expect(plan.staleButtonIds).toEqual([]);
    expect(plan.stalePathIds).toEqual([]);
    expect(plan.nextTriggerButtonsRaw).toBe(triggerButtonsRaw);
  });
});
