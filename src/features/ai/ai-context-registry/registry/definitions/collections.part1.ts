import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/collections.ts';

export const collectionNodesPart1: ContextNode[] = [
  {
    id: 'collection:products',
    kind: 'collection',
    name: 'products',
    description:
      'MongoDB collection storing product records. Each product has a SKU, ' +
      'name, description, price, status, images, and taxonomy tags.',
    tags: ['products', 'mongo', 'database', 'catalog'],
    relationships: [
      { type: 'related_to', targetId: 'collection:orders' },
      { type: 'related_to', targetId: 'action:product-validator-runtime-evaluate' },
      { type: 'related_to', targetId: 'action:product-studio-send' },
    ],
    jsonSchema2020: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        _id: { type: 'string' },
        sku: { type: 'string' },
        name: { type: 'object', description: 'Localized string map' },
        price: { type: 'number' },
        status: { type: 'string', enum: ['active', 'draft', 'archived'] },
        tags: { type: 'array', items: { type: 'string' } },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:orders',
    kind: 'collection',
    name: 'orders',
    description:
      'Collection of customer orders. Contains line items, shipping details, ' +
      'payment status, and fulfillment timestamps.',
    tags: ['orders', 'commerce', 'database'],
    relationships: [{ type: 'related_to', targetId: 'collection:products' }],
    jsonSchema2020: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        _id: { type: 'string' },
        customerId: { type: 'string' },
        status: {
          type: 'string',
          enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        },
        total: { type: 'number' },
        lineItems: { type: 'array' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:ai-path-runs',
    kind: 'collection',
    name: 'ai_path_runs',
    description:
      'Stores historical AI path execution records including status, node-level outputs, ' +
      'events, and runtime state snapshots.',
    tags: ['ai', 'paths', 'runs', 'database', 'automation'],
    relationships: [
      { type: 'related_to', targetId: 'action:run-ai-path' },
      { type: 'related_to', targetId: 'action:image-studio-ai-path-object-analysis' },
      { type: 'related_to', targetId: 'page:brain' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-01-01T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:ai-path-playwright-runs',
    kind: 'collection',
    name: 'ai_path_playwright_runs',
    description:
      'File-backed run records for AI Paths Playwright node executions, including browser artifacts, logs, result payloads, and resolved Context Registry workspace bundles available to the runtime.',
    tags: ['ai-paths', 'playwright', 'automation', 'artifacts', 'runtime'],
    relationships: [
      { type: 'related_to', targetId: 'page:ai-paths' },
      { type: 'related_to', targetId: 'action:ai-paths-playwright-run' },
      { type: 'related_to', targetId: 'collection:ai-path-runs' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:cms-pages',
    kind: 'collection',
    name: 'cms_pages',
    description:
      'CMS page records including section components, SEO fields, publication state, slugs, and theme bindings.',
    tags: ['cms', 'pages', 'content', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:cms-themes' },
      { type: 'related_to', targetId: 'action:cms-css-ai-stream' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:cms-themes',
    kind: 'collection',
    name: 'cms_themes',
    description:
      'CMS theme records including color schemes, typography, spacing, custom CSS, and brand assets.',
    tags: ['cms', 'themes', 'design', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:cms-pages' },
      { type: 'related_to', targetId: 'action:cms-css-ai-stream' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:agent-teaching-agents',
    kind: 'collection',
    name: 'agent_teaching_agents',
    description:
      'Stored learner agent configurations including system prompts, retrieval settings, and linked embedding collections.',
    tags: ['agent-creator', 'teaching', 'agents', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:agent-teaching-embedding-collections' },
      { type: 'related_to', targetId: 'action:agent-teaching-chat' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:agent-teaching-embedding-collections',
    kind: 'collection',
    name: 'agent_teaching_embedding_collections',
    description:
      'Embedding-backed collections used by learner agents for retrieval-augmented responses and source grounding.',
    tags: ['agent-creator', 'teaching', 'embeddings', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:agent-teaching-agents' },
      { type: 'related_to', targetId: 'action:agent-teaching-chat' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:chatbot-sessions',
    kind: 'collection',
    name: 'chatbot_sessions',
    description:
      'Persisted chatbot conversation sessions including titles, persona assignments, settings snapshots, and message history.',
    tags: ['chatbot', 'admin', 'sessions', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'action:chatbot-chat' },
      { type: 'related_to', targetId: 'page:admin-chatbot' },
      { type: 'related_to', targetId: 'page:brain' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-09T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
