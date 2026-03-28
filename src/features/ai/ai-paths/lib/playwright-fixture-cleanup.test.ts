import { describe, expect, it } from 'vitest';

import { buildPlaywrightAiPathsFixtureCleanupPlan } from './playwright-fixture-cleanup';

const TRIGGER_BUTTONS = [
  {
    id: 'btn-live',
    name: 'Live Button',
    iconId: null,
    pathId: 'path_live',
    enabled: true,
    locations: ['product_row'],
    mode: 'click',
    display: 'icon_label',
    createdAt: '2026-03-09T00:00:00.000Z',
    updatedAt: '2026-03-09T00:00:00.000Z',
    sortIndex: 0,
  },
  {
    id: 'btn-fixture',
    name: 'Fixture Button',
    iconId: null,
    pathId: 'path_pw_products_fixture',
    enabled: true,
    locations: ['product_row'],
    mode: 'click',
    display: 'icon_label',
    createdAt: '2026-03-09T00:00:00.000Z',
    updatedAt: '2026-03-09T00:00:00.000Z',
    sortIndex: 1,
  },
] as const;

const PATH_INDEX = [
  {
    id: 'path_live',
    name: 'Live Path',
    createdAt: '2026-03-09T00:00:00.000Z',
    updatedAt: '2026-03-09T00:00:00.000Z',
  },
  {
    id: 'path_pw_products_fixture',
    name: 'Fixture Path',
    createdAt: '2026-03-09T00:00:00.000Z',
    updatedAt: '2026-03-09T00:00:00.000Z',
  },
] as const;

describe('buildPlaywrightAiPathsFixtureCleanupPlan', () => {
  it('removes fixture buttons, index entries, and path configs while preserving live records', () => {
    const plan = buildPlaywrightAiPathsFixtureCleanupPlan({
      triggerButtonsRaw: JSON.stringify(TRIGGER_BUTTONS),
      indexRaw: JSON.stringify(PATH_INDEX),
    });

    expect(plan).toEqual({
      removedTriggerButtons: 1,
      removedPathIndexEntries: 1,
      removedPathConfigs: 1,
      nextTriggerButtonsRaw: JSON.stringify([TRIGGER_BUTTONS[0]]),
      nextIndexRaw: JSON.stringify([PATH_INDEX[0]]),
      pathConfigKeysToDelete: ['ai_paths_config_path_pw_products_fixture'],
    });
  });

  it('keeps empty-but-valid payloads stable when no fixtures are present', () => {
    const plan = buildPlaywrightAiPathsFixtureCleanupPlan({
      triggerButtonsRaw: '[]',
      indexRaw: '[]',
    });

    expect(plan.removedTriggerButtons).toBe(0);
    expect(plan.removedPathIndexEntries).toBe(0);
    expect(plan.removedPathConfigs).toBe(0);
    expect(plan.nextTriggerButtonsRaw).toBe('[]');
    expect(plan.nextIndexRaw).toBe('[]');
    expect(plan.pathConfigKeysToDelete).toEqual([]);
  });
});
