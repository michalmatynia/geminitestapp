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

  it('repairs legacy database mapping updates that still use custom payload mode without an update template', async () => {
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
    expect(databaseNode?.config?.database?.updatePayloadMode).toBe('custom');
    expect(databaseNode?.config?.database?.updateTemplate).toContain('"name_en": "{{result}}"');
    expect(databaseNode?.config?.database?.updateTemplate).toContain('"__noop__": ""');
    expect(resolved.changed).toBe(true);
  });

  it('repairs legacy generated custom update templates that still use unquoted string tokens', async () => {
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
    expect(databaseNode?.config?.database?.updateTemplate).toContain('"name_en": "{{result}}"');
    expect(databaseNode?.config?.database?.updateTemplate).toContain('"__noop__": ""');
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

  it('fully replaces legacy normalize starter graphs with random node ids and no starter provenance', async () => {
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
    expect(promptNode?.config?.prompt?.template).toContain(
      'Always prefer the most specific terminal leaf from the hierarchy.'
    );
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
          templateVersion: 5,
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
      'Always prefer the most specific terminal leaf from the hierarchy.'
    );
    expect(databaseNode?.config?.database?.dryRun).toBe(true);
    expect(resolved.changed).toBe(true);
  });
});
