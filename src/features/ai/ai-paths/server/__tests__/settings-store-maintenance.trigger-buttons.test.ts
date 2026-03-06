import { describe, expect, it } from 'vitest';

import {
  buildAiPathsMaintenanceReport,
  runMaintenanceAction,
} from '@/features/ai/ai-paths/server/settings-store.maintenance';
import type { AiPathsSettingRecord } from '@/features/ai/ai-paths/server/settings-store.constants';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import { serializeAiTriggerButtonsRaw } from '@/features/ai/ai-paths/validations/trigger-buttons';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

const createTriggerButton = (overrides: Partial<AiTriggerButtonRecord> = {}): AiTriggerButtonRecord => ({
  id: 'btn-infer',
  name: 'Infer Params',
  iconId: null,
  pathId: 'path-stale',
  enabled: true,
  locations: ['product_modal'],
  mode: 'click',
  display: {
    label: 'Infer Params',
    showLabel: true,
  },
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
  sortIndex: 0,
  ...overrides,
});

const createPathConfigValue = (pathId: string, triggerEventId: string): string =>
  JSON.stringify({
    id: pathId,
    name: `Path ${pathId}`,
    nodes: [
      {
        id: `trigger-${pathId}`,
        type: 'trigger',
        config: {
          trigger: {
            event: triggerEventId,
          },
        },
      },
    ],
    edges: [],
  });

describe('AI Paths maintenance trigger button binding repairs', () => {
  it('surfaces a maintenance action when a trigger button points at a stale path id', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: AI_PATHS_INDEX_KEY,
        value: JSON.stringify([
          {
            id: 'path-live',
            name: 'Path Live',
            createdAt: '2026-03-06T00:00:00.000Z',
            updatedAt: '2026-03-06T00:00:00.000Z',
          },
        ]),
      },
      {
        key: `${AI_PATHS_CONFIG_KEY_PREFIX}path-live`,
        value: createPathConfigValue('path-live', 'btn-infer'),
      },
      {
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: serializeAiTriggerButtonsRaw([createTriggerButton()]),
      },
    ];

    const report = buildAiPathsMaintenanceReport(records);

    expect(report.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'repair_trigger_button_bindings',
          status: 'pending',
          affectedRecords: 1,
        }),
      ])
    );
  });

  it('rebinds stale trigger button path ids to the single matching live path', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: AI_PATHS_INDEX_KEY,
        value: JSON.stringify([
          {
            id: 'path-live',
            name: 'Path Live',
            createdAt: '2026-03-06T00:00:00.000Z',
            updatedAt: '2026-03-06T00:00:00.000Z',
          },
        ]),
      },
      {
        key: `${AI_PATHS_CONFIG_KEY_PREFIX}path-live`,
        value: createPathConfigValue('path-live', 'btn-infer'),
      },
      {
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: serializeAiTriggerButtonsRaw([createTriggerButton()]),
      },
    ];

    const result = runMaintenanceAction({
      actionId: 'repair_trigger_button_bindings',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);
    const triggerButtonsRecord = result.nextRecords.find(
      (entry) => entry.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    const parsed = triggerButtonsRecord ? JSON.parse(triggerButtonsRecord.value) : null;
    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'btn-infer',
          pathId: 'path-live',
        }),
      ])
    );
  });

  it('clears stale trigger button path ids when no live path matches the trigger event', () => {
    const records: AiPathsSettingRecord[] = [
      {
        key: AI_PATHS_INDEX_KEY,
        value: JSON.stringify([
          {
            id: 'path-live',
            name: 'Path Live',
            createdAt: '2026-03-06T00:00:00.000Z',
            updatedAt: '2026-03-06T00:00:00.000Z',
          },
        ]),
      },
      {
        key: `${AI_PATHS_CONFIG_KEY_PREFIX}path-live`,
        value: createPathConfigValue('path-live', 'different-trigger'),
      },
      {
        key: AI_PATHS_TRIGGER_BUTTONS_KEY,
        value: serializeAiTriggerButtonsRaw([createTriggerButton()]),
      },
    ];

    const result = runMaintenanceAction({
      actionId: 'repair_trigger_button_bindings',
      records,
    });

    expect(result.success).toBe(true);
    expect(result.affectedCount).toBe(1);
    const triggerButtonsRecord = result.nextRecords.find(
      (entry) => entry.key === AI_PATHS_TRIGGER_BUTTONS_KEY
    );
    const parsed = triggerButtonsRecord ? JSON.parse(triggerButtonsRecord.value) : null;
    expect(parsed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'btn-infer',
          pathId: null,
        }),
      ])
    );
  });
});
