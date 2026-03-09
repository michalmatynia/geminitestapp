import type { ContextNode } from '@/shared/contracts/ai-context-registry';

const SOURCE_REF = 'src/features/ai/ai-context-registry/registry/definitions/collections.ts';

export const collectionNodes: ContextNode[] = [
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
    id: 'collection:image-studio-projects',
    kind: 'collection',
    name: 'image_studio_projects',
    description:
      'Image Studio project records including canvas dimensions, project metadata, and workspace timestamps.',
    tags: ['image-studio', 'projects', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:image-studio-slots' },
      { type: 'related_to', targetId: 'collection:image-studio-runs' },
      { type: 'related_to', targetId: 'collection:image-studio-sequence-runs' },
      { type: 'related_to', targetId: 'action:image-studio-run' },
      { type: 'related_to', targetId: 'action:image-studio-sequence-run' },
      { type: 'related_to', targetId: 'action:product-studio-send' },
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
    id: 'collection:image-studio-slots',
    kind: 'collection',
    name: 'image_studio_slots',
    description:
      'Image Studio slot records for imported assets, generated variants, composite layers, and per-slot metadata.',
    tags: ['image-studio', 'slots', 'assets', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:image-studio-projects' },
      { type: 'related_to', targetId: 'collection:image-studio-runs' },
      { type: 'related_to', targetId: 'collection:image-studio-sequence-runs' },
      { type: 'related_to', targetId: 'action:image-studio-run' },
      { type: 'related_to', targetId: 'action:image-studio-sequence-run' },
      { type: 'related_to', targetId: 'action:product-studio-send' },
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
    id: 'collection:image-studio-runs',
    kind: 'collection',
    name: 'image_studio_runs',
    description:
      'Queued and completed Image Studio run records including request payloads, output images, history events, and dispatch state.',
    tags: ['image-studio', 'runs', 'generation', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:image-studio-projects' },
      { type: 'related_to', targetId: 'collection:image-studio-slots' },
      { type: 'related_to', targetId: 'collection:image-studio-sequence-runs' },
      { type: 'related_to', targetId: 'action:image-studio-run' },
      { type: 'related_to', targetId: 'action:image-studio-sequence-run' },
      { type: 'related_to', targetId: 'action:product-studio-send' },
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
    id: 'collection:image-studio-sequence-runs',
    kind: 'collection',
    name: 'image_studio_sequence_runs',
    description:
      'Image Studio sequence run records including step plans, current slot lineage, nested generation state, and streaming history events.',
    tags: ['image-studio', 'sequence', 'runs', 'workflow', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:image-studio-projects' },
      { type: 'related_to', targetId: 'collection:image-studio-slots' },
      { type: 'related_to', targetId: 'collection:image-studio-runs' },
      { type: 'related_to', targetId: 'action:image-studio-sequence-run' },
      { type: 'related_to', targetId: 'action:product-studio-send' },
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
    id: 'collection:kangur-progress',
    kind: 'collection',
    name: 'kangur_progress',
    description:
      'Learner progress state for Kangur including XP, badges, lesson mastery, and aggregated counters.',
    tags: ['kangur', 'progress', 'education', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-scores' },
      { type: 'related_to', targetId: 'collection:kangur-assignments' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-scores',
    kind: 'collection',
    name: 'kangur_scores',
    description:
      'Historical practice and test results for Kangur learners including operation, accuracy, score, and timestamps.',
    tags: ['kangur', 'scores', 'education', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-progress' },
      { type: 'related_to', targetId: 'collection:kangur-assignments' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-assignments',
    kind: 'collection',
    name: 'kangur_assignments',
    description:
      'Delegated Kangur lesson and practice assignments, including progress state and parent-created targets.',
    tags: ['kangur', 'assignments', 'education', 'database'],
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-progress' },
      { type: 'related_to', targetId: 'collection:kangur-scores' },
      { type: 'related_to', targetId: 'collection:kangur-lessons' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-login-activity',
    kind: 'collection',
    name: 'kangur_login_activity',
    description:
      'Recent Kangur parent login and learner sign-in activity derived from the shared activity log and scoped to Kangur tutoring context.',
    tags: ['kangur', 'auth', 'login', 'activity'],
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-progress' },
      { type: 'related_to', targetId: 'collection:kangur-assignments' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-08T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-lessons',
    kind: 'collection',
    name: 'kangur_lessons',
    description:
      'Kangur lesson catalog and lesson document content authored in settings-backed storage.',
    tags: ['kangur', 'lessons', 'content', 'education'],
    relationships: [
      { type: 'related_to', targetId: 'collection:kangur-assignments' },
      { type: 'related_to', targetId: 'action:kangur-lesson-tts' },
      { type: 'related_to', targetId: 'page:kangur-admin-lessons-manager' },
    ],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
  {
    id: 'collection:kangur-test-suites',
    kind: 'collection',
    name: 'kangur_test_suites',
    description:
      'Settings-backed Kangur test suites and question banks used by learner test practice and tutor review flows.',
    tags: ['kangur', 'tests', 'questions', 'education'],
    relationships: [{ type: 'related_to', targetId: 'policy:kangur-ai-tutor-test-guardrails' }],
    permissions: {
      readScopes: ['ctx:read'],
      riskTier: 'low',
      classification: 'internal',
    },
    version: '1.0.0',
    updatedAtISO: '2026-03-07T00:00:00.000Z',
    source: { type: 'code', ref: SOURCE_REF },
  },
];
