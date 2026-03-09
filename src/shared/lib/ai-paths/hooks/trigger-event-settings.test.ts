import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY } from '@/shared/lib/ai-paths/core/constants';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { updateAiPathsSetting } from '@/shared/lib/ai-paths/settings-store-client';

import {
  coerceSampleStateMap,
  loadPathConfigsFromSettings,
  resolvePreferredPathId,
  resolveRuntimeStateHint,
} from './trigger-event-settings';

vi.mock('@/shared/lib/ai-paths/settings-store-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/shared/lib/ai-paths/settings-store-client')
  >('@/shared/lib/ai-paths/settings-store-client');
  return {
    ...actual,
    updateAiPathsSetting: vi.fn(async (key: string, value: string) => ({ key, value })),
  };
});

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

const mockedUpdateAiPathsSetting = vi.mocked(updateAiPathsSetting);

beforeEach(() => {
  mockedUpdateAiPathsSetting.mockClear();
});

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

  it('loads partial stored configs without inheriting stale default node references', async () => {
    const pathId = 'path-partial-stored-trigger';
    const data: Array<{ key: string; value: string }> = [
      { key: PATH_INDEX_KEY, value: makeIndex([{ id: pathId, name: 'Partial Trigger Path' }]) },
      {
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: JSON.stringify({
          id: pathId,
          name: 'Partial Trigger Path',
          isActive: true,
          strictFlowMode: true,
          aiPathsValidation: { enabled: false },
          nodes: [
            {
              id: 'node-111111111111111111111111',
              instanceId: 'node-111111111111111111111111',
              nodeTypeId: 'nt-111111111111111111111111',
              type: 'trigger',
              title: 'Trigger',
              description: 'Partial trigger payload',
              position: { x: 120, y: 120 },
              inputs: [],
              outputs: ['trigger'],
              createdAt: TS,
              updatedAt: TS,
            },
          ],
          edges: [],
          updatedAt: TS,
        }),
      },
    ];

    const loaded = await loadPathConfigsFromSettings(data);
    expect(loaded.configs[pathId]?.nodes).toHaveLength(1);
    expect(loaded.configs[pathId]?.uiState?.selectedNodeId ?? null).toBeNull();
    expect(loaded.configs[pathId]?.nodes[0]?.config?.trigger?.event).toBe('manual');
  });

  it('remediates removed legacy trigger context modes in stored settings payloads', async () => {
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

    const loaded = await loadPathConfigsFromSettings(data);
    expect(loaded.configs[config.id]?.nodes[0]?.config?.trigger?.contextMode).toBe('trigger_only');
    expect(mockedUpdateAiPathsSetting).toHaveBeenCalledWith(
      `${PATH_CONFIG_PREFIX}${config.id}`,
      expect.any(String)
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
