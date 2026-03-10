import { describe, expect, it } from 'vitest';

import type { PathConfig } from '@/shared/contracts/ai-paths';
import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
  upgradeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import {
  buildPathConfigFromTemplate,
  PATH_TEMPLATES,
} from '@/shared/lib/ai-paths/core/utils/path-templates';

const buildLegacyTranslationPathConfig = (args?: {
  includeParamsRegex?: boolean;
  paramsEdgeToPort?: 'value' | 'result';
}): PathConfig =>
  ({
    id: 'path_translation_v2',
    version: 1,
    name: 'Translation EN->PL Description + Parameters v2',
    description: '',
    trigger: 'manual',
    updatedAt: '2026-03-03T10:00:00.000Z',
    nodes: [
      {
        id: 'node-regex-translate-en-pl',
        type: 'regex',
        title: 'Regex JSON Extract',
        description: '',
        position: { x: 0, y: 0 },
        data: {},
        inputs: ['value', 'prompt', 'regexCallback'],
        outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      },
      ...(args?.includeParamsRegex
        ? [
            {
              id: 'node-regex-params-translate-en-pl',
              type: 'regex',
              title: 'Regex Params',
              description: '',
              position: { x: 0, y: 160 },
              data: {},
              inputs: ['value', 'prompt', 'regexCallback'],
              outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
            },
          ]
        : []),
      {
        id: 'node-db-update-translate-en-pl',
        type: 'database',
        title: 'Database Query',
        description: '',
        position: { x: 320, y: 0 },
        data: {},
        inputs: ['entityId', 'entityType', 'value', 'result', 'bundle'],
        outputs: ['result', 'bundle'],
        config: {
          database: {
            operation: 'update',
            entityType: 'product',
            updatePayloadMode: 'mapping',
            updateTemplate: '',
            query: {
              provider: 'auto',
              collection: 'products',
              mode: 'custom',
              preset: 'by_id',
              field: 'id',
              idType: 'string',
              queryTemplate: '{"id":"{{entityId}}"}',
              limit: 1,
              sort: '',
              projection: '',
              single: true,
            },
            mappings: [
              {
                sourcePath: 'description_pl',
                sourcePort: 'value',
                targetPath: 'description_pl',
              },
              {
                sourcePath: 'parameters',
                sourcePort: 'value',
                targetPath: 'parameters',
              },
            ],
          },
        },
      },
    ],
    edges: [
      {
        id: 'edge-description',
        from: 'node-regex-translate-en-pl',
        to: 'node-db-update-translate-en-pl',
        fromPort: 'value',
        toPort: 'value',
      },
      ...(args?.includeParamsRegex
        ? [
            {
              id: 'edge-params',
              from: 'node-regex-params-translate-en-pl',
              to: 'node-db-update-translate-en-pl',
              fromPort: 'value',
              toPort: args?.paramsEdgeToPort ?? 'value',
            },
          ]
        : []),
    ],
  }) as PathConfig;

const buildStaleLiveTranslationPathConfig = (): PathConfig => {
  const entry = getStarterWorkflowTemplateById('starter_translation_en_pl');
  if (!entry) throw new Error('Missing starter_translation_en_pl entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path_translation_en_pl_v2_live',
    seededDefault: false,
  });

  return {
    ...config,
    name: 'Translation EN->PL Description + Parameters v2',
    trigger: 'Product Modal - Translate EN->PL (Desc+Params)',
    extensions: undefined,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type !== 'database') return node;
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'update') return node;
      return {
        ...node,
        config: {
          ...node.config,
          database: {
            ...databaseConfig,
            updatePayloadMode: 'custom',
            updateTemplate:
              '{\n  "$set": {\n    "description_pl": "{{value.description_pl}}",\n    "parameters": {{result.parameters}}\n  },\n  "$unset": {\n    "__noop__": ""\n  }\n}',
            mappings: [
              {
                targetPath: 'description_pl',
                sourcePort: 'value',
                sourcePath: 'description_pl',
              },
              {
                targetPath: 'parameters',
                sourcePort: 'result',
                sourcePath: 'parameters',
              },
            ],
          },
        },
      };
    }),
  } as PathConfig;
};

const buildStaleLiveParameterInferencePathConfig = (): PathConfig => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path_parameter_inference_v2_live',
    seededDefault: false,
  });

  return {
    ...config,
    name: 'Parameter Inference v2 No Param Add',
    trigger: 'Product Modal - Infer Parameters',
    extensions: undefined,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type === 'router' && node.id === 'node-router-seed-params') {
        return {
          ...node,
          inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
          outputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        };
      }
      if (node.type === 'parser') {
        return {
          ...node,
          config: {
            ...node.config,
            parser: {
              ...node.config?.parser,
              mappings: {
                ...(node.config?.parser?.mappings ?? {}),
                title: '',
                content_en: '',
              },
            },
          },
        };
      }
      if (node.type === 'database') {
        const databaseConfig = node.config?.database;
        if (databaseConfig?.operation !== 'query') return node;
        return {
          ...node,
          config: {
            ...node.config,
            database: {
              ...databaseConfig,
              query: {
                ...databaseConfig.query,
                queryTemplate: '{\n  "catalogId": "{{bundle.catalogId}}"\n}',
              },
            },
          },
        };
      }
      return node;
    }),
  } as PathConfig;
};

const buildProvenanceOnlyStaleParameterInferencePathConfig = (): PathConfig => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path_parameter_inference_v2_provenance_only',
    seededDefault: false,
  });

  return {
    ...config,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type === 'router' && node.id === 'node-router-seed-params') {
        return {
          ...node,
          inputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
          outputs: ['context', 'bundle', 'prompt', 'result', 'value', 'valid', 'errors'],
        };
      }
      return node;
    }),
    extensions: {
      aiPathsStarter: {
        starterKey: 'parameter_inference',
        templateId: 'starter_parameter_inference',
        templateVersion: 13,
        seededDefault: false,
      },
    },
  } as PathConfig;
};

const buildMappingModeLegacyParameterInferencePathConfig = (): PathConfig => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path_parameter_inference_v2_randomized_live',
    seededDefault: false,
  });

  const remappedNodeIds = new Map<string, string>();
  (config.nodes ?? []).forEach((node, index) => {
    remappedNodeIds.set(node.id, `node-${index.toString(16).padStart(24, '0')}`);
  });

  const remappedNodes = (config.nodes ?? []).map((node) => {
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
  });

  if (!remappedNodes.some((node) => node.type === 'database' && node.config?.database?.operation === 'update')) {
    throw new Error('Expected starter_parameter_inference to include a database update node.');
  }

  return {
    ...config,
    name: 'Parameter Inference v2 No Param Add',
    trigger: 'Product Modal - Infer Parameters',
    nodes: remappedNodes,
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
  } as PathConfig;
};

const buildCustomModeRandomIdParameterInferencePathConfig = (): PathConfig => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path_3wejpy',
    seededDefault: false,
  });

  const remappedNodeIds = new Map<string, string>();
  (config.nodes ?? []).forEach((node) => {
    // Simulate random MongoDB ObjectId-style IDs (24 hex chars)
    const seed = node.id.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
    remappedNodeIds.set(node.id, `node-${seed.toString(16).padStart(8, '0')}c527e33afe5155aa8d`);
  });

  const remappedNodes = (config.nodes ?? []).map((node) => {
    const remappedId = remappedNodeIds.get(node.id) ?? node.id;
    if (node.type !== 'database') {
      return { ...node, id: remappedId };
    }
    const databaseConfig = node.config?.database;
    if (databaseConfig?.operation !== 'update') {
      return { ...node, id: remappedId };
    }
    // Custom mode (not mapping) — the case that was previously NOT triggering full replacement
    return {
      ...node,
      id: remappedId,
      config: {
        ...node.config,
        database: {
          ...databaseConfig,
          updatePayloadMode: 'custom',
          updateTemplate: '{\n  "$set": {\n    "parameters": {{value}}\n  }\n}',
        },
      },
    };
  });

  return {
    ...config,
    name: 'Parameter Inference v2 No Param Add',
    trigger: 'Product Modal - Infer Parameters',
    nodes: remappedNodes,
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
        templateVersion: 14,
        seededDefault: false,
      },
    },
  } as PathConfig;
};

const buildV5TranslationPathConfig = (): PathConfig => {
  const entry = getStarterWorkflowTemplateById('starter_translation_en_pl');
  if (!entry) throw new Error('Missing starter_translation_en_pl entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path_translation_en_pl_v5',
    seededDefault: false,
  });

  return {
    ...config,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type !== 'database') return node;
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'update') return node;
      // Simulate stored v5 config: writeOutcomePolicy absent (implicit fail)
      const { writeOutcomePolicy: _removed, ...databaseConfigWithoutPolicy } = databaseConfig as Record<string, unknown>;
      void _removed;
      return {
        ...node,
        config: {
          ...node.config,
          database: databaseConfigWithoutPolicy,
        },
      };
    }),
    extensions: {
      aiPathsStarter: {
        starterKey: 'translation_en_pl',
        templateId: 'starter_translation_en_pl',
        templateVersion: 5,
        seededDefault: false,
      },
    },
  } as PathConfig;
};

const buildV5DescriptionInferencePathConfig = (): PathConfig => {
  const entry = getStarterWorkflowTemplateById('starter_description_inference_lite');
  if (!entry) throw new Error('Missing starter_description_inference_lite entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path_descv3lite',
    seededDefault: false,
  });

  return {
    ...config,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type !== 'database') return node;
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'update') return node;
      // Simulate stored v5 config: writeOutcomePolicy absent (implicit fail)
      const { writeOutcomePolicy: _removed, ...databaseConfigWithoutPolicy } = databaseConfig as Record<string, unknown>;
      void _removed;
      return {
        ...node,
        config: {
          ...node.config,
          database: databaseConfigWithoutPolicy,
        },
      };
    }),
    extensions: {
      aiPathsStarter: {
        starterKey: 'description_inference_lite',
        templateId: 'starter_description_inference_lite',
        templateVersion: 5,
        seededDefault: false,
      },
    },
  } as PathConfig;
};

const buildV14ParameterInferencePathConfig = (): PathConfig => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path_parameter_inference_v14',
    seededDefault: false,
  });

  return {
    ...config,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type !== 'database') return node;
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'update') return node;
      return {
        ...node,
        config: {
          ...node.config,
          database: {
            ...databaseConfig,
            writeOutcomePolicy: { onZeroAffected: 'fail' as const },
          },
        },
      };
    }),
    extensions: {
      aiPathsStarter: {
        starterKey: 'parameter_inference',
        templateId: 'starter_parameter_inference',
        templateVersion: 14,
        seededDefault: false,
      },
    },
  } as PathConfig;
};

const buildV15ParameterInferencePathConfig = (): PathConfig => {
  const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
  if (!entry) throw new Error('Missing starter_parameter_inference entry');

  const config = materializeStarterWorkflowPathConfig(entry, {
    pathId: 'path_parameter_inference_v15',
    seededDefault: false,
  });

  return {
    ...config,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type !== 'database') return node;
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'query') return node;
      return {
        ...node,
        config: {
          ...node.config,
          database: {
            ...databaseConfig,
            writeOutcomePolicy: { onZeroAffected: 'fail' as const },
          },
        },
      };
    }),
    extensions: {
      aiPathsStarter: {
        starterKey: 'parameter_inference',
        templateId: 'starter_parameter_inference',
        templateVersion: 15,
        seededDefault: false,
      },
    },
  } as PathConfig;
};

describe('starter workflow registry', () => {
  it('materializes template configs from the shared registry', () => {
    const template = PATH_TEMPLATES.find(
      (entry) => entry.templateId === 'starter_parameter_inference'
    );
    if (!template) throw new Error('Missing starter_parameter_inference template');

    const config = buildPathConfigFromTemplate('path_created_from_template', template);

    expect(config.id).toBe('path_created_from_template');
    expect(config.name).toBe('Parameter Inference');
    expect(config.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        starterKey: 'parameter_inference',
        templateId: 'starter_parameter_inference',
        seededDefault: false,
      })
    );
  });

  it('materializes seeded starter configs with provenance', () => {
    const entry = getStarterWorkflowTemplateById('starter_base_export_blwo');
    if (!entry) throw new Error('Missing starter_base_export_blwo entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_base_export_blwo_v1',
      seededDefault: true,
    });

    expect(config.id).toBe('path_base_export_blwo_v1');
    expect(config.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        starterKey: 'base_export_blwo',
        templateId: 'starter_base_export_blwo',
        seededDefault: true,
      })
    );
  });

  it('materializes a runnable EN->PL translation starter graph', () => {
    const entry = getStarterWorkflowTemplateById('starter_translation_en_pl');
    if (!entry) throw new Error('Missing starter_translation_en_pl entry');

    const config = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_translation_en_pl_runtime',
      seededDefault: false,
    });
    const report = evaluateRunPreflight({
      nodes: config.nodes,
      edges: config.edges,
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(config.nodes.some((node) => node.type === 'trigger')).toBe(true);
    expect(report.shouldBlock).toBe(false);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });

  it('does not resolve starter graphs with legacy edge alias fields', () => {
    const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!entry) throw new Error('Missing starter_parameter_inference entry');

    const canonical = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_starter_alias_only_edges',
    });
    const aliasOnlyEdges = (canonical.edges ?? []).map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      sourceHandle: edge.fromPort ?? null,
      targetHandle: edge.toPort ?? null,
      createdAt: edge.createdAt ?? null,
      updatedAt: edge.updatedAt ?? null,
      data: edge.data ?? {},
    }));
    const configWithLegacyAliasEdges = {
      ...canonical,
      extensions: {},
      edges: aliasOnlyEdges,
    } as unknown as PathConfig;

    const upgraded = upgradeStarterWorkflowPathConfig(configWithLegacyAliasEdges);

    expect(upgraded.resolution).toBeNull();
    expect(upgraded.changed).toBe(false);
  });

  it('does not upgrade renamed legacy translation variants', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildLegacyTranslationPathConfig());

    expect(upgraded.resolution).toBeNull();
    expect(upgraded.changed).toBe(false);
  });

  it('overlays stale provenance translation configs preserving diverged nodes while fixing the database node', () => {
    const legacy = buildLegacyTranslationPathConfig({
      includeParamsRegex: true,
      paramsEdgeToPort: 'value',
    });
    const upgraded = upgradeStarterWorkflowPathConfig({
      ...legacy,
      extensions: {
        aiPathsStarter: {
          starterKey: 'translation_en_pl',
          templateId: 'starter_translation_en_pl',
          templateVersion: 1,
          seededDefault: false,
        },
      },
    } as PathConfig);

    const dbNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-db-update-translate-en-pl'
    );
    const extraRegexNode = (upgraded.config.nodes ?? []).find(
      (node) => node.id === 'node-regex-params-translate-en-pl'
    );

    expect(upgraded.changed).toBe(true);
    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    // Database node gets writeOutcomePolicy fix from latest canvas
    expect(dbNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
    // Extra user node is preserved (not removed by overlay)
    expect(extraRegexNode).toBeDefined();
  });

  it('does not upgrade divergent graphs that no longer match starter fingerprints', () => {
    const config = buildLegacyTranslationPathConfig();
    config.nodes = config.nodes.map((node) => {
      if (node.id !== 'node-db-update-translate-en-pl') return node;
      return {
        ...node,
        id: 'node-db-update-translate-en-pl-diverged',
      };
    });
    config.edges = config.edges.map((edge) => {
      if (edge.to !== 'node-db-update-translate-en-pl') return edge;
      return {
        ...edge,
        to: 'node-db-update-translate-en-pl-diverged',
      };
    });

    const upgraded = upgradeStarterWorkflowPathConfig(config);

    expect(upgraded.resolution).toBeNull();
    expect(upgraded.changed).toBe(false);
  });

  it('does not resolve unrelated graphs by historical starter names', () => {
    const unrelated = {
      id: 'path_unrelated_named_like_starter',
      version: 1,
      name: 'Translation EN->PL Description + Parameters',
      description: '',
      trigger: 'manual',
      updatedAt: '2026-03-03T10:00:00.000Z',
      nodes: [
        {
          id: 'node-unrelated-viewer',
          type: 'viewer',
          title: 'Viewer',
          description: '',
          position: { x: 0, y: 0 },
          data: {},
          inputs: ['value'],
          outputs: [],
        },
      ],
      edges: [],
    } as PathConfig;

    const upgraded = upgradeStarterWorkflowPathConfig(unrelated);

    expect(upgraded.resolution).toBeNull();
    expect(upgraded.changed).toBe(false);
  });

  it('rehydrates starter provenance for canonical translation v2 configs without starter metadata', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildStaleLiveTranslationPathConfig());
    const databaseNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );

    expect(upgraded.resolution?.matchedBy).toBe('canonical_hash');
    expect(upgraded.changed).toBe(true);
    expect(upgraded.config.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        starterKey: 'translation_en_pl',
      })
    );
    expect(databaseNode?.config?.database?.updateTemplate).toContain('{{result.parameters}}');
  });

  it('upgrades stale parameter inference v2 configs with blank product_core parser mappings', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildStaleLiveParameterInferencePathConfig());
    const parserNode = (upgraded.config.nodes ?? []).find((node) => node.type === 'parser');
    const parserMappings = parserNode?.config?.parser?.mappings as Record<string, string> | undefined;
    const report = evaluateRunPreflight({
      nodes: upgraded.config.nodes ?? [],
      edges: upgraded.config.edges ?? [],
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(upgraded.resolution?.matchedBy).toBe('legacy_alias');
    expect(upgraded.changed).toBe(true);
    expect(upgraded.config.extensions?.['aiPathsStarter']).toEqual(
      expect.objectContaining({
        starterKey: 'parameter_inference',
      })
    );
    expect(parserMappings?.['title']).toBe('$.name_en');
    expect(parserMappings?.['content_en']).toBe('$.description_en');
    expect(report.shouldBlock).toBe(false);
    expect(report.compileReport.errors).toBe(0);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });

  it('upgrades stale parameter inference starter provenance on non-default path ids', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(
      buildProvenanceOnlyStaleParameterInferencePathConfig()
    );
    const seedRouterNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'router' && node.id === 'node-router-seed-params'
    );
    const report = evaluateRunPreflight({
      nodes: upgraded.config.nodes ?? [],
      edges: upgraded.config.edges ?? [],
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(seedRouterNode?.inputs).not.toContain('prompt');
    expect(seedRouterNode?.outputs).not.toContain('prompt');
    expect(report.shouldBlock).toBe(false);
    expect(report.compileReport.errors).toBe(0);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });

  it('upgrades v14 parameter inference configs to repair writeOutcomePolicy on both update nodes', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildV14ParameterInferencePathConfig());
    const updateNodes = (upgraded.config.nodes ?? []).filter(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(updateNodes.length).toBeGreaterThanOrEqual(2);
    updateNodes.forEach((node) => {
      expect(node.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
    });
  });

  it('upgrades v15 parameter inference configs to repair writeOutcomePolicy on the query node', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildV15ParameterInferencePathConfig());
    const queryNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'query'
    );

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(queryNode).toBeTruthy();
    expect(queryNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
  });

  it('fully replaces partial parameter inference graphs that are missing canonical nodes', () => {
    // Simulate a stored config that has only a subset of canonical nodes (e.g., an old
    // partial migration). The overlay cannot add missing nodes, so full replacement is required.
    const entry = getStarterWorkflowTemplateById('starter_parameter_inference');
    if (!entry) throw new Error('Missing starter_parameter_inference entry');

    const canonical = materializeStarterWorkflowPathConfig(entry, {
      pathId: 'path_partial_overlap',
      seededDefault: false,
    });

    // Keep a subset of canonical nodes — simulates a partially migrated config. Include the
    // prompt node so hasParameterInferencePromptStructure returns true (realistic scenario).
    const keepNodeIds = new Set([
      'node-seed-params',
      'node-update-params',
      'node-parser-params',
      'node-prompt-params',
    ]);
    const partialConfig: PathConfig = {
      ...canonical,
      nodes: (canonical.nodes ?? []).filter((node) => keepNodeIds.has(node.id)),
      edges: (canonical.edges ?? []).filter(
        (edge) => keepNodeIds.has(edge.from) && keepNodeIds.has(edge.to)
      ),
      extensions: {
        aiPathsStarter: {
          starterKey: 'parameter_inference',
          templateId: 'starter_parameter_inference',
          templateVersion: 14,
          seededDefault: false,
        },
      },
    } as PathConfig;

    const upgraded = upgradeStarterWorkflowPathConfig(partialConfig);
    const report = evaluateRunPreflight({
      nodes: upgraded.config.nodes ?? [],
      edges: upgraded.config.edges ?? [],
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(upgraded.changed).toBe(true);
    // All canonical nodes are present after full replacement
    expect(upgraded.config.nodes.some((node) => node.id === 'node-router-seed-params')).toBe(true);
    expect(upgraded.config.nodes.some((node) => node.id === 'node-vp-template-params')).toBe(true);
    expect(upgraded.config.nodes.some((node) => node.id === 'node-lc-template-params')).toBe(true);
    expect(report.shouldBlock).toBe(false);
    expect(report.compileReport.errors).toBe(0);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });

  it('upgrades v5 translation configs to add writeOutcomePolicy pass on the update node', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildV5TranslationPathConfig());
    const dbNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(dbNode).toBeTruthy();
    expect(dbNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
  });

  it('upgrades v5 description inference lite configs to add writeOutcomePolicy pass on the update node', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(buildV5DescriptionInferencePathConfig());
    const dbNode = (upgraded.config.nodes ?? []).find(
      (node) => node.type === 'database' && node.config?.database?.operation === 'update'
    );

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(dbNode).toBeTruthy();
    expect(dbNode?.config?.database?.writeOutcomePolicy?.onZeroAffected).toBe('pass');
  });

  it('fully replaces a partially-upgraded graph whose provenance is already at the current templateVersion but nodes were never updated', () => {
    // Simulate a path that was partially upgraded: the overlay bumped provenance to v16
    // but couldn't update any nodes (zero ID overlap), leaving legacy random-ID nodes.
    const partiallyUpgraded: PathConfig = {
      ...buildCustomModeRandomIdParameterInferencePathConfig(),
      extensions: {
        aiPathsStarter: {
          starterKey: 'parameter_inference',
          templateId: 'starter_parameter_inference',
          templateVersion: 16, // already at current — safeToOverlay is false via provenance path
          seededDefault: false,
        },
      },
    } as PathConfig;

    const upgraded = upgradeStarterWorkflowPathConfig(partiallyUpgraded);
    const report = evaluateRunPreflight({
      nodes: upgraded.config.nodes ?? [],
      edges: upgraded.config.edges ?? [],
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(upgraded.changed).toBe(true);
    expect(upgraded.config.nodes.some((node) => node.id === 'node-model-params')).toBe(true);
    expect(report.shouldBlock).toBe(false);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });

  it('fully replaces custom-mode parameter inference graphs with random node IDs (no canonical overlap)', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(
      buildCustomModeRandomIdParameterInferencePathConfig()
    );
    const report = evaluateRunPreflight({
      nodes: upgraded.config.nodes ?? [],
      edges: upgraded.config.edges ?? [],
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    // After full replacement all nodes use canonical IDs
    expect(upgraded.config.nodes.some((node) => node.id === 'node-model-params')).toBe(true);
    expect(upgraded.config.nodes.some((node) => node.id === 'node-regex-params')).toBe(true);
    expect(report.shouldBlock).toBe(false);
    expect(report.compileReport.errors).toBe(0);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });

  it('fully replaces stale parameter inference graphs with zero canonical node overlap', () => {
    const upgraded = upgradeStarterWorkflowPathConfig(
      buildMappingModeLegacyParameterInferencePathConfig()
    );
    const report = evaluateRunPreflight({
      nodes: upgraded.config.nodes ?? [],
      edges: upgraded.config.edges ?? [],
      aiPathsValidation: { enabled: true },
      strictFlowMode: true,
      mode: 'full',
    });

    expect(upgraded.resolution?.matchedBy).toBe('provenance');
    expect(upgraded.changed).toBe(true);
    expect(
      upgraded.config.nodes.some(
        (node) =>
          node.type === 'database' &&
          node.config?.database?.operation === 'update' &&
          node.config?.database?.updatePayloadMode === 'mapping'
      )
    ).toBe(false);
    expect(upgraded.config.nodes.some((node) => node.id === 'node-router-seed-params')).toBe(true);
    expect(report.shouldBlock).toBe(false);
    expect(report.compileReport.errors).toBe(0);
    expect(report.dependencyReport?.errors ?? 0).toBe(0);
  });
});
