import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import {
  getStarterWorkflowTemplateById,
  materializeStarterWorkflowPathConfig,
} from '@/shared/lib/ai-paths/core/starter-workflows';

const { mockResolvePortablePathInput } = vi.hoisted(() => ({
  mockResolvePortablePathInput: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/portable-engine', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths/portable-engine')>(
    '@/shared/lib/ai-paths/portable-engine'
  );
  return {
    ...actual,
    resolvePortablePathInput: mockResolvePortablePathInput,
  };
});

import { materializeStoredTriggerPathConfig } from '../stored-trigger-path-config';

describe('materializeStoredTriggerPathConfig', () => {
  beforeEach(() => {
    mockResolvePortablePathInput.mockReset();
  });

  it('does not mark equivalent stored configs as changed when identity repair is a no-op', () => {
    const config = createDefaultPathConfig('path-equivalent-repair');
    const rawConfig = JSON.stringify(config);

    mockResolvePortablePathInput.mockImplementation((value: unknown) => ({
      ok: true,
      value: {
        pathConfig: value,
        identityRepaired: true,
        warnings: [],
      },
    }));

    const resolved = materializeStoredTriggerPathConfig({
      pathId: config.id,
      rawConfig,
      fallbackName: config.name,
    });

    expect(resolved.config).toEqual(config);
    expect(resolved.changed).toBe(false);
  });

  it('preserves a trimmed stored selected node id when the node still exists', () => {
    const config = createDefaultPathConfig('path-selected-node-preserved');
    const selectedNodeId = config.nodes[0]?.id;
    if (!selectedNodeId) {
      throw new Error('Expected a default node id.');
    }

    const rawConfig = JSON.stringify({
      ...config,
      uiState: {
        configOpen: true,
        selectedNodeId: ` ${selectedNodeId} `,
      },
    });

    mockResolvePortablePathInput.mockImplementation((value: unknown) => ({
      ok: true,
      value: {
        pathConfig: value,
        identityRepaired: false,
        warnings: [],
      },
    }));

    const resolved = materializeStoredTriggerPathConfig({
      pathId: config.id,
      rawConfig,
      fallbackName: config.name,
    });

    expect(resolved.config.uiState?.selectedNodeId).toBe(selectedNodeId);
    expect(resolved.config.uiState?.configOpen).toBe(true);
    expect(resolved.changed).toBe(true);
  });

  it('clears a stored selected node id when the node no longer exists', () => {
    const config = createDefaultPathConfig('path-selected-node-cleared');
    const rawConfig = JSON.stringify({
      ...config,
      uiState: {
        selectedNodeId: 'missing-node',
      },
    });

    mockResolvePortablePathInput.mockImplementation((value: unknown) => ({
      ok: true,
      value: {
        pathConfig: value,
        identityRepaired: false,
        warnings: [],
      },
    }));

    const resolved = materializeStoredTriggerPathConfig({
      pathId: config.id,
      rawConfig,
      fallbackName: config.name,
    });

    expect(resolved.config.uiState?.selectedNodeId).toBeNull();
  });

  it('does not auto-repair legacy database mapping updates without starter refresh criteria', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) {
      throw new Error('Expected starter_product_name_normalize template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path-repair-db-mapping-mode',
      seededDefault: true,
    });
    const legacyNodes = (config.nodes ?? []).map((node) => {
      if (node.type !== 'database' || node.title !== 'Database Query') {
        return node;
      }
      return {
        ...node,
        config: {
          ...node.config,
          database: {
            ...node.config?.database,
            updatePayloadMode: 'mapping',
            updateTemplate: '',
          },
        },
      };
    });
    const rawConfig = JSON.stringify({
      ...config,
      nodes: legacyNodes,
    });

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    const resolved = materializeStoredTriggerPathConfig({
      pathId: config.id,
      rawConfig,
      fallbackName: config.name,
    });

    const databaseNode = resolved.config.nodes.find(
      (node) => node.type === 'database' && node.title === 'Database Query'
    );
    expect(databaseNode?.config?.database?.updatePayloadMode).toBe('mapping');
    expect(databaseNode?.config?.database?.updateTemplate).toBe('');
  });

  it('does not auto-repair legacy generated custom update templates with invalid scalar token quoting', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) {
      throw new Error('Expected starter_product_name_normalize template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path-repair-db-custom-template',
      seededDefault: true,
    });
    const legacyNodes = (config.nodes ?? []).map((node) => {
      if (node.type !== 'database' || node.title !== 'Database Query') {
        return node;
      }
      return {
        ...node,
        config: {
          ...node.config,
          database: {
            ...node.config?.database,
            updatePayloadMode: 'custom',
            updateTemplate:
              '{\n  "$set": {\n    "name_en": {{result}}\n  },\n  "$unset": {\n    "__noop__": ""\n  }\n}',
          },
        },
      };
    });
    const rawConfig = JSON.stringify({
      ...config,
      nodes: legacyNodes,
    });

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    const resolved = materializeStoredTriggerPathConfig({
      pathId: config.id,
      rawConfig,
      fallbackName: config.name,
    });

    const databaseNode = resolved.config.nodes.find(
      (node) => node.type === 'database' && node.title === 'Database Query'
    );
    expect(databaseNode?.config?.database?.updatePayloadMode).toBe('custom');
    expect(databaseNode?.config?.database?.updateTemplate).toContain('"name_en": {{result}}');
  });

  it('does not auto-repair translation mapping update nodes without starter refresh criteria', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_translation_en_pl');
    if (!template) {
      throw new Error('Expected starter_translation_en_pl template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path-translation-en-pl-repair',
      seededDefault: false,
    });
    const legacyNodes = (config.nodes ?? []).map((node) => {
      if (node.type !== 'database' || node.title !== 'Database Update') {
        return node;
      }
      return {
        ...node,
        config: {
          ...node.config,
          database: {
            ...node.config?.database,
            updatePayloadMode: 'mapping',
            updateTemplate: '',
          },
        },
      };
    });
    const rawConfig = JSON.stringify({
      ...config,
      nodes: legacyNodes,
    });

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    const resolved = materializeStoredTriggerPathConfig({
      pathId: config.id,
      rawConfig,
      fallbackName: config.name,
    });

    const databaseNode = resolved.config.nodes.find(
      (node) => node.type === 'database' && node.title === 'Database Update'
    );
    expect(databaseNode?.config?.database?.updatePayloadMode).toBe('mapping');
    expect(databaseNode?.config?.database?.updateTemplate).toBe('');
    expect(databaseNode?.config?.database?.skipEmpty).toBe(true);
    expect(databaseNode?.config?.database?.trimStrings).toBe(true);
    expect(databaseNode?.config?.database?.localizedParameterMerge).toEqual(
      expect.objectContaining({
        enabled: true,
        targetPath: 'parameters',
        languageCode: 'pl',
        requireFullCoverage: false,
      })
    );
  });

  it('preserves an explicit Normalize model selection while materializing stale starter configs', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) {
      throw new Error('Expected starter_product_name_normalize template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path_name_normalize_v1',
      seededDefault: true,
    });
    const rawConfig = JSON.stringify({
      ...config,
      nodes: (config.nodes ?? []).map((node) => {
        if (node.type !== 'model') return node;
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
    });

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    const resolved = materializeStoredTriggerPathConfig({
      pathId: 'path_name_normalize_v1',
      rawConfig,
      fallbackName: config.name,
    });

    const modelNode = resolved.config.nodes.find((node) => node.type === 'model');
    expect(modelNode?.config?.model?.modelId).toBe('ollama:gemma3');
    expect(resolved.changed).toBe(true);
  });

  it('preserves edited Normalize model settings while materializing stale starter configs', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) {
      throw new Error('Expected starter_product_name_normalize template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path_name_normalize_v1',
      seededDefault: true,
    });
    const rawConfig = JSON.stringify({
      ...config,
      nodes: (config.nodes ?? []).map((node) => {
        if (node.type !== 'model') return node;
        return {
          ...node,
          config: {
            ...node.config,
            model: {
              ...node.config?.model,
              temperature: 0.35,
              maxTokens: 1337,
              systemPrompt: 'Only return normalized output.',
              waitForResult: false,
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
    });

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    const resolved = materializeStoredTriggerPathConfig({
      pathId: 'path_name_normalize_v1',
      rawConfig,
      fallbackName: config.name,
    });

    const modelNode = resolved.config.nodes.find((node) => node.type === 'model');
    expect(modelNode?.config?.model).toEqual(
      expect.objectContaining({
        temperature: 0.35,
        maxTokens: 1337,
        systemPrompt: 'Only return normalized output.',
        waitForResult: false,
      })
    );
    expect(resolved.changed).toBe(true);
  });

  it('preserves edited Normalize prompt and fetcher settings while materializing stale starter configs', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) {
      throw new Error('Expected starter_product_name_normalize template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path_name_normalize_v1',
      seededDefault: true,
    });
    const rawConfig = JSON.stringify({
      ...config,
      nodes: (config.nodes ?? []).map((node) => {
        if (node.type === 'fetcher') {
          return {
            ...node,
            config: {
              ...node.config,
              fetcher: {
                ...node.config?.fetcher,
                sourceMode: 'simulation_id',
                entityId: 'prod_custom_123',
                productId: 'prod_custom_123',
              },
            },
          };
        }
        if (node.type === 'prompt') {
          return {
            ...node,
            config: {
              ...node.config,
              prompt: {
                ...node.config?.prompt,
                template:
                  'Custom normalize prompt.\nReturn JSON with {"normalizedName":"","validationError":""}.',
              },
            },
          };
        }
        return node;
      }),
      extensions: {
        aiPathsStarter: {
          starterKey: 'product_name_normalize',
          templateId: 'starter_product_name_normalize',
          templateVersion: 4,
          seededDefault: true,
        },
      },
    });

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    const resolved = materializeStoredTriggerPathConfig({
      pathId: 'path_name_normalize_v1',
      rawConfig,
      fallbackName: config.name,
    });

    const fetcherNode = resolved.config.nodes.find((node) => node.type === 'fetcher');
    const promptNode = resolved.config.nodes.find((node) => node.type === 'prompt');

    expect(fetcherNode?.config?.fetcher).toEqual(
      expect.objectContaining({
        sourceMode: 'simulation_id',
        entityId: 'prod_custom_123',
        productId: 'prod_custom_123',
      })
    );
    expect(fetcherNode?.config?.runtime?.inputContracts?.trigger?.required).toBe(true);
    expect(promptNode?.config?.prompt?.template).toBe(
      'Custom normalize prompt.\nReturn JSON with {"normalizedName":"","validationError":""}.'
    );
    expect(resolved.changed).toBe(true);
  });

  it('fully replaces stale default normalize starter graphs with random node ids so the database node becomes dry-run', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) {
      throw new Error('Expected starter_product_name_normalize template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path_name_normalize_v1',
      seededDefault: true,
    });
    const randomIdConfig = {
      ...config,
      nodes: (config.nodes ?? []).map((node, index) => ({
        ...node,
        id: `node-normalize-random-${index + 1}`,
      })),
      edges: (config.edges ?? []).map((edge, index) => {
        const fromIndex = (config.nodes ?? []).findIndex((node) => node.id === edge.from);
        const toIndex = (config.nodes ?? []).findIndex((node) => node.id === edge.to);
        return {
          ...edge,
          id: `edge-normalize-random-${index + 1}`,
          from: fromIndex >= 0 ? `node-normalize-random-${fromIndex + 1}` : edge.from,
          to: toIndex >= 0 ? `node-normalize-random-${toIndex + 1}` : edge.to,
        };
      }),
      extensions: {
        aiPathsStarter: {
          starterKey: 'product_name_normalize',
          templateId: 'starter_product_name_normalize',
          templateVersion: 3,
          seededDefault: true,
        },
      },
    };

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    const resolved = materializeStoredTriggerPathConfig({
      pathId: 'path_name_normalize_v1',
      rawConfig: JSON.stringify(randomIdConfig),
      fallbackName: config.name,
    });

    const databaseNode = resolved.config.nodes.find((node) => node.type === 'database');
    expect(databaseNode?.config?.database?.dryRun).toBe(true);
    expect(resolved.changed).toBe(true);
  });

  it('rejects broken default-path configs with a validation error', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_translation_en_pl');
    if (!template) {
      throw new Error('Expected starter_translation_en_pl template');
    }

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    expect(() =>
      materializeStoredTriggerPathConfig({
        pathId: 'path_96708d',
        rawConfig: '{"broken":',
        fallbackName: template.name,
      })
    ).toThrow('Invalid AI Path config payload.');
  });

  it('canonically rewrites default-path normalize starter graphs with random node ids even without starter provenance', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) {
      throw new Error('Expected starter_product_name_normalize template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path_name_normalize_v1',
      seededDefault: true,
    });
    const randomIdConfig = {
      ...config,
      nodes: (config.nodes ?? []).map((node, index) => {
        const randomId = `node-normalize-legacy-${index + 1}`;
        if (node.type !== 'database') {
          return {
            ...node,
            id: randomId,
          };
        }
        return {
          ...node,
          id: randomId,
          config: {
            ...node.config,
            database: {
              ...node.config?.database,
              dryRun: false,
              updatePayloadMode: 'custom',
              updateTemplate:
                '{\n  "$set": {\n    "name_en": "{{result}}"\n  },\n  "$unset": {\n    "__noop__": ""\n  }\n}',
            },
          },
        };
      }),
      edges: (config.edges ?? []).map((edge, index) => {
        const fromIndex = (config.nodes ?? []).findIndex((node) => node.id === edge.from);
        const toIndex = (config.nodes ?? []).findIndex((node) => node.id === edge.to);
        return {
          ...edge,
          id: `edge-normalize-legacy-${index + 1}`,
          from: fromIndex >= 0 ? `node-normalize-legacy-${fromIndex + 1}` : edge.from,
          to: toIndex >= 0 ? `node-normalize-legacy-${toIndex + 1}` : edge.to,
        };
      }),
      extensions: undefined,
    };

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    const resolved = materializeStoredTriggerPathConfig({
      pathId: 'path_name_normalize_v1',
      rawConfig: JSON.stringify(randomIdConfig),
      fallbackName: config.name,
    });

    const promptNode = resolved.config.nodes.find((node) => node.type === 'prompt');
    const databaseNode = resolved.config.nodes.find((node) => node.type === 'database');
    expect(promptNode?.config?.prompt?.template).toContain('choose the terminal leaf');
    expect(databaseNode?.config?.database?.dryRun).toBe(true);
    expect(resolved.changed).toBe(true);
  });

  it('fully replaces partially-upgraded default normalize starter graphs whose provenance is current but node ids never migrated', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_product_name_normalize');
    if (!template) {
      throw new Error('Expected starter_product_name_normalize template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path_name_normalize_v1',
      seededDefault: true,
    });
    const randomIdConfig = {
      ...config,
      nodes: (config.nodes ?? []).map((node, index) => ({
        ...node,
        id: `node-normalize-current-${index + 1}`,
      })),
      edges: (config.edges ?? []).map((edge, index) => {
        const fromIndex = (config.nodes ?? []).findIndex((node) => node.id === edge.from);
        const toIndex = (config.nodes ?? []).findIndex((node) => node.id === edge.to);
        return {
          ...edge,
          id: `edge-normalize-current-${index + 1}`,
          from: fromIndex >= 0 ? `node-normalize-current-${fromIndex + 1}` : edge.from,
          to: toIndex >= 0 ? `node-normalize-current-${toIndex + 1}` : edge.to,
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
    };

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    const resolved = materializeStoredTriggerPathConfig({
      pathId: 'path_name_normalize_v1',
      rawConfig: JSON.stringify(randomIdConfig),
      fallbackName: config.name,
    });

    const promptNode = resolved.config.nodes.find((node) => node.type === 'prompt');
    const databaseNode = resolved.config.nodes.find((node) => node.type === 'database');
    expect(promptNode?.config?.prompt?.template).toContain(
      'choose the terminal leaf'
    );
    expect(databaseNode?.config?.database?.dryRun).toBe(true);
    expect(resolved.changed).toBe(true);
  });

  it('rejects stored starter configs whose edges only use old alias keys', async () => {
    const actualPortableEngine = await vi.importActual<
      typeof import('@/shared/lib/ai-paths/portable-engine')
    >('@/shared/lib/ai-paths/portable-engine');
    const template = getStarterWorkflowTemplateById('starter_description_inference_lite');
    if (!template) {
      throw new Error('Expected starter_description_inference_lite template');
    }
    const config = materializeStarterWorkflowPathConfig(template, {
      pathId: 'path_descv3lite',
      seededDefault: true,
    });
    const legacyEdgeConfig = {
      ...config,
      edges: (config.edges ?? []).map((edge) => ({
        id: edge.id,
        fromNodeId: edge.from,
        toNodeId: edge.to,
        fromPort: edge.fromPort ?? null,
        toPort: edge.toPort ?? null,
        label: edge.label ?? null,
        ...(typeof edge.type === 'string' ? { type: edge.type } : {}),
        ...(edge.data && typeof edge.data === 'object' ? { data: edge.data } : {}),
        ...(typeof edge.createdAt === 'string' ? { createdAt: edge.createdAt } : {}),
        ...(typeof edge.updatedAt === 'string' || edge.updatedAt === null
          ? { updatedAt: edge.updatedAt }
          : {}),
      })),
    };

    mockResolvePortablePathInput.mockImplementation(actualPortableEngine.resolvePortablePathInput);

    expect(() =>
      materializeStoredTriggerPathConfig({
        pathId: 'path_descv3lite',
        rawConfig: JSON.stringify(legacyEdgeConfig),
        fallbackName: config.name,
      })
    ).toThrow('Invalid AI Path trigger node payload.');
  });
});
