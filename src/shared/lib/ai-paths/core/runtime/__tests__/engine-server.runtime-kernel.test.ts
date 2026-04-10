import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';
import {
  clearAiPathsRuntimeCodeObjectResolvers,
  registerAiPathsRuntimeCodeObjectResolver,
} from '@/shared/lib/ai-paths/core/runtime/code-object-resolver-registry';

const { getMongoClientMock } = vi.hoisted(() => ({
  getMongoClientMock: vi.fn(async () => ({})),
}));

const { schemaMock, browseMock } = vi.hoisted(() => ({
  schemaMock: vi.fn(),
  browseMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoClient: getMongoClientMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths/api')>(
    '@/shared/lib/ai-paths/api'
  );
  return {
    ...actual,
    dbApi: {
      ...actual.dbApi,
      schema: schemaMock,
      browse: browseMock,
    },
  };
});

import { evaluateGraphServer } from '@/shared/lib/ai-paths/core/runtime/engine-server';

const buildConstantNode = (): AiNode => ({
  id: 'node-constant',
  type: 'constant',
  title: 'Constant',
  description: '',
  inputs: [],
  outputs: ['value'],
  config: {
    constant: {
      valueType: 'string',
      value: 'legacy',
    },
  },
  position: { x: 0, y: 0 },
});

const buildCompareNode = (): AiNode => ({
  id: 'node-compare',
  type: 'compare',
  title: 'Compare',
  description: '',
  inputs: ['value'],
  outputs: ['value', 'valid', 'errors'],
  config: {
    compare: {
      operator: 'eq',
      compareTo: 'legacy',
      caseSensitive: true,
      message: 'Comparison failed',
    },
  },
  position: { x: 220, y: 0 },
});

const buildTriggerNode = (): AiNode => ({
  id: 'node-trigger',
  type: 'trigger',
  title: 'Trigger',
  description: '',
  inputs: [],
  outputs: ['trigger', 'triggerName'],
  config: {
    trigger: {
      event: 'manual',
      contextMode: 'trigger_only',
    },
  },
  position: { x: 0, y: 120 },
});

const buildPromptNode = (): AiNode => ({
  id: 'node-prompt',
  type: 'prompt',
  title: 'Prompt',
  description: '',
  inputs: [],
  outputs: ['prompt'],
  config: {
    prompt: {
      template: 'hello-from-prompt',
    },
  },
  position: { x: 0, y: 240 },
});

const buildFunctionNode = (): AiNode => ({
  id: 'node-function',
  type: 'function',
  title: 'Function',
  description: '',
  inputs: [],
  outputs: ['value'],
  config: {
    function: {
      script: 'return { value: "ok" };',
      safeMode: true,
    },
  },
  position: { x: 0, y: 300 },
});

const buildAudioOscillatorNode = (): AiNode => ({
  id: 'node-audio-osc',
  type: 'audio_oscillator',
  title: 'Audio Oscillator',
  description: '',
  inputs: [],
  outputs: ['audioSignal', 'status'],
  config: {
    audioOscillator: {
      waveform: 'sine',
      frequencyHz: 440,
      gain: 0.5,
      durationMs: 250,
    },
  },
  position: { x: 0, y: 360 },
});

const buildJsonConstantNode = (args: {
  id: string;
  title: string;
  value: Record<string, unknown>;
}): AiNode => ({
  id: args.id,
  type: 'constant',
  title: args.title,
  description: '',
  inputs: [],
  outputs: ['value'],
  config: {
    constant: {
      valueType: 'json',
      value: JSON.stringify(args.value),
    },
  },
  position: { x: 0, y: 420 },
});

const buildDbSchemaLiveContextNode = (): AiNode => ({
  id: 'node-db-schema-live',
  type: 'db_schema',
  title: 'Database Schema',
  description: '',
  inputs: ['context', 'schema'],
  outputs: ['schema', 'context'],
  config: {
    db_schema: {
      provider: 'auto',
      mode: 'selected',
      collections: ['product_categories'],
      sourceMode: 'live_context',
      contextCollections: ['product_categories'],
      contextQuery: '{\n  "catalogId": "{{context.catalogId}}"\n}',
      contextLimit: 50,
      includeFields: true,
      includeRelations: true,
      formatAs: 'json',
    },
    runtime: {
      waitForInputs: true,
      inputContracts: {
        context: { required: true },
        schema: { required: false },
      },
    },
  },
  position: { x: 220, y: 420 },
});

const buildCategoryShapeFunctionNode = (): AiNode => ({
  id: 'node-category-shape',
  type: 'function',
  title: 'Category Shape',
  description: '',
  inputs: ['bundle', 'context'],
  outputs: ['bundle'],
  config: {
    function: {
      script: `
const product = inputs.bundle && typeof inputs.bundle === 'object' ? inputs.bundle : {};
const liveContext =
  inputs.context && typeof inputs.context === 'object' && inputs.context.liveContext && typeof inputs.context.liveContext === 'object'
    ? inputs.context.liveContext
    : {};
const categoryCollection =
  liveContext.collectionMap &&
  typeof liveContext.collectionMap === 'object' &&
  liveContext.collectionMap.product_categories &&
  typeof liveContext.collectionMap.product_categories === 'object'
    ? liveContext.collectionMap.product_categories
    : {};
const docs = Array.isArray(categoryCollection.documents) ? categoryCollection.documents : [];
const categories = docs
  .map((doc) => ({
    id: typeof doc._id === 'string' ? doc._id : typeof doc.id === 'string' ? doc.id : '',
    label: String(doc.name_en || doc.name || '').trim(),
    parentId: typeof doc.parentId === 'string' && doc.parentId.trim() ? doc.parentId.trim() : null,
  }))
  .filter((category) => category.id && category.label);
const byId = Object.fromEntries(categories.map((category) => [category.id, category]));
const parentCounts = categories.reduce((acc, category) => {
  const key = category.parentId || '__root__';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
const buildFullPath = (categoryId) => {
  const segments = [];
  const seen = new Set();
  let current = byId[categoryId];
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    segments.unshift(current.label);
    current = current.parentId ? byId[current.parentId] : undefined;
  }
  return segments.join(' > ');
};
const leafCategories = categories
  .filter((category) => !parentCounts[category.id])
  .map((category) => ({
    id: category.id,
    label: category.label,
    fullPath: buildFullPath(category.id),
    isCurrent: category.id === product.categoryId,
  }));
const current = categories.find((category) => category.id === product.categoryId) || null;
return {
  bundle: {
    ...product,
    categoryContext: {
      leafCategories,
      allowedLeafLabels: leafCategories.map((category) => category.label),
      currentCategory: current
        ? {
            id: current.id,
            label: current.label,
            fullPath: buildFullPath(current.id),
          }
        : null,
    },
  },
};
      `.trim(),
      safeMode: true,
      expectedType: 'object',
    },
  },
  position: { x: 440, y: 420 },
});

const buildCategoryPromptNode = (): AiNode => ({
  id: 'node-category-prompt',
  type: 'prompt',
  title: 'Prompt',
  description: '',
  inputs: ['bundle'],
  outputs: ['prompt'],
  config: {
    prompt: {
      template:
        'Current category: {{bundle.categoryContext.currentCategory.fullPath}} | Allowed: {{bundle.categoryContext.allowedLeafLabels}}',
    },
  },
  position: { x: 660, y: 420 },
});

describe('engine-server runtime-kernel resolver wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAiPathsRuntimeCodeObjectResolvers();
    schemaMock.mockReset();
    browseMock.mockReset();
  });

  it('executes custom code-object handlers when provided via runtime options', async () => {
    const customConstantHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'server-kernel-custom',
    }));
    const resolveCodeObjectHandler = vi.fn(
      ({ nodeType, codeObjectId }: { nodeType: string; codeObjectId: string }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? customConstantHandler
          : null
    );

    const result = await evaluateGraphServer({
      nodes: [buildConstantNode()],
      edges: [],
      runtimeKernelNodeTypes: ['constant'],
      resolveCodeObjectHandler,
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(resolveCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'constant',
      codeObjectId: 'ai-paths.node-code-object.constant.v3',
    });
    expect(customConstantHandler).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-constant']?.['value']).toBe('server-kernel-custom');
  });

  it('executes registered runtime code-object resolvers when no per-run resolver is passed', async () => {
    const registeredConstantHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'server-kernel-registered',
    }));
    registerAiPathsRuntimeCodeObjectResolver(
      'test.server.registry.constant',
      ({ nodeType, codeObjectId }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? registeredConstantHandler
          : null
    );

    const result = await evaluateGraphServer({
      nodes: [buildConstantNode()],
      edges: [],
      runtimeKernelNodeTypes: ['constant'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(registeredConstantHandler).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-constant']?.['value']).toBe('server-kernel-registered');
  });

  it('scopes registered resolvers using runtimeKernelCodeObjectResolverIds', async () => {
    const ignoredHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'server-kernel-ignored',
    }));
    registerAiPathsRuntimeCodeObjectResolver('test.server.registry.ignored', () => ignoredHandler);

    const selectedHandler: NodeHandler = vi.fn(async () => ({
      status: 'completed',
      value: 'server-kernel-selected',
    }));
    registerAiPathsRuntimeCodeObjectResolver(
      'test.server.registry.selected',
      ({ nodeType, codeObjectId }) =>
        nodeType === 'constant' && codeObjectId === 'ai-paths.node-code-object.constant.v3'
          ? selectedHandler
          : null
    );

    const result = await evaluateGraphServer({
      nodes: [buildConstantNode()],
      edges: [],
      runtimeKernelNodeTypes: ['constant'],
      runtimeKernelCodeObjectResolverIds: ['test.server.registry.selected'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(ignoredHandler).not.toHaveBeenCalled();
    expect(selectedHandler).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-constant']?.['value']).toBe('server-kernel-selected');
  });

  it('executes compare nodes through default contract resolver bridge', async () => {
    const result = await evaluateGraphServer({
      nodes: [buildConstantNode(), buildCompareNode()],
      edges: [
        {
          id: 'edge-constant-compare',
          from: 'node-constant',
          to: 'node-compare',
          fromPort: 'value',
          toPort: 'value',
        },
      ],
      runtimeKernelNodeTypes: ['constant', 'compare'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-compare']?.['valid']).toBe(true);
    expect(result.outputs?.['node-compare']?.['value']).toBe('legacy');
  });

  it('falls back through compatibility handlers for unresolved non-contract runtime-kernel overrides', async () => {
    const resolveCodeObjectHandler = vi.fn(() => null);

    const result = await evaluateGraphServer({
      nodes: [buildFunctionNode()],
      edges: [],
      runtimeKernelNodeTypes: ['function'],
      resolveCodeObjectHandler,
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(resolveCodeObjectHandler).toHaveBeenCalledWith({
      nodeType: 'function',
      codeObjectId: 'ai-paths.node-code-object.function.v3',
    });
    expect(result.outputs?.['node-function']?.['value']).toBe('ok');
  });

  it('executes trigger nodes through default contract resolver bridge', async () => {
    const result = await evaluateGraphServer({
      nodes: [buildTriggerNode()],
      edges: [],
      runtimeKernelNodeTypes: ['trigger'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-trigger']?.['trigger']).toBe(true);
    expect(result.outputs?.['node-trigger']?.['triggerName']).toBe('manual');
  });

  it('executes prompt nodes through default contract resolver bridge', async () => {
    const result = await evaluateGraphServer({
      nodes: [buildPromptNode()],
      edges: [],
      runtimeKernelNodeTypes: ['prompt'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-prompt']?.['prompt']).toBe('hello-from-prompt');
  });

  it('executes audio_oscillator nodes through default contract resolver bridge', async () => {
    const result = await evaluateGraphServer({
      nodes: [buildAudioOscillatorNode()],
      edges: [],
      runtimeKernelNodeTypes: ['audio_oscillator'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(result.outputs?.['node-audio-osc']?.['status']).toBe('ready');
    expect(result.outputs?.['node-audio-osc']?.['frequency']).toBe(440);
  });

  it('feeds runtime-scoped live product_categories context into a downstream prompt on the server graph', async () => {
    schemaMock.mockResolvedValue({
      ok: true,
      data: {
        provider: 'mongodb',
        collections: [
          {
            name: 'product_categories',
            fields: [{ name: 'name_en', type: 'string' }],
          },
        ],
      },
    });
    browseMock.mockResolvedValue({
      ok: true,
      data: {
        provider: 'mongodb',
        collection: 'product_categories',
        documents: [
          { _id: 'root-1', name_en: 'Accessories', parentId: null, catalogId: 'catalog-1' },
          { _id: 'leaf-1', name_en: 'Movie Keychain', parentId: 'root-1', catalogId: 'catalog-1' },
        ],
        total: 2,
        limit: 50,
        skip: 0,
      },
    });

    const result = await evaluateGraphServer({
      nodes: [
        buildJsonConstantNode({
          id: 'node-product-context',
          title: 'Product Context',
          value: {
            catalogId: 'catalog-1',
            categoryId: 'leaf-1',
            title: 'Placeholder',
          },
        }),
        buildDbSchemaLiveContextNode(),
        buildCategoryShapeFunctionNode(),
        buildCategoryPromptNode(),
      ],
      edges: [
        {
          id: 'edge-context-db-schema',
          from: 'node-product-context',
          to: 'node-db-schema-live',
          fromPort: 'value',
          toPort: 'context',
        },
        {
          id: 'edge-context-function-bundle',
          from: 'node-product-context',
          to: 'node-category-shape',
          fromPort: 'value',
          toPort: 'bundle',
        },
        {
          id: 'edge-db-schema-function-context',
          from: 'node-db-schema-live',
          to: 'node-category-shape',
          fromPort: 'context',
          toPort: 'context',
        },
        {
          id: 'edge-function-prompt',
          from: 'node-category-shape',
          to: 'node-category-prompt',
          fromPort: 'bundle',
          toPort: 'bundle',
        },
      ],
      runtimeKernelNodeTypes: ['constant', 'db_schema', 'function', 'prompt'],
      reportAiPathsError: (): void => {},
    });

    expect(getMongoClientMock).toHaveBeenCalledTimes(1);
    expect(browseMock).toHaveBeenCalledWith(
      'product_categories',
      expect.objectContaining({
        provider: 'auto',
        limit: 50,
        query: '{\n  "catalogId": "catalog-1"\n}',
      })
    );
    expect(result.outputs?.['node-category-prompt']?.['prompt']).toContain(
      'Accessories > Movie Keychain'
    );
    expect(result.outputs?.['node-category-prompt']?.['prompt']).toContain('Movie Keychain');
  });
});
