import { describe, expect, it } from 'vitest';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

import {
  buildPatchedTriggerButtonRecord,
  findTriggerButtonIndex,
  normalizeRemainingTriggerButtons,
  requireTriggerButtonId,
} from './handler.helpers';

const createButton = (overrides: Partial<AiTriggerButtonRecord> = {}): AiTriggerButtonRecord => ({
  id: 'btn-1',
  name: 'Run Path',
  iconId: null,
  pathId: null,
  enabled: true,
  locations: ['product_modal'],
  mode: 'click',
  display: {
    label: 'Run Path',
    showLabel: true,
  },
  createdAt: '2026-03-03T00:00:00.000Z',
  updatedAt: '2026-03-03T00:00:00.000Z',
  sortIndex: 0,
  ...overrides,
});

describe('ai-paths trigger-buttons [id] handler helpers', () => {
  it('requires an id and resolves the matching trigger-button index', () => {
    expect(requireTriggerButtonId('btn-1')).toBe('btn-1');
    expect(findTriggerButtonIndex([createButton()], 'btn-1')).toBe(0);
    expect(() => requireTriggerButtonId('')).toThrow('Missing trigger button id.');
    expect(() => findTriggerButtonIndex([createButton()], 'missing')).toThrow(
      'Trigger button not found.'
    );
  });

  it('builds patched trigger-button records with trimmed values and display fallback', () => {
    const record = buildPatchedTriggerButtonRecord({
      current: createButton({
        name: 'Old Name',
        display: { label: 'Old Name', showLabel: false },
      }),
      patch: {
        name: '  New Name  ',
        iconId: '  icon-run  ',
        pathId: '  path-live  ',
        enabled: false,
        display: 'icon_label',
      },
      now: '2026-03-04T00:00:00.000Z',
      nextPathId: 'path-live',
    });

    expect(record).toEqual(
      expect.objectContaining({
        name: 'New Name',
        iconId: 'icon-run',
        pathId: 'path-live',
        enabled: false,
        updatedAt: '2026-03-04T00:00:00.000Z',
        display: {
          label: 'New Name',
          showLabel: true,
        },
      })
    );
  });

  it('removes the requested record and reindexes remaining sort order', () => {
    const next = normalizeRemainingTriggerButtons(
      [createButton({ id: 'btn-1', sortIndex: 0 }), createButton({ id: 'btn-2', sortIndex: 4 })],
      'btn-1'
    );

    expect(next).toEqual([
      expect.objectContaining({
        id: 'btn-2',
        sortIndex: 0,
      }),
    ]);
  });
});
