---
title: Copilot Instructions for geminitestapp
last_updated: 2026-03-26
scope: next.js, monorepo, full-stack
---

# Copilot Instructions for geminitestapp

This repository is a large Next.js App Router platform with an admin system, CMS frontend, REST API surface, Expo mobile app, and shared packages. These instructions help Copilot sessions understand the architecture and conventions.

## Running the Application

### Development

```bash
npm run dev                 # Start root Next.js app (http://localhost:3000)
npm run dev:mobile         # Start Expo development server
npm run typecheck          # TypeScript check (incremental, faster than baseline)
npm run typecheck:baseline # Full TypeScript check (clears cache first)
npm run lint               # ESLint on src/ (8GB heap)
npm run lint:baseline      # ESLint with 12GB heap for larger changes
```

### Building

```bash
npm run build              # Build Next.js app (runs prebuild cleanup first)
npm run build:webpack      # Build with webpack fallback
npm run start              # Run production server
```

### Testing

```bash
npm run test               # Run all unit tests (vitest, jsdom)
npm run test:unit          # Explicit unit test alias
npm run test:unit:domains  # Unit tests grouped by domain with timing
npm run test:critical-flows # Core workflow tests
npm run test:e2e           # Playwright e2e tests (starts npm run dev unless PLAYWRIGHT_USE_EXISTING_SERVER=true)
```

**Running a single test:**

```bash
# Unit test
npx vitest run --project unit src/features/products/__tests__/example.test.ts

# E2E test
node scripts/testing/run-playwright-suite.mjs e2e/features/products/example.spec.ts

# Specific e2e test by grep pattern
node scripts/testing/run-playwright-suite.mjs e2e/features/products/example.spec.ts --grep "pattern"
```

### Architecture Validation

```bash
npm run metrics:collect    # Collect baseline metrics (modules, routes, etc.)
npm run metrics:hotspots   # Identify coupling hotspots
npm run check:factory-meta # Verify query factory metadata
npm run bun:check:architecture-guardrails  # Check architecture constraints
npm run bun:check:docs-structure # Validate docs organization
```

## High-Level Architecture

### Workspace Structure

- **Root app** (`src/`, `src/app/`, `src/features/`, `src/shared/`): Next.js web + admin + API
- **Mobile app** (`apps/mobile/`): Expo Router app for iOS, Android, and web preview
- **Packages**:
  - `packages/kangur-contracts`: Shared DTOs and cross-platform schemas
  - `packages/kangur-core`: Domain logic (learner, game, profile)
  - `packages/kangur-api-client`: Transport layer for Kangur HTTP APIs
  - `packages/kangur-platform`: Platform integration and runtime boundaries

### Route Topology

- **Admin** (`src/app/(admin)/admin`): Authenticated user-gated platform (ChatBot, AI Paths, Image Studio, CMS, etc.)
- **Frontend** (`src/app/(frontend)`): Public CMS pages and learner experience
- **Auth** (`src/app/auth`): Sign-in and registration pages
- **API** (`src/app/api`): 285+ REST routes across 30+ feature domains

### Key Runtime Components

- **Server**: Uses custom `server.cjs` instead of Next CLI (enforces Node >=20.9, <24)
- **Instrumentation** (`src/instrumentation.ts`): Loads Node-specific setup, database validation, queue init, error handlers
- **Proxy** (`src/proxy.ts`): Routes `/admin/:path*` and `/api/:path*` with auth/CSRF handling
- **Root layout** (`src/app/layout.tsx`): Wires 10+ global providers (Query, Session, Theme, CSRF, Background Sync, etc.)

### Feature Architecture (27 domains)

Major feature areas:

- **AI**: `agentcreator`, `ai-paths`, `chatbot`, `image-studio`, `insights`, `ai-context-registry`, `agent-runtime`
- **Platform**: `cms`, `products`, `files`, `integrations`, `database`, `kangur`, `notesapp`
- **Tools**: `drafter`, `filemaker`, `case-resolver`, `prompt-engine`, `prompt-exploder`, `viewer3d`

Verify structure with `docs/README.md` and `docs/platform/` hierarchy.

### Data Layer

- **Primary DB**: MongoDB (required at startup via `src/instrumentation.ts`)
- **Optional Cache**: Redis (queue fallback to inline if unavailable)
- **Database Engine Policy** (`src/shared/lib/db`): Per-service provider routing, policy flags, backup scheduling
- **Auth Provider**: NextAuth v5 beta with Mongo adapter, configurable via `src/shared/lib/auth/services/auth-provider.ts`

### Async Work and Queues

- **BullMQ + ioredis**: Queue infrastructure in `src/shared/lib/queue`
- **Job families**: Product AI, AI Paths runs, chatbot, agent runtime, image studio, DB backup, Tradera sync, CMS imports
- **Fallback**: Without Redis, jobs execute inline (controlled by `AI_JOBS_INLINE`)
- **AI Paths specifics**: Default concurrency 3, timeout 10 minutes, recovery for stale runs, Brain-gated startup

## AI/ML Patterns

This repo has first-class AI capabilities as a core platform concern, not a thin addon. Key AI subsystems:

### AI Paths: Graph-Based Workflow Runtime

AI Paths (`src/features/ai/ai-paths/`, `src/shared/lib/ai-paths/`) is a node-based workflow engine for orchestrating AI, automation, data transformation, and side effects.

**Key concepts:**
- **Path**: directed graph of typed nodes and edges
- **Node**: execution unit with inputs, outputs, and configuration
- **Context**: mutable run state shared across node execution
- **Run**: one execution instance; tracked with observability, timeline, and event inspection
- **Triggers**: UI actions or events that start runs (e.g., Trigger Buttons, product flows)

**Node families currently available:**
- LLM nodes: prompt-based reasoning and classification (OpenAI, Anthropic, Gemini, Ollama)
- Data nodes: database queries, transformations, aggregations
- Logic nodes: conditionals, loops, branching (respecting guardrails on runaway execution)
- Side-effect nodes: database writes, notifications, webhooks
- Learner agent nodes: domain-specific reasoning for tutoring contexts
- HTTP nodes: external API calls

**Runtime behavior:**
- Compile/validation passes before execution
- Queued via BullMQ (or inline if Redis unavailable)
- Default concurrency: 3, default timeout: 10 minutes
- Explicit lease-blocking for contested runs
- Handoff-ready state for manual intervention (see `docs/platform/ai-paths-resume-vs-handoff.md`)
- Run cancel/retry/resume/handoff endpoints: `POST /api/ai-paths/runs/[runId]/{resume,handoff,cancel,retry-node}`
- Dead-letter queue with requeue: `POST /api/ai-paths/runs/dead-letter/requeue`

**Prompt design standard:**
- Single responsibility per prompt node
- Explicit output contract (plain text or strict JSON schema)
- Low temperature for deterministic classification/extraction
- Include source evidence block in prompt input when possible
- Provide deterministic fallback when confidence is low

**Testing and rollout:**
- Unit tests for handlers and transforms
- Integration tests for full path behavior
- Before rollout: clone active path, run A/B checks, compare success rate / quality / latency
- Gradual enablement by trigger scope, then promote to default
- Document root cause and guardrail changes for failures

**Observability:** Check `POST /api/ai-paths/runs/analytics` and `/admin/ai-paths` for run timelines, node inputs/outputs, and execution state.

**Reference docs:**
- Deep reference: `docs/ai-paths/reference.md` (runtime guardrails, failure playbook, documentation governance)
- Semantic grammar: `docs/ai-paths/semantic-grammar/` (node types, port contracts, schema)
- Prompt Exploder tooltips: `docs/prompt-exploder/tooltip-catalog.ts` (reference via `src/features/prompt-exploder/docs/`)

### AI Brain: Model and Provider Management

AI Brain (`src/shared/lib/ai-brain/`) is the centralized catalog and routing system for LLM models and providers.

**Key responsibilities:**
- Provider catalog: OpenAI, Anthropic, Gemini, Ollama (self-hosted)
- Model routing: assign models to AI Paths, AI Insights, Chatbot, Image Studio, Agent Creator based on settings
- Provider credentials: encrypted storage and runtime credential resolution
- Settings-driven provider override: fallback to defaults if not configured

**Key modules:**
- `provider-metadata.ts`: Model capabilities, cost, token limits, feature flags
- `provider-credentials.ts`: Credential encryption/decryption at runtime
- `catalog-entries.ts`: Catalog tree structure
- `useBrainRuntime.ts`: React hook for Brain context (model selection, provider state)
- `server-runtime-client.ts`: Server-side model invocation
- `server-embeddings-client.ts`: Vector embeddings client (for semantic search, RAG)

**Usage pattern (server-side):**
```typescript
import { getServerBrainRuntime } from '@/shared/lib/ai-brain';
const brain = await getServerBrainRuntime();
const model = brain.resolveModel('ai_paths.model'); // Route to AI Paths default
const result = await brain.invokeLLM(model, prompt, { temperature: 0.3 });
```

**Admin interface:** `/admin/brain` for provider configuration, model assignments, credential management, and provider metrics.

### Image Studio: AI Image Generation Platform

Image Studio (`src/features/ai/image-studio/`) orchestrates image generation, editing, upscaling, and variation workflows.

**Key features:**
- Text-to-image generation (via configured LLM/provider)
- Image-to-image editing and variation
- Upscaling via third-party providers
- Prompt refinement and safety checks
- Run queue with job tracking

**Job queue:** `src/features/ai/image-studio/workers/` manages run and sequence queues.

**Admin interface:** `/admin/image-studio` for generation, history, and run inspection.

### Chatbot: Conversational AI

Chatbot (`src/features/ai/chatbot/`) provides real-time conversational interaction with AI models.

**Key features:**
- Multi-turn conversation threading
- Message history and context windowing
- Typing indicators and streaming responses
- Persona and tone configuration
- Conversation export and analytics

**Job queue:** Async job handling for long-running chat operations.

**Admin interface:** `/admin/chatbot` for configuration, conversation history, and user interactions.

### Agent Creator: Persona and Agent Configuration

Agent Creator (`src/features/ai/agentcreator/`) enables building reusable AI personas and agents.

**Key features:**
- Persona definition: behavior, tone, knowledge base
- Agent templates and variants
- System prompt management
- Agent publishing and versioning

### AI Insights: Analytics and Intelligence

AI Insights (`src/features/ai/insights/`) generates AI-powered analytics and insights about platform activity.

**Key features:**
- Automated report generation
- Anomaly detection
- Trend analysis
- Actionable recommendations

### AI Context Registry: Knowledge Integration

AI Context Registry (`src/features/ai/ai-context-registry/`) manages knowledge sources, embeddings, and semantic search for RAG (Retrieval-Augmented Generation).

**Key features:**
- Knowledge base indexing
- Embedding generation and storage
- Semantic search and retrieval
- Context injection into LLM calls

### Agent Runtime: Autonomous Agent Execution

Agent Runtime (`src/features/ai/agent-runtime/`) enables autonomous agents to perform complex multi-step tasks.

**Key features:**
- Goal-driven task planning
- Tool/action invocation
- Error recovery and retry logic
- Execution monitoring and observability

### LLM Provider Integration

**Supported providers:**
- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo (via `OPENAI_API_KEY`)
- **Anthropic**: Claude 3 models (via `ANTHROPIC_API_KEY`)
- **Google Gemini**: Gemini Pro (via `GEMINI_API_KEY`)
- **Ollama**: Self-hosted local models (via `OLLAMA_BASE_URL`)

**Provider selection logic:**
1. Check `NEXTAUTH_SECRET` at startup; validate Brain configuration
2. Resolve model assignment from settings (`resolveCurrentModelId()` in Brain runtime)
3. Fall back to environment default if not configured
4. Throw error if required provider is not available

**Credential handling:**
- Credentials stored encrypted in database (via `INTEGRATION_ENCRYPTION_KEY`)
- Decrypted at runtime when invoking LLMs
- Never logged or exposed in error messages
- Rotated via `/admin/brain` > Providers tab

**Cost and quota management:**
- Token counts tracked per request
- Model cost metadata in provider catalog
- Rate limiting: check `ENABLE_RATE_LIMITS` / `DISABLE_RATE_LIMITS`
- Queue-based request batching to avoid provider throttling

### Common AI Workflows

**1. Prompt with Chain-of-Thought:**
```typescript
const result = await brain.invokeLLM(model, `
Given the product: ${product.name}
Category: ${product.category}

Step 1: Identify key features
Step 2: Generate marketing copy
Step 3: Validate for tone consistency

Output JSON: { title: string; description: string }
`, { temperature: 0.7 });
```

**2. Semantic Search (RAG):**
```typescript
const embeddings = await brain.embeddings(userQuery);
const docs = await aiContextRegistry.search(embeddings, { limit: 5 });
const augmentedPrompt = `${userQuery}\n\nContext:\n${docs.map(d => d.content).join('\n')}`;
const answer = await brain.invokeLLM(model, augmentedPrompt);
```

**3. Image Generation with Refinement:**
```typescript
const image = await imageStudio.generateImage({
  prompt: userPrompt,
  model: 'dall-e-3',
  size: '1024x1024',
});
const refined = await imageStudio.upscale(image.id, { factor: 2 });
```

**4. Multi-step AI Path (Graph Execution):**
```typescript
const run = await aiPaths.enqueue({
  pathId: 'product-content-generation',
  trigger: { productId, category },
  inputs: { productData },
});
// Monitor via /admin/ai-paths > Runs, or webhook callback
```

### Error Handling and Safety

**Key guardrails:**
- Validate required fields before side effects (e.g., database writes)
- Gate database writes behind quality checks for AI-generated text
- Use explicit `idField`, `queryTemplate`, `skipEmpty` safeguards
- Cap retries/loops to prevent runaway runs
- Surface lease contention and handoff explicitly instead of retrying hidden concurrent mutations
- Always expose observability payloads for drop/accept/write decisions

**Common errors:**
- Provider not configured → check `/admin/brain` > Providers
- Model not available → ensure credentials are valid and provider is responding
- Rate limit exceeded → queue is backing off; check `/admin/system` > Activity
- Image generation timeout → default 10 minutes; adjust `AI_PATHS_JOB_TIMEOUT_MS`
- Embedding failed → check `AI_CONTEXT_REGISTRY_EMBEDDING_PROVIDER` setting

## Key Conventions

### Feature Boundaries and Entrypoints

The codebase enforces explicit feature boundaries via ESLint and architecture checks. This prevents hidden coupling and makes dependencies visible.

**The Rule: Use Public/Server Entrypoints**

When importing from `src/features/<feature>` in app routes:

❌ **Never do this:**
```typescript
// FORBIDDEN - deep imports
import { useProductQuery } from '@/features/products/hooks/useProductQuery';
import { ProductForm } from '@/features/products/components/ProductForm';
import { validateProduct } from '@/features/products/utils/validators';
```

✅ **Always do this:**
```typescript
// REQUIRED - use public entrypoint
import { useProductQuery, ProductForm, validateProduct } from '@/features/products/public';
```

✅ **Or for server-only code (RSC, API routes):**
```typescript
// Server entrypoint for server runtime
import { getProductRepository } from '@/features/products/server';
```

**Why this matters:**
- Makes all dependencies visible: `public.ts` and `server.ts` are the feature's API contract
- Decouples feature internals from app code: refactor safely without breaking imports
- Enables architecture metrics: `npm run metrics:collect` tracks cross-feature coupling
- Enforced by ESLint: violating this blocks CI/CD

**How Entrypoints Work**

**`public.ts`** – Client-safe, publicly exported from the feature:
```typescript
// src/features/products/public.ts
export { ProductForm } from './components/ProductForm';
export { useProductQuery, useCreateProduct } from './hooks/useProductQueries';
export type { ProductFormProps } from './components/ProductForm';
export * from '@/shared/contracts/products'; // Re-export shared types
```

Used by: page components, client layout code, other client-side features.

**`server.ts`** – Server-only exports (marked with `import 'server-only'`):
```typescript
// src/features/products/server.ts
import 'server-only';

export { getProductRepository } from './repositories/ProductRepository';
export { enrichProductWithAI } from './services/product-ai-service';
export * from '@/shared/contracts/products';
```

Used by: API routes, server components (RSC), background jobs.

**Pattern: What Goes Where**

| Item | `public.ts` | `server.ts` | Direct Deep Import |
|------|-------------|-------------|-------------------|
| UI Components | ✅ | ❌ | ❌ |
| Hooks (client-side) | ✅ | ❌ | ❌ |
| Query factories | ✅ | ❌ | ❌ |
| Types / Contracts | ✅ | ✅ | ❌ |
| Repositories | ❌ | ✅ | ❌ |
| Server services | ❌ | ✅ | ❌ |
| API handler logic | ❌ | ✅ (via `handler.ts`) | ❌ |
| Internal utils | ❌ | ❌ | ❌ |

**API Routes Pattern**

For `src/app/api/**/*` routes, follow the **handler separation pattern**:

```typescript
// src/app/api/products/[id]/route.ts
import { apiHandler } from '@/shared/lib/api-handler';
import { handleGetProduct, handleUpdateProduct } from './handler';

export const GET = apiHandler(handleGetProduct);
export const PUT = apiHandler(handleUpdateProduct);

// src/app/api/products/[id]/handler.ts
import { getProductRepository } from '@/features/products/server';
import type { ApiRequest } from '@/shared/contracts/http';

export async function handleGetProduct(req: ApiRequest<{ id: string }>) {
  const { id } = req.params;
  const repo = getProductRepository();
  return repo.getById(id);
}
```

**Why separate:**
- Route config (`runtime`, `dynamic`, `revalidate`) stays in `route.ts` for visibility
- Heavy logic goes in `handler.ts` or `route-handler.ts` for readability
- Easier to test handler functions independently
- Prevents `route.ts` from becoming massive

**Enforced via:**
- ESLint rule: `no-bare-features` (forbids `@/features/<feature>` without `/public` or `/server`)
- Architecture check: `npm run check:route-policies` (validates route config, handler exports)

**Cross-Feature Dependencies**

Features can depend on other features, but only via public entrypoints:

```typescript
// src/features/ai-paths/hooks/useRunProduct.ts
import { useProductQuery } from '@/features/products/public'; // ✅ OK
import { useCreateProduct } from '@/features/products/public'; // ✅ OK
// import { ProductForm } from '@/features/products/components/ProductForm'; // ❌ NO
```

Circular dependencies are not allowed. Use the architecture check to verify:

```bash
npm run check:architecture-guardrails
```

**Common Anti-Pattern: Shared Internal Utils**

❌ **Wrong: Using internal utils:**
```typescript
// src/features/products/utils/validation.ts (internal)
import { validateProduct } from '@/features/products/utils/validation'; // ❌ NO
```

✅ **Right: Export via public entrypoint:**
```typescript
// src/features/products/public.ts
export { validateProduct } from './utils/validation';

// Usage:
import { validateProduct } from '@/features/products/public'; // ✅ OK
```

**Feature Structure Best Practice**

```
src/features/products/
├── public.ts           # ← Client-safe entrypoint
├── server.ts           # ← Server-only entrypoint
├── components/         # UI components (exported via public.ts)
├── hooks/              # React hooks (exported via public.ts)
├── pages/              # Page components (exported via public.ts)
├── repositories/       # Data access (exported via server.ts)
├── services/           # Business logic (exported via server.ts)
├── utils/              # Helpers (NOT exported directly; use public/server)
├── types.ts            # Types (exported via public.ts and server.ts)
└── api.ts              # API client helpers (exported via public.ts)
```

**Checking for Violations**

Run these regularly:

```bash
# Find all deep imports from features (will fail if any exist)
npm run check:architecture-guardrails

# View architecture metrics (includes cross-feature edges)
npm run metrics:collect
npm run metrics:hotspots

# View detailed coupling report
npm run check:architecture-guardrails --summary-json
```

If a violation is found, the linter output will tell you:
```
error: Feature deep import detected
  '@/features/products/components/ProductForm' should be '@/features/products/public'
```

**When Adding a New Feature**

1. Create `src/features/<feature-name>/public.ts` – export all client-facing code
2. Create `src/features/<feature-name>/server.ts` – export server-only helpers (with `import 'server-only'`)
3. Organize internal code in `components/`, `hooks/`, `pages/`, `services/`, `repositories/`, etc.
4. Never use bare `@/features/<feature-name>` imports from app routes
5. Run `npm run check:architecture-guardrails` to verify compliance

### Query and Data Fetching (TanStack Query Factory Pattern)

This codebase enforces a **mandatory factory abstraction** on all data fetching:

#### Required API: Factory Creators

Instead of raw `useQuery`/`useMutation`, use:

- **`createListQueryV2`**: Fetch and cache list data
- **`createSingleQueryV2`**: Fetch and cache single-item detail data
- **`createInfiniteQueryV2`**: Fetch paginated/infinite scroll data
- **`createMutationV2`**: Generic mutations (create, update, action, delete)
- **`createCreateMutationV2`**: Wrapper for create-only mutations
- **`createUpdateMutationV2`**: Wrapper for update-only mutations
- **`createDeleteMutationV2`**: Wrapper for delete-only mutations
- **`createSuspenseQueryV2`** / **`createSuspenseInfiniteQueryV2`**: Suspense variants

Server-side helpers (not hooks):

- **`fetchQueryV2`**: Server-side eager fetch
- **`prefetchQueryV2`**: Prefetch into client queryClient
- **`ensureQueryDataV2`**: Ensure data exists (fetch if missing)

#### Forbidden Pattern

❌ **Never use raw TanStack Query outside the factory layer**:
```typescript
// FORBIDDEN:
const data = useQuery({ queryKey, queryFn })
const data = queryClient.fetchQuery({ ... })
const data = queryClient.prefetchQuery({ ... })
const data = queryClient.ensureQueryData({ ... })
```

These are intercepted by linters and architecture checks.

#### Factory Metadata (Required)

Every factory creator **must** include a `meta` object:

```typescript
export function useProducts() {
  return createListQueryV2({
    queryKey: QUERY_KEYS.products(),
    queryFn: fetchProducts,
    meta: {
      source: 'features.products.hooks.useProducts',  // File path + function
      operation: 'list',                              // 'list' | 'detail' | 'infinite' | 'create' | 'update' | 'delete' | 'action'
      resource: 'products',                           // Singular resource name
      domain: 'products',                             // Domain name
      description: 'Fetches all products with pagination',  // Optional
      tags: ['products', 'admin'],                     // Optional
      criticality: 'high',                            // Optional: 'low' | 'normal' | 'high' | 'critical'
    },
  });
}
```

**Meta fields:**
- `source`: `feature.subdir.hooks.functionName` (used for telemetry and debugging)
- `operation`: Must match `TanstackRequestOperation` type (list, detail, infinite, polling, create, update, delete, action, upload)
- `resource`: Singular noun of what's being fetched (e.g., "product", not "products")
- `domain`: One of: products, ai_paths, cms, database, auth, files, kangur, etc. (full list in types)
- `description`, `tags`, `criticality`, `samplingRate`, `logError`: Optional telemetry hints

#### Query Key Pattern

Use centralized `QUERY_KEYS` object:

```typescript
// src/shared/lib/query-keys.ts
const QUERY_KEYS = {
  products: {
    all: () => ['products'],
    list: (filters: Record<string, unknown>) => ['products', 'list', filters],
    detail: (id: string) => ['products', id],
  },
};

// In your hook:
const { data } = createListQueryV2({
  queryKey: QUERY_KEYS.products.list({ page: 1, sort: 'name' }),
  queryFn: ({ queryKey }) => fetchProducts(queryKey[2]), // Destructure filters from key
  // ...
});
```

Query key formats follow TanStack conventions: first element is resource, then discriminators.

#### Query Key Exports

Common keys are pre-exported in `src/shared/lib/query-key-exports.ts`:

```typescript
export const productKeys = QUERY_KEYS.products;
export const cmsKeys = QUERY_KEYS.cms;
export const dbKeys = QUERY_KEYS.system.databases;
// ... etc
```

Import these instead of defining your own:

```typescript
import { productKeys } from '@/shared/lib/query-key-exports';

export function useProducts() {
  return createListQueryV2({
    queryKey: productKeys.list({ page: 1 }),
    // ...
  });
}
```

#### Invalidation Patterns

Mutations should invalidate queries via `invalidateKeys`:

```typescript
export function useCreateProduct() {
  return createCreateMutationV2({
    mutationFn: createProductApi,
    meta: { /* ... */ },
    invalidateKeys: [
      QUERY_KEYS.products.all(),  // Invalidate all product queries
      QUERY_KEYS.products.list({ page: 1 }),
    ],
    // Optionally use invalidate() for complex patterns:
    // invalidate: (queryClient) => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.all() }),
  });
}
```

#### Telemetry and Observability

Metadata powers automatic telemetry:

- Query/mutation lifecycle events (start, success, error, retry, cancel)
- Performance metrics: duration, attempt count
- Sampled logging based on `criticality` and `samplingRate`
- Structured error categorization
- Request tracing via context

**View telemetry**: Check `/admin/analytics` and `/admin/system` dashboards for query performance and error rates.

#### Validation

```bash
npm run check:factory-meta          # Find factories missing metadata
npm run check:factory-meta:strict   # Fail on any missing metadata (CI)
```

Both scan `src/` for all `create*QueryV2`, `create*MutationV2` calls and verify `meta` is present.

If a check fails, add the missing `meta` object to your factory creator.

### Database and Persistence

The application uses **MongoDB as the primary database** with optional Redis caching. Database operations follow a repository pattern for testability and decoupling.

**Database Configuration**

```typescript
// src/shared/lib/env.ts
MONGODB_URI=mongodb://...        // MongoDB connection string (required)
MONGODB_DB=app                   // Database name (default: 'app')
REDIS_URL=redis://...            // Optional Redis for caching/queues
APP_DB_PROVIDER=mongodb          // Currently only 'mongodb' supported
```

At startup, `src/instrumentation.ts` validates `MONGODB_URI` is configured. If missing, the app fails to start.

**Provider Routing: App DB vs Service-Specific**

Database Engine (`src/shared/lib/db/`) supports per-service provider routing:

```typescript
import { getAppDbProvider, getDatabaseEngineServiceProvider } from '@/shared/lib/db/app-db-provider';

// Get the app's primary database (currently always MongoDB)
const provider = await getAppDbProvider(); // → 'mongodb'

// Get service-specific provider (e.g., products, auth, cms)
const serviceProvider = await getDatabaseEngineServiceProvider('products');
// → 'mongodb' (if routed to MongoDB) or 'redis' (if cache-only)
```

**Resolution order:**
1. Check Database Engine policy for explicit service routing
2. If no route, check `APP_DB_PROVIDER` env var (default: read from settings)
3. If not set, check `MONGODB_URI` (fall back to MongoDB if available)
4. Throw error if no provider is configured

**Caching with Redis**

When Redis is available (`REDIS_URL`), it's used for:
- Job queues (BullMQ)
- Query result caching (optional, feature-driven)
- Session storage (optional, auth-driven)
- Rate limiting

If Redis is unavailable, jobs fall back to **inline execution** (controlled by `AI_JOBS_INLINE`).

Check `src/shared/lib/queue/` for queue factory:

```typescript
import { createManagedQueue } from '@/shared/lib/queue';

const productAiQueue = await createManagedQueue('product-ai', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

await productAiQueue.add('generate-description', { productId }, { delay: 1000 });
```

**Repository Pattern**

Features use repositories to abstract data access. Example: `src/features/notesapp/services/notes/note-repository/`:

```typescript
// src/features/notesapp/services/notes/types/note-repository.ts
export interface NoteRepository {
  getAll(filters?: NoteFilters): Promise<NoteWithRelations[]>;
  getById(id: string): Promise<NoteWithRelations | null>;
  create(data: NoteCreateInput): Promise<NoteWithRelations>;
  update(id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null>;
  delete(id: string): Promise<boolean>;
  // ... tag and category methods
}

// src/features/notesapp/services/notes/note-repository/mongo-note-repository.ts
export const mongoNoteRepository: NoteRepository = {
  async getAll(filters = {}) {
    const db = await getMongoDb();
    return db.collection('notes').find({ ...filters }).toArray();
  },
  async getById(id: string) {
    const db = await getMongoDb();
    return db.collection('notes').findOne({ _id: id });
  },
  async create(data: NoteCreateInput) {
    const db = await getMongoDb();
    const result = await db.collection('notes').insertOne(data);
    return this.getById(result.insertedId.toString())!;
  },
  // ... more methods
};
```

**Why repositories matter:**
- Abstracts MongoDB-specific operations: easier to test, mock, or switch providers
- Single responsibility: all data access for notes lives in one place
- Consistent error handling and logging
- Enables soft deletes, archival, and audit trails
- Repositories are exported via `server.ts` (server-only)

**Using Repositories in API Routes**

```typescript
// src/app/api/notes/route.ts
import { mongoNoteRepository } from '@/features/notesapp/server';

export async function GET() {
  const notes = await mongoNoteRepository.getAll();
  return Response.json({ data: notes });
}

// src/app/api/notes/[id]/route.ts
import { apiHandler } from '@/shared/lib/api-handler';
import { mongoNoteRepository } from '@/features/notesapp/server';

async function handleGetNote(req: ApiRequest<{ id: string }>) {
  const note = await mongoNoteRepository.getById(req.params.id);
  if (!note) throw notFoundError(`Note ${req.params.id} not found`);
  return note;
}

export const GET = apiHandler(handleGetNote);
```

**MongoDB Client and Connection**

```typescript
// src/shared/lib/db/mongo-client.ts
import { getMongoDb } from '@/shared/lib/db/mongo-client';

// Get the MongoDB Db instance (singleton)
const db = await getMongoDb();
const collection = db.collection('products');
await collection.insertOne({ name: 'Widget', price: 9.99 });
```

**Connection pooling, slow query logging, and monitoring** are configured in `mongo-client.ts`:

- Default pool size: 10 connections
- Slow query threshold: `MONGODB_SLOW_COMMAND_MS` (default: 3 seconds)
- Enable pool logging: `DEBUG_MONGODB_POOL=true`
- Monitor all commands: `MONGODB_MONITOR_COMMANDS=true`

**Database Backups**

The Database Engine provides backup and restore functionality:

- **API**: `POST /api/system/databases/backups`
- **UI**: `/admin/system` > Database > Backups
- **CLI**: `npm run seed` / `npm run cleanup:*` commands

Backup files live in `mongo/` directory (local dev) or configurable backup schedule via Database Engine policy.

**Common Patterns**

**1. Query with filtering:**
```typescript
const notes = await mongoNoteRepository.getAll({
  notebookId: 'notebook-1',
  tag: 'important',
  limit: 10,
  offset: 0,
});
```

**2. Bulk write with retry:**
```typescript
import { retryableWrite } from '@/shared/lib/db/mongo-write-retry';

const result = await retryableWrite(async () => {
  const db = await getMongoDb();
  return db.collection('products').updateMany(
    { status: 'draft' },
    { $set: { updatedAt: new Date() } }
  );
});
```

**3. Transaction (if using MongoDB 4.0+):**
```typescript
import { withMongoTransaction } from '@/shared/lib/db/mongo-client';

const result = await withMongoTransaction(async (session) => {
  const db = await getMongoDb();
  const productsCollection = db.collection('products');
  
  const product = await productsCollection.findOneAndUpdate(
    { _id: productId },
    { $set: { status: 'published' } },
    { session, returnDocument: 'after' }
  );
  
  // Other operations with `session`
  
  return product;
});
```

**Observability and Debugging**

```bash
# Monitor slow queries
DEBUG_MONGODB_POOL=true npm run dev

# Check MongoDB status
curl http://localhost:3000/api/system/health

# View system logs with MongoDB activity
curl http://localhost:3000/api/system/logs?source=mongodb
```

**Common Errors**

| Error | Cause | Fix |
|-------|-------|-----|
| `MONGODB_URI is not configured` | Env var missing | Set `MONGODB_URI` in `.env` |
| `Replica set not available` | Connection pooling issue | Restart MongoDB, check `DEBUG_MONGODB_POOL=true` logs |
| `E11000 duplicate key` | Duplicate unique field | Check index definition; may need data cleanup |
| `Timeout: operation exceeded 30000ms` | Query too slow | Add index or optimize query; check `MONGODB_SLOW_COMMAND_MS` |
| `Transaction aborted` | Multi-document transaction failed | Retry via `retryableWrite()` |

### File and Media Handling

- **Local uploads**: `public/uploads`
- **Storage routing**: `src/shared/lib/files/services/storage/file-storage-service.ts`
- **Configurable sources**: Local or FastComet (env-driven)
- **Remote CDNs**: ImageKit, Baselinker patterns in Next config
- **Settings resolution**: DB settings + env fallbacks

### TypeScript

- Strict mode enabled across the app
- Config: `tsconfig.json`, `tsconfig.eslint-src.json`, `tsconfig.eslint-tests.json`
- Heap flag: `NODE_OPTIONS='--max-old-space-size=8192'` in build script (locked, do not modify)

### Testing Conventions

- **Unit/Integration**: Vitest with jsdom, colocated in `__tests__/` directories
- **E2E**: Playwright specs under `e2e/features/`
- **File parallelism disabled** in `vitest.config.ts` (colocated DB/queue concerns)
- **Playwright startup**: Runs `npm run dev` unless `PLAYWRIGHT_USE_EXISTING_SERVER=true`

### API Routes

- **RESTful**: GET, POST, PUT, DELETE with NextResponse
- **Error handling**: Structured error responses with meaningful HTTP codes
- **Validation**: Zod schemas for all inputs
- **Grouping**: Feature-scoped directories (e.g., `/api/products/`, `/api/ai-paths/`)

### API Routes and Request Handling

All API routes (`src/app/api/`) use a standardized handler pattern with automatic request validation, auth, rate limiting, error handling, and observability.

**The Pattern: Route + Handler**

```typescript
// src/app/api/notes/route.ts (route file)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Optional: disable caching

import { apiHandler } from '@/shared/lib/api';
import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'notes.GET',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'notes.POST',
  requireAuth: true,
  rateLimitKey: 'write',
});
```

```typescript
// src/app/api/notes/handler.ts (handler file with business logic)
import { NextRequest, NextResponse } from 'next/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { mongoNoteRepository } from '@/features/notesapp/server';

export async function GET_handler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  // req.url, req.method, req.headers available
  // ctx.params available for route params
  const notes = await mongoNoteRepository.getAll();
  return NextResponse.json({ data: notes });
}

export async function POST_handler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  // Body is auto-parsed by apiHandler if parseJsonBody: true (default)
  const body = ctx.parsedBody;
  const note = await mongoNoteRepository.create(body);
  return NextResponse.json({ data: note }, { status: 201 });
}
```

**Route with URL Params**

```typescript
// src/app/api/notes/[id]/route.ts
import { apiHandlerWithParams } from '@/shared/lib/api';
import { GET_handler, PUT_handler } from './handler';

export const GET = apiHandlerWithParams(GET_handler, {
  source: 'notes.detail.GET',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams(PUT_handler, {
  source: 'notes.detail.PUT',
  requireAuth: true,
  rateLimitKey: 'write',
});

// src/app/api/notes/[id]/handler.ts
export async function GET_handler(req: NextRequest, ctx: ApiHandlerContext) {
  const id = ctx.params.id; // URL param
  const note = await mongoNoteRepository.getById(id);
  if (!note) throw notFoundError(`Note ${id} not found`);
  return NextResponse.json({ data: note });
}
```

**Handler Options**

The `apiHandler` and `apiHandlerWithParams` wrappers accept these options:

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `source` | string | required | Telemetry source ID (e.g., `'notes.GET'`); used for logging and metrics |
| `requireAuth` | boolean | false | If true, throws `authError` if session is missing |
| `parseJsonBody` | boolean | true | If true, parses request body as JSON and validates via `bodySchema` |
| `bodySchema` | Zod schema | undefined | Validates and parses request body; throws validation error if invalid |
| `querySchema` | Zod schema | undefined | Validates and parses query params; throws validation error if invalid |
| `rateLimitKey` | 'api' \| 'write' | false | Rate limit category; 'api' for all requests, 'write' for mutations |
| `requireCsrf` | boolean | true | If true, validates CSRF token from header or body |
| `successLogging` | 'all' \| 'slow' \| 'off' | 'slow' | Log all successes, only slow (>750ms), or none |
| `slowThresholdMs` | number | 750 | Threshold for slow request logging |
| `corsAllowCredentials` | boolean | false | Add `Access-Control-Allow-Credentials` header |

**Common Examples**

**1. GET with query validation:**
```typescript
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  tags: z.string().transform(s => s.split(',')).optional(),
});

export const GET = apiHandler(
  async (req, ctx) => {
    const { page, limit, tags } = ctx.queryParams; // Auto-validated
    const notes = await mongoNoteRepository.getAll({ page, limit, tags });
    return NextResponse.json({ data: notes });
  },
  { source: 'notes.list.GET', querySchema }
);
```

**2. POST with body validation:**
```typescript
const bodySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export const POST = apiHandler(
  async (req, ctx) => {
    const data = ctx.parsedBody; // Auto-validated against schema
    const note = await mongoNoteRepository.create(data);
    return NextResponse.json({ data: note }, { status: 201 });
  },
  {
    source: 'notes.create.POST',
    bodySchema,
    requireAuth: true,
    rateLimitKey: 'write',
  }
);
```

**3. File upload (multipart form-data):**
```typescript
export const POST = apiHandler(
  async (req, ctx) => {
    // parseJsonBody: false prevents auto-parsing
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) throw badRequestError('File is required');
    
    const uploaded = await uploadFile(file);
    return NextResponse.json({ data: uploaded }, { status: 201 });
  },
  {
    source: 'files.upload.POST',
    parseJsonBody: false,
    requireAuth: true,
    rateLimitKey: 'write',
  }
);
```

**4. No auth, CORS-friendly:**
```typescript
export const GET = apiHandler(
  async (req, ctx) => {
    const data = await fetchPublicData();
    return NextResponse.json({ data });
  },
  {
    source: 'public-data.GET',
    requireAuth: false,
    requireCsrf: false,
    corsAllowCredentials: false,
  }
);
```

**Error Handling**

All errors in handlers are automatically caught and converted to appropriate HTTP responses:

```typescript
import { badRequestError, notFoundError, forbiddenError, internalError } from '@/shared/errors/app-error';

export async function handler(req, ctx) {
  if (!req.url.includes('notes')) {
    throw badRequestError('Invalid path'); // → 400 Bad Request
  }
  
  const note = await repo.getById(id);
  if (!note) {
    throw notFoundError(`Note ${id} not found`); // → 404 Not Found
  }
  
  if (!canEdit(note)) {
    throw forbiddenError('Cannot edit this note'); // → 403 Forbidden
  }
  
  try {
    await deleteNote(note);
  } catch (error) {
    throw internalError('Failed to delete note', { cause: error }); // → 500 Internal Server Error
  }
  
  return NextResponse.json({ success: true });
}
```

**Rate Limiting**

```bash
# Dev: disabled by default
# To enable: ENABLE_RATE_LIMITS=true npm run dev

# Production: enabled by default
# To disable: DISABLE_RATE_LIMITS=true npm start

# In tests: disabled by default
# To enforce: ENFORCE_TEST_RATE_LIMITS=true npm test
```

Rate limit categories:
- **'api'** (read): 100 req/min per IP
- **'write'** (mutation): 30 req/min per IP

Rate limit failures return 429 Too Many Requests with `Retry-After` header.

**CSRF Protection**

By default, all POST/PUT/PATCH/DELETE routes require a CSRF token:

```typescript
// Client-side (auto-injected by CsrfProvider)
const response = await fetch('/api/notes', {
  method: 'POST',
  body: JSON.stringify({ title: 'My Note' }),
  headers: {
    'X-CSRF-Token': csrfToken, // Auto-added by CsrfProvider
  },
});

// Or in form data:
const formData = new FormData();
formData.append('title', 'My Note');
formData.append('_csrf', csrfToken);
await fetch('/api/notes', { method: 'POST', body: formData });
```

Bypass CSRF if `requireCsrf: false` (e.g., for public endpoints or client error reporting):

```typescript
export const POST = apiHandler(handler, {
  source: 'client-errors.POST',
  parseJsonBody: false,
  requireCsrf: false, // Browser client-side errors don't have CSRF token
});
```

**Observability**

Every request logged via `apiHandler` includes:
- Request ID and trace ID (for debugging)
- Session user ID (if authenticated)
- Response status code and duration
- Error details (if failed)
- Rate limit headers

Check logs via:
```bash
curl http://localhost:3000/api/system/logs?source=api
```

### Component and UI Patterns

- **Shared design system**: `src/shared/ui` (used across admin pages)
- **Admin layout**: `src/app/(admin)/layout.tsx` requires session, redirects to `/auth/signin`
- **Client directives**: Intentional use of `"use client"` for interactive components
- **Radix + Tailwind CSS v4**: Design system foundation

### Observability

- **Structured logging** in `src/shared/lib/observability`
- **System activity and logs**: Admin UI (`/admin/system`) and API endpoints
- **Runtime context**: Hydrated in logs for request tracing
- **AI Paths analytics**: Redis-backed with run telemetry
- **Alert system**: System log alerts via queue

### Security

- **CSRF protection**: Cookie + fetch header patching in `CsrfProvider`
- **URL normalization**: Client-side guard in `UrlGuardProvider`
- **Scraper defense**: `server.cjs` guard (env-controlled: `SCRAPER_GUARD_*`)
- **Credential encryption**: `INTEGRATION_ENCRYPTION_KEY` for integration secrets
- **Security headers**: CSP and headers in `next.config.mjs` (locked, do not modify)

### Environment Variables

Critical variables are documented in `GEMINI.md` and `.env.example`:

- **Core**: `NODE_ENV`, `MONGODB_URI`, `MONGODB_DB`, `REDIS_URL`, `NEXT_PUBLIC_APP_URL`
- **Auth**: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_DEBUG`
- **AI**: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- **Queue**: `AI_JOBS_INLINE`, `AI_PATHS_RUN_CONCURRENCY`, `AI_PATHS_JOB_TIMEOUT_MS`
- **Files**: `FASTCOMET_STORAGE_*`, `IMAGEKIT_ID`

Do not commit secrets; use `.env` locally (in `.gitignore`).

### Locked Files (Do Not Modify Without User Approval)

- `next.config.mjs` — Next.js build config
- `package.json` `"build"` script — heap size and runtime policy
- `tsconfig.json` — TypeScript compiler config
- `vercel.json` — Vercel deployment (if present)

These are enforced constraints; ask the user before changing them.

## Documentation References

- **Platform overview**: `docs/README.md`, `README.md`
- **Deep architecture**: `GEMINI.md` (this session auto-includes it as custom instruction)
- **Developer handbook**: `docs/platform/developer-handbook.md`
- **Component patterns**: `docs/platform/component-patterns.md`
- **Architecture guardrails**: `docs/platform/architecture-guardrails.md`
- **Best practices**: `docs/platform/best-practices.md`
- **AI Paths**: `docs/ai-paths/overview.md`, `docs/ai-paths/reference.md`
- **Kangur (mobile/learner)**: `docs/kangur/README.md`
- **Mobile setup**: `apps/mobile/README.md`

Generated docs (run scripts to refresh):

- AI Paths semantic grammar: `npm run docs:ai-paths:semantic:generate`
- AI Paths tooltips: `npm run docs:ai-paths:tooltip:generate`
- Validator reference: `npm run docs:validator:generate`

## Artifact Storage

For transient diagnostics, logs, and build artifacts (not for committing):

- Use `tmp/gemini/` directory
- Examples: `tsc_errors.txt`, `test-results.json`, one-off diagnostics
- Clean up before finishing your task

## Working Effectively

1. **Use GEMINI.md**: This repo auto-includes it as custom instruction—leverage it for architecture details
2. **Check entrypoints**: When working across features, use `public.ts`/`server.ts` over deep imports
3. **Verify locks**: Before modifying `next.config.mjs`, `package.json` build script, `tsconfig.json`, or `vercel.json`, ask the user first
4. **Run checks**: After refactoring architecture, run `npm run metrics:collect` and `npm run bun:check:architecture-guardrails`
5. **Database ready**: Ensure MongoDB is running; `src/instrumentation.ts` validates it at startup
6. **Test locally**: E2E tests start `npm run dev` unless you set `PLAYWRIGHT_USE_EXISTING_SERVER=true`
7. **Factory metadata**: Query/mutation factories require metadata; run `npm run check:factory-meta:strict` to verify
8. **Workspace commands**: Mobile and packages use `npm run <cmd> --workspace @kangur/<name>`

### Testing: Unit, Integration, and E2E

Testing is distributed across three layers with different tools and purposes:

**Unit & Integration Tests (Vitest)**

Located in `__tests__/` (top-level or colocated) and organized by layer:

```
__tests__/
├── api/              # API integration tests
├── features/         # Feature-level tests
├── shared/           # Shared lib tests
└── scripts/          # Build/tooling tests

src/features/*/
├── __tests__/        # Colocated feature tests
│   ├── *.test.ts
│   └── *.test.tsx
└── components/
    └── __tests__/    # Colocated component tests
```

Run all unit tests:
```bash
npm run test              # Run all tests (vitest run --project unit)
npm run test:unit:domains # Run tests grouped by domain with timing
```

Run a single test:
```bash
npx vitest run --project unit src/features/database/hooks/__tests__/database-engine-settings-parsing.test.ts
```

Watch mode (for development):
```bash
npx vitest --project unit src/features/database
```

**Test Configuration**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',        // DOM API available
    setupFiles: ['./vitest.setup.ts'], // Auto-imported test utilities
    globals: true,               // expect/describe/it available without imports
    fileParallelism: false,      // Tests run sequentially (important for DB/queue tests)
    testTimeout: 30_000,         // 30s per test
    hookTimeout: 30_000,         // 30s for beforeEach/afterEach
  },
});
```

**Unit Test Pattern**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ProductRepository.getById', () => {
  let repository: ProductRepository;

  beforeEach(() => {
    repository = mongoProductRepository;
  });

  it('returns product when found', async () => {
    const product = await repository.getById('product-123');
    
    expect(product).toBeDefined();
    expect(product?.name).toBe('Widget');
  });

  it('returns null when not found', async () => {
    const product = await repository.getById('nonexistent');
    
    expect(product).toBeNull();
  });

  it('throws error on database failure', async () => {
    const mockRepo = {
      getById: vi.fn().mockRejectedValue(new Error('DB error')),
    };
    
    await expect(mockRepo.getById('id')).rejects.toThrow('DB error');
  });
});
```

**Mocking Patterns**

```typescript
// Mock API responses
vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: [...] }),
    post: vi.fn().mockResolvedValue({ data: {...} }),
  },
}));

// Mock services
vi.mock('@/features/products/server', () => ({
  getProductRepository: vi.fn(() => mockRepository),
}));

// Mock Next.js functions
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/admin/products',
}));
```

**E2E Tests (Playwright)**

Located in `e2e/features/` organized by feature:

```
e2e/features/
├── admin/
├── ai-paths/
├── chatbot/
├── cms/
├── data-import-export/
├── database/
├── files/
├── integrations/
├── notesapp/
├── products/
├── settings/
└── viewer3d/
```

Run all E2E tests:
```bash
npm run test:e2e
```

Run specific E2E test:
```bash
node scripts/testing/run-playwright-suite.mjs e2e/features/products/products-list.spec.ts
```

Run with grep pattern:
```bash
node scripts/testing/run-playwright-suite.mjs e2e/features/products/products.spec.ts --grep "should update product"
```

Run in headed mode (see browser):
```bash
PLAYWRIGHT_HEADLESS=false npm run test:e2e
```

**E2E Test Pattern**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Products Page', () => {
  test.beforeEach(async ({ page }) => {
    // Run before each test
    await page.goto('/admin/products');
  });

  test('should display products list', async ({ page }) => {
    // Expect heading visible
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    
    // Expect action button visible
    await expect(page.getByRole('button', { name: 'New Product' })).toBeVisible();
  });

  test('should create new product', async ({ page }) => {
    // Click button to open form
    await page.getByRole('button', { name: 'New Product' }).click();
    
    // Fill form
    await page.getByLabel('Product Name').fill('Test Widget');
    await page.getByLabel('Price').fill('19.99');
    
    // Submit form
    await page.getByRole('button', { name: 'Create' }).click();
    
    // Verify success (e.g., toast message or new row in table)
    await expect(page.getByText('Product created successfully')).toBeVisible();
    await expect(page.getByText('Test Widget')).toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    // Click filter button
    await page.getByRole('button', { name: 'Filters' }).click();
    
    // Select category
    await page.getByLabel('Category').selectOption('Electronics');
    
    // Apply filter (if there's an apply button; some auto-apply)
    await page.getByRole('button', { name: 'Apply' }).click();
    
    // Verify filtered results
    const rows = await page.getByRole('row').count();
    expect(rows).toBeGreaterThan(1); // At least header + 1 data row
  });
});
```

**E2E Test Configuration**

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,           // 30s per test
  expect: { timeout: 5_000 }, // 5s for expect()
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure', // Save trace for failed tests
    screenshot: 'only-on-failure', // Screenshot on failure
  },
  webServer: {
    command: 'npm run dev',  // Auto-start dev server
    port: 3000,
    // Or skip if PLAYWRIGHT_USE_EXISTING_SERVER=true
  },
});
```

**Key Playwright APIs**

```typescript
// Navigation
await page.goto('/admin/products');
await page.reload();
await page.goBack();

// Selectors (prefer getByRole for accessibility)
page.getByRole('heading', { name: 'Products' });    // Best: semantic
page.getByLabel('Product Name');                    // Good: form labels
page.getByPlaceholder('Search...');                 // Good: placeholders
page.getByText('Created');                          // Good: text content
page.locator('[data-testid="product-card"]');       // Fallback: data-testid

// Interaction
await page.getByRole('button', { name: 'Save' }).click();
await page.getByLabel('Name').fill('Widget');
await page.getByLabel('Category').selectOption('Electronics');
await page.getByRole('checkbox').check();
await page.keyboard.press('Enter');

// Assertions
await expect(page.getByText('Success')).toBeVisible();
await expect(page.getByText('Error')).toBeHidden();
await expect(page.getByRole('button')).toBeEnabled();
await expect(page.getByRole('button')).toBeDisabled();
await expect(page).toHaveTitle('Products');
await expect(page).toHaveURL('/admin/products');
```

**Critical Flows vs Feature Tests**

- **Feature E2E tests** (`e2e/features/*/`): Test individual feature workflows in isolation
- **Critical flow tests** (`npm run test:critical-flows`): Test high-value cross-feature workflows (e.g., create product → apply AI path → publish)

Run critical flows:
```bash
npm run test:critical-flows
npm run test:critical-flows:strict  # Fail on any error
```

**Test Coverage**

Generate coverage report:
```bash
npm run test:coverage
```

Coverage is collected for `src/**/*.ts` and `src/**/*.tsx` and reported to:
- Console: Text summary
- HTML: `coverage/index.html` (open in browser)
- JSON: `coverage/coverage-final.json` (for CI/CD)

**Test Environments and Setup**

Unit tests run in jsdom (DOM API + React Testing Library):
```typescript
// vitest.setup.ts
import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-cleanup after each test
afterEach(() => cleanup());

// Mock next/router, next/navigation, etc.
```

E2E tests run in real browser (Chromium):
```typescript
// playwright.config.ts - auto-starts npm run dev
// Or reuse existing server: PLAYWRIGHT_USE_EXISTING_SERVER=true
```

**CI/CD Testing**

```bash
# Full test matrix (unit + E2E + critical flows)
npm run test                 # Unit tests
npm run test:e2e             # E2E tests (starts dev server)
npm run test:critical-flows  # Critical workflows

# Check for code quality issues
npm run lint                 # ESLint
npm run typecheck            # TypeScript
```

**Common Issues**

| Problem | Cause | Fix |
|---------|-------|-----|
| Test timeout (>30s) | Slow query or missing mock | Add `vi.mock()`, optimize query, increase timeout |
| "Element not found" in E2E | Selector too specific, element not rendered | Use `getByRole`, add `await page.waitForSelector()` |
| Flaky test (passes/fails randomly) | Race condition, timing dependency | Add `await expect().toBeVisible()`, avoid `page.waitForTimeout()` |
| Import error in test | Missing mock or path alias | Check `vitest.config.ts` alias, add `vi.mock()` |
| Database error in test | Tests run sequentially; previous test dirty state | Add cleanup in `afterEach()`, use transaction rollback |

### Common Issues

### Build Fails with Heap Error

Increase heap size in the build command or use `npm run build:hi-mem`.

### TypeScript Errors on Incremental Check

Run `npm run typecheck:baseline` to clear incremental cache.

### E2E Tests Timeout

Ensure `npm run dev` is running, or set `PLAYWRIGHT_USE_EXISTING_SERVER=true` and start the server separately.

### Query Factory Metadata Errors

Run `npm run check:factory-meta:strict` to find missing metadata, then add it via factory helpers.

### ESLint Cross-Feature Import Errors

Use feature `public.ts` or `server.ts` entrypoints, not deep imports from feature internals.

---

**For questions or additions, refer to the docs and platform architecture guardrails.**
