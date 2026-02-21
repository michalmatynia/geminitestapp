import { beforeEach, describe, expect, it } from 'vitest';

import {
  buildObjectLayoutPresetOptions,
  deleteObjectLayoutCustomPreset,
  getObjectLayoutPresetById,
  getObjectLayoutPresetValuesFromOption,
  loadObjectLayoutCustomPresets,
  resolveObjectLayoutPresetId,
  resolveObjectLayoutPresetOptionValue,
  saveObjectLayoutCustomPreset,
} from '@/features/ai/image-studio/utils/object-layout-presets';

describe('object layout presets', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('resolves known preset id for exact preset values', () => {
    expect(
      resolveObjectLayoutPresetId({
        detection: 'auto',
        shadowPolicy: 'auto',
        whiteThreshold: 16,
        chromaThreshold: 10,
      })
    ).toBe('default_product');
    expect(
      resolveObjectLayoutPresetId({
        detection: 'white_bg_first_colored_pixel',
        shadowPolicy: 'include_shadow',
        whiteThreshold: 18,
        chromaThreshold: 10,
      })
    ).toBe('with_shadow');
    expect(
      resolveObjectLayoutPresetId({
        detection: 'alpha_bbox',
        shadowPolicy: 'auto',
        whiteThreshold: 16,
        chromaThreshold: 10,
      })
    ).toBe('transparent_png');
  });

  it('falls back to custom for non-matching values', () => {
    expect(
      resolveObjectLayoutPresetId({
        detection: 'white_bg_first_colored_pixel',
        shadowPolicy: 'auto',
        whiteThreshold: 19,
        chromaThreshold: 11,
      })
    ).toBe('custom');
  });

  it('returns null for custom preset lookup', () => {
    expect(getObjectLayoutPresetById('custom')).toBeNull();
  });

  it('resolves and applies matching custom preset option values', () => {
    const customPresets = [
      {
        id: 'custom_1',
        name: 'Custom 1',
        values: {
          detection: 'white_bg_first_colored_pixel' as const,
          shadowPolicy: 'auto' as const,
          whiteThreshold: 22,
          chromaThreshold: 7,
        },
        createdAt: '2026-02-20T12:00:00.000Z',
        updatedAt: '2026-02-20T12:00:00.000Z',
      },
    ];
    const optionValue = resolveObjectLayoutPresetOptionValue(customPresets[0]!.values, customPresets);
    expect(optionValue).toBe('user:custom_1');
    expect(getObjectLayoutPresetValuesFromOption(optionValue, customPresets)).toEqual(customPresets[0]!.values);  });

  it('builds options with custom presets and current custom fallback', () => {
    const options = buildObjectLayoutPresetOptions([
      {
        id: 'custom_1',
        name: 'Hero product',
        values: {
          detection: 'auto',
          shadowPolicy: 'auto',
          whiteThreshold: 16,
          chromaThreshold: 10,
        },
        createdAt: '2026-02-20T12:00:00.000Z',
        updatedAt: '2026-02-20T12:00:00.000Z',
      },
    ]);
    expect(options.some((option) => option.value === 'default_product')).toBe(true);
    expect(options.some((option) => option.value === 'user:custom_1')).toBe(true);
    expect(options.at(-1)?.value).toBe('custom');
  });

  it('persists custom presets by project and supports update/delete', () => {
    const projectId = 'Project Alpha';
    const first = saveObjectLayoutCustomPreset(projectId, {
      name: 'Packshot Balanced',
      values: {
        detection: 'auto',
        shadowPolicy: 'auto',
        whiteThreshold: 16,
        chromaThreshold: 10,
      },
    });
    expect(first.savedPreset.id).toMatch(/^preset_/);
    expect(first.presets).toHaveLength(1);

    const second = saveObjectLayoutCustomPreset(projectId, {
      presetId: first.savedPreset.id,
      name: 'Packshot Tight',
      values: {
        detection: 'white_bg_first_colored_pixel',
        shadowPolicy: 'include_shadow',
        whiteThreshold: 18,
        chromaThreshold: 10,
      },
    });
    expect(second.savedPreset.id).toBe(first.savedPreset.id);
    expect(second.savedPreset.name).toBe('Packshot Tight');
    expect(second.presets).toHaveLength(1);

    const loaded = loadObjectLayoutCustomPresets(projectId);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.name).toBe('Packshot Tight');
    expect(loaded[0]?.values).toEqual({
      detection: 'white_bg_first_colored_pixel',
      shadowPolicy: 'include_shadow',
      whiteThreshold: 18,
      chromaThreshold: 10,
    });

    const afterDelete = deleteObjectLayoutCustomPreset(projectId, first.savedPreset.id);
    expect(afterDelete).toEqual([]);
    expect(loadObjectLayoutCustomPresets(projectId)).toEqual([]);
  });
});
