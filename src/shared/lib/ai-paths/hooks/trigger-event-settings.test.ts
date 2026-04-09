import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import { PATH_CONFIG_PREFIX, PATH_INDEX_KEY } from '@/shared/lib/ai-paths/core/constants';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import {
  fetchAiPathsSettingsByKeysCached,
  fetchAiPathsSettingsCached,
  updateAiPathsSetting,
  updateAiPathsSettingsBulk,
} from '@/shared/lib/ai-paths/settings-store-client';

import {
  buildSelectiveTriggerSettingsData,
  coerceSampleStateMap,
  loadPathConfigsFromSettings,
  loadTriggerSettingsData,
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
    updateAiPathsSettingsBulk: vi.fn(async (items: Array<{ key: string; value: string }>) => items),
    fetchAiPathsSettingsCached: vi.fn(async () => []),
    fetchAiPathsSettingsByKeysCached: vi.fn(async () => []),
  };
});

// ── helpers ──────────────────────────────────────────────────────────────────

const TS = '2026-03-06T00:00:00.000Z';

const makeIndex = (entries: Array<{ id: string; name: string }>) =>
  JSON.stringify(entries.map((e) => ({ ...e, createdAt: TS, updatedAt: TS, folderPath: '' })));

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

const makeBrokenLiveParameterInferenceConfig = (pathId: string): string => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId,
    seededDefault: false,
  });
  const remappedNodeIds = new Map<string, string>();
  (config.nodes ?? []).forEach((node, index) => {
    remappedNodeIds.set(node.id, `node-${index.toString(16).padStart(24, '0')}`);
  });

  return JSON.stringify({
    ...config,
    name: 'Parameter Inference v2 No Param Add',
    trigger: 'Product Modal - Infer Parameters',
    nodes: (config.nodes ?? []).map((node) => {
      const remappedId = remappedNodeIds.get(node.id) ?? node.id;
      if (node.type !== 'database') {
        return {
          ...node,
          id: remappedId,
          instanceId: remappedId,
        };
      }
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'update') {
        return {
          ...node,
          id: remappedId,
          instanceId: remappedId,
        };
      }
      return {
        ...node,
        id: remappedId,
        instanceId: remappedId,
        config: {
          ...node.config,
          database: {
            ...databaseConfig,
            updatePayloadMode: 'mapping',
            updateTemplate: '',
            mappings: [
              {
                sourcePath: 'parameters',
                sourcePort: 'value',
                targetPath: 'parameters',
              },
            ],
          },
        },
      };
    }),
    edges: (config.edges ?? []).map((edge, index) => ({
      ...edge,
      id: `edge-${index.toString(16).padStart(24, '0')}`,
      from: remappedNodeIds.get(edge.from) ?? edge.from,
      to: remappedNodeIds.get(edge.to) ?? edge.to,
    })),
    extensions: {
      aiPathsStarter: {
        starterKey: 'parameter_inference',
        templateId: 'starter_parameter_inference',
        templateVersion: 13,
        seededDefault: false,
      },
    },
  });
};

const mockedUpdateAiPathsSetting = vi.mocked(updateAiPathsSetting);
const mockedUpdateAiPathsSettingsBulk = vi.mocked(updateAiPathsSettingsBulk);
const mockedFetchByKeys = vi.mocked(fetchAiPathsSettingsByKeysCached);
const mockedFetchAll = vi.mocked(fetchAiPathsSettingsCached);

beforeEach(() => {
  mockedUpdateAiPathsSetting.mockClear();
  mockedUpdateAiPathsSettingsBulk.mockClear();
  mockedFetchByKeys.mockClear();
  mockedFetchAll.mockClear();
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

  it('skips index entries whose config payload is missing and repairs the stored index', async () => {
    const data: Array<{ key: string; value: string }> = [
      {
        key: PATH_INDEX_KEY,
        value: makeIndex([
          { id: 'path-valid', name: 'Valid' },
          { id: 'path-missing', name: 'Missing' },
        ]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}path-valid`,
        value: makeConfig('path-valid', 'Valid'),
      },
    ];
    const result = await loadPathConfigsFromSettings(data);
    const repairedIndexViaSingleWrite = mockedUpdateAiPathsSetting.mock.calls.find(
      ([key]) => key === PATH_INDEX_KEY
    )?.[1];
    const repairedIndexViaBulkWrite = mockedUpdateAiPathsSettingsBulk.mock.calls
      .flatMap(([items]) => items)
      .find((item) => item.key === PATH_INDEX_KEY)?.value;

    expect(result.settingsPathOrder).toEqual(['path-valid']);
    expect(Object.keys(result.configs)).toEqual(['path-valid']);
    expect(repairedIndexViaSingleWrite ?? repairedIndexViaBulkWrite).toBe(
      makeIndex([{ id: 'path-valid', name: 'Valid' }])
    );
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

  it('throws when a stored config contains an invalid trigger node payload', async () => {
    const pathId = 'path-invalid-trigger-node';
    const brokenConfig = {
      ...createDefaultPathConfig(pathId),
      name: 'Broken Trigger Path',
      nodes: [
        {
          id: 'node-broken-trigger',
          type: 'trigger',
        },
      ],
      edges: [],
    };
    const data: Array<{ key: string; value: string }> = [
      { key: PATH_INDEX_KEY, value: makeIndex([{ id: pathId, name: 'Broken Trigger Path' }]) },
      { key: `${PATH_CONFIG_PREFIX}${pathId}`, value: JSON.stringify(brokenConfig) },
    ];

    await expect(loadPathConfigsFromSettings(data)).rejects.toThrow(
      /invalid ai path trigger node payload/i
    );
  });

  it('recovers seeded BLWo starter defaults when the stored config payload is broken', async () => {
    const pathId = 'path_base_export_blwo_v1';
    const data: Array<{ key: string; value: string }> = [
      { key: PATH_INDEX_KEY, value: makeIndex([{ id: pathId, name: 'Base Export Workflow (BLWo)' }]) },
      {
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: JSON.stringify({
          id: pathId,
          name: 'Base Export Workflow (BLWo)',
          nodes: [{ id: 'node-broken-trigger', type: 'trigger' }],
          edges: [],
        }),
      },
    ];

    const loaded = await loadPathConfigsFromSettings(data);

    expect(loaded.settingsPathOrder).toEqual([pathId]);
    expect(loaded.configs[pathId]?.nodes.some((node) => node.type === 'trigger')).toBe(true);
    expect(mockedUpdateAiPathsSetting).toHaveBeenCalledWith(
      `${PATH_CONFIG_PREFIX}${pathId}`,
      expect.any(String)
    );
  });

  it('preserves an explicit Normalize model selection while loading stored trigger configs', async () => {
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) {
      throw new Error('Expected starter_product_name_normalize template');
    }
    const pathId = 'path_name_normalize_v1';
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId,
      seededDefault: true,
    });
    const data: Array<{ key: string; value: string }> = [
      { key: PATH_INDEX_KEY, value: makeIndex([{ id: pathId, name: config.name }]) },
      {
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: JSON.stringify({
          ...config,
          nodes: (config.nodes ?? []).map((node) => {
            if (node.id !== 'node-model-name-normalize') return node;
            return {
              ...node,
              config: {
                ...node.config,
                model: {
                  ...node.config?.model,
                  modelId: 'ollama:gemma3',
                },
              },
            };
          }),
          extensions: {
            aiPathsStarter: {
              starterKey: 'product_name_normalize',
              templateId: 'starter_product_name_normalize',
              templateVersion: 4,
              seededDefault: true,
            },
          },
        }),
      },
    ];

    const loaded = await loadPathConfigsFromSettings(data);
    const modelNode = loaded.configs[pathId]?.nodes.find(
      (node) => node.id === 'node-model-name-normalize'
    );

    expect(modelNode?.config?.model?.modelId).toBe('ollama:gemma3');
    expect(mockedUpdateAiPathsSetting).toHaveBeenCalledWith(
      `${PATH_CONFIG_PREFIX}${pathId}`,
      expect.stringContaining('"modelId":"ollama:gemma3"')
    );
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

  it('refreshes stale seeded starter workflow configs when trigger settings load them', async () => {
    const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!entry?.seedPolicy?.defaultPathId) {
      throw new Error('Missing seeded default path id for starter_parameter_inference.');
    }

    const config = JSON.parse(
      JSON.stringify(
        materializeStarterWorkflowPathConfig(entry, {
          pathId: entry.seedPolicy.defaultPathId,
          seededDefault: true,
        })
      )
    ) as ReturnType<typeof materializeStarterWorkflowPathConfig>;
    const parserNode = config.nodes.find((node) => node.title === 'JSON Parser');
    if (!parserNode?.config || !('parser' in parserNode.config)) {
      throw new Error('Expected starter parameter inference parser node.');
    }

    (parserNode.config.parser as { mappings?: Record<string, string> }).mappings = {
      ...(parserNode.config.parser as { mappings?: Record<string, string> }).mappings,
      title: '$.title',
    };
    config.extensions = {
      ...(config.extensions ?? {}),
      aiPathsStarter: {
        starterKey: entry.starterLineage.starterKey,
        templateId: entry.templateId,
        templateVersion: 12,
        seededDefault: true,
      },
    };

    const data: Array<{ key: string; value: string }> = [
      {
        key: PATH_INDEX_KEY,
        value: makeIndex([{ id: config.id, name: config.name }]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}${config.id}`,
        value: JSON.stringify(config),
      },
    ];

    const loaded = await loadPathConfigsFromSettings(data);
    const refreshedParserNode = loaded.configs[config.id]?.nodes.find(
      (node) => node.title === 'JSON Parser'
    );
    const refreshedParserConfig = JSON.stringify(refreshedParserNode?.config ?? {});

    expect(refreshedParserConfig).toContain('$.name_en');
    expect(refreshedParserConfig).not.toContain('$.title');
    expect(mockedUpdateAiPathsSetting).toHaveBeenCalledWith(
      `${PATH_CONFIG_PREFIX}${config.id}`,
      expect.any(String)
    );
  });

  it('repairs stale live parameter inference configs with legacy mapping-mode updates before trigger preflight', async () => {
    const pathId = 'path-live-parameter-inference-broken';
    const data: Array<{ key: string; value: string }> = [
      {
        key: PATH_INDEX_KEY,
        value: makeIndex([{ id: pathId, name: 'Parameter Inference v2 No Param Add' }]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: makeBrokenLiveParameterInferenceConfig(pathId),
      },
    ];

    const loaded = await loadPathConfigsFromSettings(data);
    const repairedPayload = mockedUpdateAiPathsSetting.mock.calls.find(
      ([key]) => key === `${PATH_CONFIG_PREFIX}${pathId}`
    )?.[1];

    const seedRouterNode = loaded.configs[pathId]?.nodes.find((node) => node.type === 'router');
    expect(seedRouterNode).toBeDefined();
    expect(seedRouterNode?.inputs ?? []).not.toContain('prompt');
    expect(seedRouterNode?.outputs ?? []).not.toContain('prompt');
    expect(
      loaded.configs[pathId]?.nodes.some(
        (node) =>
          node.type === 'database' &&
          node.config?.database?.operation === 'update' &&
          node.config?.database?.updatePayloadMode === 'mapping'
      )
    ).toBe(false);
    expect(typeof repairedPayload).toBe('string');
    const repairedConfig = JSON.parse(repairedPayload as string) as {
      extensions?: {
        aiPathsStarter?: {
          templateVersion?: number;
        };
      };
    };
    expect(repairedConfig.extensions?.aiPathsStarter?.templateVersion).toBe(16);
  });

  it('repairs legacy database provider aliases before trigger preflight validation', async () => {
    const pathId = 'path-legacy-trigger-provider-aliases';
    const data: Array<{ key: string; value: string }> = [
      {
        key: PATH_INDEX_KEY,
        value: makeIndex([{ id: pathId, name: 'Legacy Trigger Provider Aliases' }]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: makeConfig(pathId, 'Legacy Trigger Provider Aliases', {
          nodes: [
            {
              id: 'node-trigger',
              type: 'trigger',
              title: 'Trigger',
              description: '',
              position: { x: 0, y: 0 },
              data: {},
              inputs: [],
              outputs: ['trigger'],
              config: { trigger: { event: 'manual' } },
              createdAt: TS,
              updatedAt: null,
            },
            {
              id: 'node-database-query',
              type: 'database',
              title: 'Database Query',
              description: '',
              position: { x: 320, y: 0 },
              data: {},
              inputs: ['trigger', 'value'],
              outputs: ['result', 'bundle'],
              config: {
                database: {
                  operation: 'query',
                  query: {
                    provider: 'mongodb',
                    collection: 'products',
                    mode: 'custom',
                    preset: 'by_id',
                    field: '_id',
                    idType: 'string',
                    queryTemplate: '{"_id":"{{value}}"}',
                    limit: 20,
                    sort: '',
                    projection: '',
                    single: false,
                  },
                },
              },
              createdAt: TS,
              updatedAt: null,
            },
            {
              id: 'node-db-schema',
              type: 'db_schema',
              title: 'Database Schema',
              description: '',
              position: { x: 640, y: 0 },
              data: {},
              inputs: [],
              outputs: ['result'],
              config: {
                db_schema: {
                  provider: 'all',
                  mode: 'all',
                  collections: [],
                  includeFields: true,
                  includeRelations: true,
                  formatAs: 'text',
                },
              },
              createdAt: TS,
              updatedAt: null,
            },
          ] satisfies AiNode[],
          edges: [],
        }),
      },
    ];

    const loaded = await loadPathConfigsFromSettings(data);
    const repairedPayload = mockedUpdateAiPathsSetting.mock.calls.find(
      ([key]) => key === `${PATH_CONFIG_PREFIX}${pathId}`
    )?.[1];
    const repairedConfig = JSON.parse(repairedPayload as string) as {
      nodes?: Array<{
        id?: string;
        config?: {
          database?: {
            query?: {
              provider?: string;
            };
          };
          db_schema?: {
            provider?: string;
          };
        };
      }>;
    };

    expect(
      loaded.configs[pathId]?.nodes.find((node) => node.type === 'database')?.config?.database?.query
        ?.provider
    ).toBe('auto');
    expect(
      loaded.configs[pathId]?.nodes.find((node) => node.type === 'db_schema')?.config?.db_schema?.provider
    ).toBe('auto');
    expect(
      repairedConfig.nodes?.find((node) => node.config?.database)?.config?.database?.query?.provider
    ).toBe('auto');
    expect(
      repairedConfig.nodes?.find((node) => node.config?.db_schema)?.config?.db_schema?.provider
    ).toBe('auto');
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

  it('repairs malformed persisted runtimeState strings and persists the healed config', async () => {
    const parserDefinition = palette.find(
      (definition) => definition.type === 'parser' && definition.title === 'JSON Parser'
    );
    if (!parserDefinition?.nodeTypeId) {
      throw new Error('Expected JSON Parser node type id in palette.');
    }

    const pathId = 'path-corrupt-runtime-state';
    const data: Array<{ key: string; value: string }> = [
      {
        key: PATH_INDEX_KEY,
        value: makeIndex([{ id: pathId, name: 'Corrupt Runtime State' }]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: makeConfig(pathId, 'Corrupt Runtime State', {
          nodes: [
            {
              id: 'node-111111111111111111111111',
              instanceId: 'node-111111111111111111111111',
              nodeTypeId: parserDefinition.nodeTypeId,
              type: 'parser',
              title: 'JSON Parser',
              description: '',
              position: { x: 0, y: 0 },
              data: {},
              inputs: [],
              outputs: ['value'],
              config: {},
              createdAt: TS,
              updatedAt: null,
            },
          ] satisfies AiNode[],
          edges: [],
          runtimeState: '{"inputs":',
        }),
      },
    ];

    const loaded = await loadPathConfigsFromSettings(data);
    const repairedPayload = mockedUpdateAiPathsSetting.mock.calls.find(
      ([key]) => key === `${PATH_CONFIG_PREFIX}${pathId}`
    )?.[1];

    expect(loaded.configs[pathId]?.runtimeState).toEqual({
      inputs: {},
      outputs: {},
    });
    expect(typeof repairedPayload).toBe('string');
    const repairedConfig = JSON.parse(repairedPayload as string) as {
      runtimeState?: unknown;
    };
    expect(repairedConfig.runtimeState).toEqual({
      inputs: {},
      outputs: {},
    });
  });

  it('batches best-effort config and index repairs into a single bulk settings write', async () => {
    const pathId = 'path-corrupt-runtime-state';
    const data: Array<{ key: string; value: string }> = [
      {
        key: PATH_INDEX_KEY,
        value: makeIndex([
          { id: pathId, name: 'Corrupt Runtime State' },
          { id: 'path-missing', name: 'Missing Path' },
        ]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: makeConfig(pathId, 'Corrupt Runtime State', {
          runtimeState: '{"inputs":',
        }),
      },
    ];

    const loaded = await loadPathConfigsFromSettings(data);

    expect(loaded.settingsPathOrder).toEqual([pathId]);
    expect(mockedUpdateAiPathsSettingsBulk).toHaveBeenCalledTimes(1);
    expect(mockedUpdateAiPathsSettingsBulk).toHaveBeenCalledWith([
      {
        key: `${PATH_CONFIG_PREFIX}${pathId}`,
        value: expect.any(String),
      },
      {
        key: PATH_INDEX_KEY,
        value: makeIndex([{ id: pathId, name: 'Corrupt Runtime State' }]),
      },
    ]);
    expect(mockedUpdateAiPathsSetting).not.toHaveBeenCalledWith(
      `${PATH_CONFIG_PREFIX}${pathId}`,
      expect.any(String)
    );
    expect(mockedUpdateAiPathsSetting).not.toHaveBeenCalledWith(
      PATH_INDEX_KEY,
      expect.any(String)
    );
  });
});

// ── buildSelectiveTriggerSettingsData ─────────────────────────────────────────

describe('buildSelectiveTriggerSettingsData', () => {
  it('throws when the preferred path config record is missing', async () => {
    mockedFetchByKeys.mockResolvedValue([
      { key: PATH_INDEX_KEY, value: '[]' },
    ]);

    await expect(buildSelectiveTriggerSettingsData('path-missing')).rejects.toThrow(
      'Trigger button is bound to missing AI Path "path-missing". Update the button configuration.'
    );
  });

  it('throws when the preferred path config record has an empty value', async () => {
    mockedFetchByKeys.mockResolvedValue([
      { key: `${PATH_CONFIG_PREFIX}path-empty`, value: '' },
    ]);

    await expect(buildSelectiveTriggerSettingsData('path-empty')).rejects.toThrow(
      'Trigger button is bound to missing AI Path "path-empty". Update the button configuration.'
    );
  });

  it('returns records including a synthetic index entry containing only the preferred path', async () => {
    const configValue = makeConfig('path-sel', 'Selective Path');
    mockedFetchByKeys.mockResolvedValue([
      { key: `${PATH_CONFIG_PREFIX}path-sel`, value: configValue },
    ]);

    const records = await buildSelectiveTriggerSettingsData('path-sel');

    const indexRecord = records.find((r) => r.key === PATH_INDEX_KEY);
    expect(indexRecord).toBeDefined();
    const parsedIndex = JSON.parse(indexRecord!.value) as Array<{ id: string; name: string }>;
    expect(parsedIndex).toHaveLength(1);
    expect(parsedIndex[0]?.id).toBe('path-sel');
    expect(parsedIndex[0]?.name).toBe('Selective Path');

    const configRecord = records.find((r) => r.key === `${PATH_CONFIG_PREFIX}path-sel`);
    expect(configRecord?.value).toBe(configValue);
  });

  it('derives path name from config when available, falling back to a short id-based name', async () => {
    const malformedConfigWithNoName = JSON.stringify({ id: 'path-noname', nodes: [], edges: [] });
    mockedFetchByKeys.mockResolvedValue([
      { key: `${PATH_CONFIG_PREFIX}path-noname`, value: malformedConfigWithNoName },
    ]);

    const records = await buildSelectiveTriggerSettingsData('path-noname');
    const indexRecord = records.find((r) => r.key === PATH_INDEX_KEY);
    const parsedIndex = JSON.parse(indexRecord!.value) as Array<{ id: string; name: string }>;
    // Fallback name is based on the first 6 chars of the id
    expect(parsedIndex[0]?.name).toMatch(/path-n/);
  });
});

// ── loadTriggerSettingsData ───────────────────────────────────────────────────

describe('loadTriggerSettingsData', () => {
  it('returns mode=full using fetchAiPathsSettingsCached when no preferredPathId', async () => {
    const allSettings = settingsFor([{ id: 'path-1', name: 'Path One' }]);
    mockedFetchAll.mockResolvedValue(allSettings);

    const result = await loadTriggerSettingsData({});

    expect(result.mode).toBe('full');
    expect(mockedFetchAll).toHaveBeenCalledTimes(1);
    expect(mockedFetchByKeys).not.toHaveBeenCalled();
  });

  it('returns mode=selective when preferredPathId resolves', async () => {
    const configValue = makeConfig('path-pref', 'Preferred Path');
    mockedFetchByKeys.mockResolvedValue([
      { key: `${PATH_CONFIG_PREFIX}path-pref`, value: configValue },
    ]);

    const result = await loadTriggerSettingsData({ preferredPathId: 'path-pref' });

    expect(result.mode).toBe('selective');
    expect(mockedFetchByKeys).toHaveBeenCalledTimes(1);
    expect(mockedFetchAll).not.toHaveBeenCalled();
  });

  it('falls back to mode=full when selective load fails with a transport error', async () => {
    mockedFetchByKeys.mockRejectedValue(new Error('Selective fetch failed'));
    const allSettings = settingsFor([{ id: 'path-1', name: 'Path One' }]);
    mockedFetchAll.mockResolvedValue(allSettings);

    const result = await loadTriggerSettingsData({ preferredPathId: 'path-pref' });

    expect(result.mode).toBe('full');
    expect(mockedFetchAll).toHaveBeenCalledTimes(1);
  });

  it('does not fall back to mode=full when the preferred bound path config is missing', async () => {
    mockedFetchByKeys.mockResolvedValue([]);

    await expect(loadTriggerSettingsData({ preferredPathId: 'path-missing' })).rejects.toThrow(
      'Trigger button is bound to missing AI Path "path-missing". Update the button configuration.'
    );

    expect(mockedFetchAll).not.toHaveBeenCalled();
  });
});
