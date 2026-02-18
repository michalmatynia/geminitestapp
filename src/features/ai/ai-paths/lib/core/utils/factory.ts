import type { AiNode, Edge, PathConfig, PathMeta } from '@/shared/types/domain/ai-paths';

import {
  CONTEXT_INPUT_PORTS,
  CONTEXT_OUTPUT_PORTS,
  DEFAULT_CONTEXT_ROLE,
  STORAGE_VERSION,
  initialEdges,
  initialNodes,
  triggers,
} from '../constants';

export const createPathId = (): string =>
  `path_${Math.random().toString(36).slice(2, 8)}`;

export const createPresetId = (): string =>
  `preset_${Math.random().toString(36).slice(2, 8)}`;

export const createDefaultPathConfig = (id: string): PathConfig => {
  const now = new Date().toISOString();
  return {
    id,
    version: STORAGE_VERSION,
    name: 'AI Description Path',
    description: 'Visual analysis + description generation with structured updates.',
    trigger: triggers[0] ?? 'Product Modal - Context Filter',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    nodes: initialNodes,
    edges: initialEdges,
    updatedAt: now,
    isLocked: false,
    isActive: true,
    parserSamples: {},
    updaterSamples: {},
    runtimeState: { inputs: {}, outputs: {} },
    lastRunAt: null,
    runCount: 0,
    uiState: {
      selectedNodeId: initialNodes[0]?.id ?? null,
      configOpen: false,
    },
  };
};

export const createPathMeta = (config: PathConfig): PathMeta => {
  const fallbackName = `Path ${config.id.slice(0, 6)}`;
  const resolvedName =
    typeof config.name === 'string' && config.name.trim().length > 0
      ? config.name.trim()
      : fallbackName;
  return {
    id: config.id,
    name: resolvedName,
    createdAt: config.updatedAt,
    updatedAt: config.updatedAt,
  };
};

export const createAiDescriptionPath = (id: string): PathConfig => {
  const now = new Date().toISOString();
  const nodes: AiNode[] = [
    {
      id: 'node-context',
      type: 'context',
      title: 'Context Filter',
      description: 'Filter product context.',
      inputs: CONTEXT_INPUT_PORTS,
      outputs: CONTEXT_OUTPUT_PORTS,
      position: { x: 470, y: 600 },
      config: {
        context: {
          role: DEFAULT_CONTEXT_ROLE,
          scopeMode: 'full',
          scopeTarget: 'entity',
          includePaths: [],
          excludePaths: [],
        },
      },
    },
    {
      id: 'node-parser',
      type: 'parser',
      title: 'JSON Parser',
      description: 'Extract [images], [title], [productId], [content_en].',
      inputs: ['entityJson'],
      outputs: ['images', 'title', 'productId', 'content_en'],
      position: { x: 770, y: 600 },
      config: {
        parser: {
          mappings: {
            images: '$.images',
            title: '$.title',
            productId: '$.id',
            content_en: '$.content_en',
          },
        },
      },
    },
    {
      id: 'node-ai-desc',
      type: 'ai_description',
      title: 'AI Description Generator',
      description: 'Generate description_en from product context.',
      inputs: ['entityJson', 'images', 'title'],
      outputs: ['description_en'],
      position: { x: 1090, y: 600 },
      config: {
        description: {
          visionOutputEnabled: true,
          generationOutputEnabled: true,
        },
      },
    },
    {
      id: 'node-desc-updater',
      type: 'description_updater',
      title: 'Description Updater',
      description: 'Write description_en to the product.',
      inputs: ['productId', 'description_en'],
      outputs: ['description_en'],
      position: { x: 1410, y: 600 },
    },
    {
      id: 'node-viewer',
      type: 'viewer',
      title: 'Result Viewer',
      description: 'Preview description + runtime outputs.',
      inputs: ['description', 'description_en', 'context', 'meta', 'trigger', 'triggerName'],
      outputs: [],
      position: { x: 1730, y: 600 },
      config: {
        viewer: {
          outputs: {
            description_en: '',
            context: '',
            meta: '',
            trigger: '',
            triggerName: '',
            description: '',
          },
        },
      },
    },
  ];

  const edges: Edge[] = [
    {
      id: 'edge-1',
      from: 'node-context',
      to: 'node-parser',
      fromPort: 'entityJson',
      toPort: 'entityJson',
    },
    {
      id: 'edge-2',
      from: 'node-parser',
      to: 'node-ai-desc',
      fromPort: 'title',
      toPort: 'title',
    },
    {
      id: 'edge-3',
      from: 'node-parser',
      to: 'node-ai-desc',
      fromPort: 'images',
      toPort: 'images',
    },
    {
      id: 'edge-4',
      from: 'node-context',
      to: 'node-ai-desc',
      fromPort: 'entityJson',
      toPort: 'entityJson',
    },
    {
      id: 'edge-5',
      from: 'node-ai-desc',
      to: 'node-desc-updater',
      fromPort: 'description_en',
      toPort: 'description_en',
    },
    {
      id: 'edge-6',
      from: 'node-parser',
      to: 'node-desc-updater',
      fromPort: 'productId',
      toPort: 'productId',
    },
    {
      id: 'edge-7',
      from: 'node-desc-updater',
      to: 'node-viewer',
      fromPort: 'description_en',
      toPort: 'description_en',
    },
  ];

  return {
    id,
    version: STORAGE_VERSION,
    name: 'AI Description Path',
    description: 'Generates product descriptions via AI and updates the product.',
    trigger: triggers[0] ?? 'Product Modal - Context Filter',
    executionMode: 'server',
    flowIntensity: 'medium',
    runMode: 'block',
    nodes,
    edges,
    updatedAt: now,
    isLocked: false,
    isActive: true,
    parserSamples: {},
    updaterSamples: {},
    runtimeState: { inputs: {}, outputs: {} },
    lastRunAt: null,
    runCount: 0,
    uiState: {
      selectedNodeId: nodes[0]?.id ?? null,
      configOpen: false,
    },
  };
};
