import { describe, expect, it } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY } from '@/shared/lib/ai-paths/core/constants';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import {
  coerceSampleStateMap,
  loadPathConfigsFromSettings,
  resolvePreferredPathId,
  resolveRuntimeStateHint,
} from './trigger-event-settings';

// ── helpers ──────────────────────────────────────────────────────────────────

const TS = '2026-03-06T00:00:00.000Z';

const makeIndex = (entries: Array<{ id: string; name: string }>) =>
  JSON.stringify(entries.map((e) => ({ ...e, createdAt: TS, updatedAt: TS })));

const makeConfig = (id: string, name: string, extra?: Record<string, unknown>) =>
  JSON.stringify({ ...createDefaultPathConfig(id), name, ...extra });

const settingsFor = (
  paths: Array<{ id: string; name: string; extra?: Record<string, unknown> }>
): Array<{ key: string; value: string }> => [
  { key: PATH_INDEX_KEY, value: makeIndex(paths) },
  ...paths.map((p) => ({
    key: `${PATH_CONFIG_PREFIX}${p.id}`,
    value: makeConfig(p.id, p.name, p.extra),
  })),
];

// ── resolvePreferredPathId ────────────────────────────────────────────────────

describe('resolvePreferredPathId', () => {
  it('returns null for null, undefined, and empty/whitespace strings', () => {
    expect(resolvePreferredPathId(null)).toBeNull();
    expect(resolvePreferredPathId(undefined)).toBeNull();
    expect(resolvePreferredPathId('')).toBeNull();
    expect(resolvePreferredPathId('   ')).toBeNull();
  });

  it('returns the trimmed string for a valid path id', () => {
    expect(resolvePreferredPathId('path-abc')).toBe('path-abc');
    expect(resolvePreferredPathId('  path-abc  ')).toBe('path-abc');
  });
});

// ── resolveRuntimeStateHint ───────────────────────────────────────────────────

describe('resolveRuntimeStateHint', () => {
  it('returns null for null, undefined, primitives, and arrays', () => {
    expect(resolveRuntimeStateHint(null)).toBeNull();
    expect(resolveRuntimeStateHint(undefined)).toBeNull();
    expect(resolveRuntimeStateHint('string')).toBeNull();
    expect(resolveRuntimeStateHint(42)).toBeNull();
    expect(resolveRuntimeStateHint([])).toBeNull();
  });

  it('returns the object for a valid runtime state hint', () => {
    const hint = { status: 'running', progress: 0.5 };
    expect(resolveRuntimeStateHint(hint)).toBe(hint);
  });
});

// ── coerceSampleStateMap ──────────────────────────────────────────────────────

describe('coerceSampleStateMap', () => {
  it('returns null for null, undefined, primitives, and arrays', () => {
    expect(coerceSampleStateMap(null)).toBeNull();
    expect(coerceSampleStateMap(undefined)).toBeNull();
    expect(coerceSampleStateMap('string')).toBeNull();
    expect(coerceSampleStateMap([])).toBeNull();
  });

  it('returns the object for a valid map', () => {
    const map = { 'node-1': { value: 'a' } };
    expect(coerceSampleStateMap(map)).toBe(map);
  });
});

// ── loadPathConfigsFromSettings ───────────────────────────────────────────────

describe('loadPathConfigsFromSettings', () => {
  // ── happy path ────────────────────────────────────────────────────────────

  it('parses a single path config correctly', async () => {
    const { configs, settingsPathOrder } = await loadPathConfigsFromSettings(
      settingsFor([{ id: 'path-1', name: 'Path One' }])
    );
    expect(Object.keys(configs)).toHaveLength(1);
    expect(configs['path-1']?.id).toBe('path-1');
    expect(configs['path-1']?.name).toBe('Path One');
    expect(settingsPathOrder).toEqual(['path-1']);
  });

  it('parses multiple path configs preserving order', async () => {
    const { configs, settingsPathOrder } = await loadPathConfigsFromSettings(
      settingsFor([
        { id: 'path-a', name: 'Alpha' },
        { id: 'path-b', name: 'Beta' },
      ])
    );
    expect(settingsPathOrder).toEqual(['path-a', 'path-b']);
    expect(configs['path-a']?.name).toBe('Alpha');
    expect(configs['path-b']?.name).toBe('Beta');
  });

  // ── empty / missing data ──────────────────────────────────────────────────

  it('returns empty result for an empty settings array', async () => {
    const result = await loadPathConfigsFromSettings([]);
    expect(result.configs).toEqual({});
    expect(result.settingsPathOrder).toEqual([]);
  });

  it('returns empty result when PATH_INDEX_KEY is absent', async () => {
    const result = await loadPathConfigsFromSettings([{ key: 'some_other_key', value: '{}' }]);
    expect(result.configs).toEqual({});
    expect(result.settingsPathOrder).toEqual([]);
  });

  it('returns empty result when PATH_INDEX_KEY value is whitespace', async () => {
    const result = await loadPathConfigsFromSettings([{ key: PATH_INDEX_KEY, value: '   ' }]);
    expect(result.configs).toEqual({});
    expect(result.settingsPathOrder).toEqual([]);
  });

  // ── index validation errors ───────────────────────────────────────────────

  it('throws a validation error when the index is not valid JSON', async () => {
    await expect(
      loadPathConfigsFromSettings([{ key: PATH_INDEX_KEY, value: 'not-json' }])
    ).rejects.toThrow(/invalid ai paths index/i);
  });

  it('throws a validation error when the index is not an array', async () => {
    await expect(
      loadPathConfigsFromSettings([{ key: PATH_INDEX_KEY, value: '{"id":"path-1"}' }])
    ).rejects.toThrow(/invalid ai paths index/i);
  });

  it('throws when an index entry is not an object', async () => {
    await expect(
      loadPathConfigsFromSettings([{ key: PATH_INDEX_KEY, value: '["not-an-object"]' }])
    ).rejects.toThrow(/invalid ai paths index entry/i);
  });

  // ── config validation errors ──────────────────────────────────────────────

  it('throws when a config referenced by the index is missing', async () => {
    const data: Array<{ key: string; value: string }> = [
      { key: PATH_INDEX_KEY, value: makeIndex([{ id: 'path-missing', name: 'Missing' }]) },
      // intentionally no config entry
    ];
    await expect(loadPathConfigsFromSettings(data)).rejects.toThrow(/missing config payload/i);
  });

  it('throws when a config value is invalid JSON', async () => {
    const data: Array<{ key: string; value: string }> = [
      { key: PATH_INDEX_KEY, value: makeIndex([{ id: 'path-1', name: 'Path One' }]) },
      { key: `${PATH_CONFIG_PREFIX}path-1`, value: 'not-json' },
    ];
    await expect(loadPathConfigsFromSettings(data)).rejects.toThrow(
      /invalid ai path config payload/i
    );
  });

  it('throws when the config id does not match the index entry id', async () => {
    const data: Array<{ key: string; value: string }> = [
      { key: PATH_INDEX_KEY, value: makeIndex([{ id: 'path-1', name: 'Path One' }]) },
      { key: `${PATH_CONFIG_PREFIX}path-1`, value: makeConfig('path-WRONG', 'Path One') },
    ];
    await expect(loadPathConfigsFromSettings(data)).rejects.toThrow(/config id does not match/i);
  });

  it('rejects removed legacy trigger context modes in stored settings payloads', async () => {
    const config = createDefaultPathConfig('path-legacy-trigger-context');
    const seedNode = config.nodes[0] as AiNode | undefined;
    if (!seedNode) {
      throw new Error('Expected default path fixture to include at least one node.');
    }
    config.nodes = [
      {
        ...seedNode,
        type: 'trigger',
        title: 'Trigger',
        inputs: ['context'],
        outputs: ['trigger', 'context', 'entityId', 'entityType'],
        config: {
          trigger: {
            event: 'manual',
            contextMode: 'simulation_preferred',
          },
        },
      } as AiNode,
    ];
    config.edges = [];

    const data: Array<{ key: string; value: string }> = [
      { key: PATH_INDEX_KEY, value: makeIndex([{ id: config.id, name: config.name }]) },
      { key: `${PATH_CONFIG_PREFIX}${config.id}`, value: JSON.stringify(config) },
    ];

    await expect(loadPathConfigsFromSettings(data)).rejects.toThrow(
      /removed legacy trigger context/i
    );
  });

  it('derives a fallback name from the path id when both config and index names are empty', async () => {
    const data: Array<{ key: string; value: string }> = [
      {
        key: PATH_INDEX_KEY,
        value: JSON.stringify([{ id: 'path-1', name: '', createdAt: TS, updatedAt: TS }]),
      },
      { key: `${PATH_CONFIG_PREFIX}path-1`, value: makeConfig('path-1', '') },
    ];
    const { configs } = await loadPathConfigsFromSettings(data);
    // normalizeLoadedPathName generates a name from the id when both are empty
    expect(configs['path-1']?.name).toBeTruthy();
  });
});
