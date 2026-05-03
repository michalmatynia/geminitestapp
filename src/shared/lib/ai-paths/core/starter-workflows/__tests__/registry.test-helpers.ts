import { expect } from 'vitest';

import type { PathConfig } from '@/shared/contracts/ai-paths';
import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';

export const getStarterWorkflowTemplateByIdOrThrow = (templateId: string) => {
  const entry = getStarterWorkflowTemplateById(templateId);
  if (!entry) {
    throw new Error(`Missing ${templateId} entry`);
  }
  return entry;
};

export const evaluateStrictRunPreflight = (config: Pick<PathConfig, 'edges' | 'nodes'>) =>
  evaluateRunPreflight({
    nodes: config.nodes ?? [],
    edges: config.edges ?? [],
    aiPathsValidation: { enabled: true },
    strictFlowMode: true,
    mode: 'full',
  });

export const expectSuccessfulStrictRunPreflight = (
  report: ReturnType<typeof evaluateStrictRunPreflight>
): void => {
  expect(report.shouldBlock).toBe(false);
  expect(report.compileReport.errors).toBe(0);
  expect(report.dependencyReport?.errors ?? 0).toBe(0);
};

export const hasNodeId = (config: Pick<PathConfig, 'nodes'>, nodeId: string): boolean =>
  (config.nodes ?? []).some((node) => node.id === nodeId);

export const hasNodeWithType = (config: Pick<PathConfig, 'nodes'>, type: string): boolean =>
  (config.nodes ?? []).some((node) => node.type === type);

export const hasNodeByTitle = (config: Pick<PathConfig, 'nodes'>, title: string): boolean =>
  (config.nodes ?? []).some((node) => node.title === title);

export const findNodeByType = (config: Pick<PathConfig, 'nodes'>, type: string) =>
  (config.nodes ?? []).find((node) => node.type === type);

export const findNodeByTitle = (config: Pick<PathConfig, 'nodes'>, title: string) =>
  (config.nodes ?? []).find((node) => node.title === title);

export const findNodeByTypeAndTitle = (config: Pick<PathConfig, 'nodes'>, type: string, title: string) =>
  (config.nodes ?? []).find((node) => node.type === type && node.title === title);

const hasDatabaseNodeWithOperation = (
  config: Pick<PathConfig, 'nodes'>,
  operation: 'query' | 'update'
): boolean =>
  (config.nodes ?? []).some(
    (node) => node.type === 'database' && node.config?.database?.operation === operation
  );

export const hasDatabaseNodeWithUpdatePayloadMode = (
  config: Pick<PathConfig, 'nodes'>,
  updatePayloadMode: 'custom' | 'mapping'
): boolean =>
  (config.nodes ?? []).some(
    (node) =>
      node.type === 'database' &&
      node.config?.database?.operation === 'update' &&
      node.config?.database?.updatePayloadMode === updatePayloadMode
  );

export const toLegacyAliasOnlyEdges = (config: Pick<PathConfig, 'edges'>) =>
  (config.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    sourceHandle: edge.fromPort ?? null,
    targetHandle: edge.toPort ?? null,
    createdAt: edge.createdAt ?? null,
    updatedAt: edge.updatedAt ?? null,
    data: edge.data ?? {},
  }));

export const buildLegacyTranslationPathConfig = (args?: {
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

export const buildStaleLiveTranslationPathConfig = (): PathConfig => {
  const config = materializeStarterWorkflowPathConfig(
    getStarterWorkflowTemplateByIdOrThrow('starter_translation_en_pl'),
    {
      pathId: 'path_translation_en_pl_v2_live',
      seededDefault: false,
    }
  );

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

export const buildStaleLiveParameterInferencePathConfig = (): PathConfig => {
  const config = materializeStarterWorkflowPathConfig(
    getStarterWorkflowTemplateByIdOrThrow('starter_parameter_inference'),
    {
      pathId: 'path_parameter_inference_v2_live',
      seededDefault: false,
    }
  );

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

export const buildProvenanceOnlyStaleParameterInferencePathConfig = (): PathConfig => {
  const config = materializeStarterWorkflowPathConfig(
    getStarterWorkflowTemplateByIdOrThrow('starter_parameter_inference'),
    {
      pathId: 'path_parameter_inference_v2_provenance_only',
      seededDefault: false,
    }
  );

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

export const buildMappingModeLegacyParameterInferencePathConfig = (): PathConfig => {
  const config = materializeStarterWorkflowPathConfig(
    getStarterWorkflowTemplateByIdOrThrow('starter_parameter_inference'),
    {
      pathId: 'path_parameter_inference_v2_randomized_live',
      seededDefault: false,
    }
  );

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

  if (!hasDatabaseNodeWithOperation({ nodes: remappedNodes }, 'update')) {
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

export const buildCustomModeRandomIdParameterInferencePathConfig = (): PathConfig => {
  const config = materializeStarterWorkflowPathConfig(
    getStarterWorkflowTemplateByIdOrThrow('starter_parameter_inference'),
    {
      pathId: 'path_3wejpy',
      seededDefault: false,
    }
  );

  const remappedNodeIds = new Map<string, string>();
  (config.nodes ?? []).forEach((node) => {
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

export const buildV5TranslationPathConfig = (): PathConfig => {
  const config = materializeStarterWorkflowPathConfig(
    getStarterWorkflowTemplateByIdOrThrow('starter_translation_en_pl'),
    {
      pathId: 'path_translation_en_pl_v5',
      seededDefault: false,
    }
  );

  return {
    ...config,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type !== 'database') return node;
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'update') return node;
      const { writeOutcomePolicy: _removed, ...databaseConfigWithoutPolicy } =
        databaseConfig as Record<string, unknown>;
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

export const buildV5DescriptionInferencePathConfig = (): PathConfig => {
  const config = materializeStarterWorkflowPathConfig(
    getStarterWorkflowTemplateByIdOrThrow('starter_description_inference_lite'),
    {
      pathId: 'path_descv3lite',
      seededDefault: false,
    }
  );

  return {
    ...config,
    nodes: (config.nodes ?? []).map((node) => {
      if (node.type !== 'database') return node;
      const databaseConfig = node.config?.database;
      if (databaseConfig?.operation !== 'update') return node;
      const { writeOutcomePolicy: _removed, ...databaseConfigWithoutPolicy } =
        databaseConfig as Record<string, unknown>;
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

export const buildV14ParameterInferencePathConfig = (): PathConfig => {
  const config = materializeStarterWorkflowPathConfig(
    getStarterWorkflowTemplateByIdOrThrow('starter_parameter_inference'),
    {
      pathId: 'path_parameter_inference_v14',
      seededDefault: false,
    }
  );

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

export const buildV15ParameterInferencePathConfig = (): PathConfig => {
  const config = materializeStarterWorkflowPathConfig(
    getStarterWorkflowTemplateByIdOrThrow('starter_parameter_inference'),
    {
      pathId: 'path_parameter_inference_v15',
      seededDefault: false,
    }
  );

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
