import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/actions.ts';

export const actionNodesPart3: ContextNode[] = [
  {
    id: 'action:image-studio-ai-path-object-analysis',
    kind: 'action',
    name: 'Image Studio AI Paths Object Analysis',
    description:
      'Runs an AI Paths graph from Image Studio to detect object bounds, then applies the result back into the current page workspace using the shared context registry envelope.',
    tags: ['image-studio', 'ai-paths', 'analysis', 'object-detection', 'ai'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-image-studio' },
      { type: 'uses', targetId: 'component:image-studio-center-preview' },
      { type: 'uses', targetId: 'component:image-studio-right-sidebar' },
      { type: 'uses', targetId: 'action:run-ai-path' },
      { type: 'reads', targetId: 'collection:image-studio-slots' },
      { type: 'writes', targetId: 'collection:ai-path-runs' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      proposeScopes: ['ctx:propose'],
      executeScopes: ['ctx:execute'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'action:image-studio-prompt-extract',
    kind: 'action',
    name: 'Image Studio Prompt Extract',
    description:
      'Runs programmatic or model-assisted prompt parameter extraction using the current Image Studio page context registry envelope.',
    tags: ['image-studio', 'prompt', 'params', 'extraction', 'ai'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-image-studio' },
      { type: 'uses', targetId: 'component:image-studio-right-sidebar' },
      { type: 'reads', targetId: 'collection:image-studio-projects' },
      { type: 'reads', targetId: 'collection:image-studio-slots' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      proposeScopes: ['ctx:propose'],
      executeScopes: ['ctx:execute'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'action:image-studio-ui-extractor',
    kind: 'action',
    name: 'Image Studio UI Extractor',
    description:
      'Suggests prompt parameter UI controls for Image Studio using the current page context registry envelope and prompt workspace state.',
    tags: ['image-studio', 'prompt', 'ui', 'controls', 'ai'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-image-studio' },
      { type: 'uses', targetId: 'component:image-studio-right-sidebar' },
      { type: 'reads', targetId: 'collection:image-studio-projects' },
      { type: 'reads', targetId: 'collection:image-studio-slots' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      proposeScopes: ['ctx:propose'],
      executeScopes: ['ctx:execute'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'action:image-studio-mask-ai',
    kind: 'action',
    name: 'Image Studio Mask AI',
    description:
      'Generates bounding-box or polygon masks for the active Image Studio slot using the current page context registry envelope.',
    tags: ['image-studio', 'mask', 'selection', 'vision', 'ai'],
    relationships: [
      { type: 'uses', targetId: 'page:admin-image-studio' },
      { type: 'uses', targetId: 'component:image-studio-center-preview' },
      { type: 'reads', targetId: 'collection:image-studio-slots' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      proposeScopes: ['ctx:propose'],
      executeScopes: ['ctx:execute'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
