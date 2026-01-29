# GEMINI.md - Project Reference (Authoritative)

This project is an **AI-forward, multi-app platform** built on Next.js with a
shared API layer, a feature-rich admin app, and a public frontend. It is designed
for extensibility: new apps can be added as additional route groups while
re-using the same services, data providers, and AI runtime.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variables (see below).
3. Initialize DB (Postgres via Prisma):
   ```bash
   npx prisma migrate dev
   ```
4. Seed (optional):
   ```bash
   npm run seed
   npm run seed:admin
   ```
5. Run dev server:
   ```bash
   npm run dev
   ```

The server uses `server.cjs` for dev/prod.

## Environment Variables (Common)

```
DATABASE_URL=postgresql://...
MONGODB_URI=mongodb://...
PRODUCT_DB_PROVIDER=prisma|mongodb
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
BASE_API_URL=https://api.baselinker.com/connector.php
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_PATHS_RUN_CONCURRENCY=1
AI_PATHS_RUN_MAX_ATTEMPTS=3
AI_PATHS_RUN_BACKOFF_MS=5000
AI_PATHS_RUN_BACKOFF_MAX_MS=60000
```

## Stack (Actual Versions)

- Next.js 16.1.1 (App Router)
- React 19.2.3
- TypeScript 5.9 (strict true)
- Prisma 7.2.0 + Postgres
- MongoDB optional provider for products/settings
- Tailwind CSS 4.1 + ShadCN/ui (copy-pasted in `src/shared/ui/`)
- TanStack Query + TanStack Table
- NextAuth/Auth.js 5.0.0-beta.30
- OpenAI SDK 6.15 (chat completions)
- Ollama local models (via `OLLAMA_BASE_URL`)

## Multi-App Architecture

```
src/app/
  (admin)/admin/        # Admin UI
  (frontend)/           # Public UI
  api/                  # REST-style API
```

- Admin handles products, drafts, notes, settings, integrations.
- Frontend exposes public product experiences.
- API is shared by both apps.

## Core Layers

```
src/
  app/                  # Route groups + API handlers
  features/             # Domain features (UI + state + hooks + api)
    admin/              # Admin shell, navigation, admin-only pages
    drafter/            # Product draft templates + editor
    playwright/         # Playwright personas and shared automation settings
  shared/               # Cross-feature UI primitives, components, utils, hooks, types
    lib/                # Shared runtime helpers (api, db, query-client, transient-recovery)
    types/              # Shared TS types (cross-feature)
    ui/                 # ShadCN/ui components

prisma/                 # Schema + migrations
public/uploads/         # File storage
```

## Data Providers (Prisma + Mongo)

The product domain can run on **Prisma (Postgres)** or **MongoDB**. Provider is
selected by:
- `product_db_provider` setting (db)
- `PRODUCT_DB_PROVIDER` env var
- Fallback: Prisma if `DATABASE_URL` is set, else Mongo if `MONGODB_URI` is set

See `src/features/products/services/product-provider.ts` and the repository implementations under
`src/features/products/services/*-repository/`.

## AI & Agent Runtime

- **AI services**: `src/features/products/services/aiDescriptionService.ts`,
  `src/features/products/services/aiTranslationService.ts`, plus product AI job processing in
  `src/features/jobs/workers/productAiQueue.ts` (orchestrated by
  `src/features/jobs/services/productAiService.ts`)
- **AI Paths persistent runtime**: run records live in `AiPathRun`, `AiPathRunNode`, `AiPathRunEvent`
  (Prisma) or `ai_path_runs`, `ai_path_run_nodes`, `ai_path_run_events` (Mongo). Queue worker:
  `src/features/jobs/workers/aiPathRunQueue.ts`.
- **Agent runtime**: `src/features/agent-runtime/` (planning, execution, memory, tool calls)
- **Chatbot feature**: `src/features/chatbot/` (UI, hooks, helpers)
- **Agent creator feature**: `src/features/agentcreator/` (agent settings UI)
- **Agent run API**: `src/app/api/agentcreator/agent/*` (delegates to `src/features/agentcreator/api/agent/*`)
- **Chatbot API**: `src/app/api/chatbot/route.ts`

Model selection is dynamic. OpenAI models use `OPENAI_API_KEY`; non-OpenAI
models route to Ollama via `OLLAMA_BASE_URL`.

## Notes & Folder Tree

- Folder tree UI + helpers live in `src/features/foldertree/` and are reused by notes.

## Playwright Personas

- Playwright persona presets live in `src/features/playwright/`.
- Personas are stored in `/api/settings` under the `playwright_personas` key.

## AI Runtime Deep Dive (Planning, Memory, Tools)

This is the internal agent stack used by the chatbot and automation flows.

### Lifecycle (Queue -> Engine)

- Queue loop: `src/features/jobs/workers/agentQueue.ts` (`startAgentQueue`, `processAgentQueue`)
- Control loop: `src/features/agent-runtime/core/engine.ts` (`runAgentControlLoop`)
- Run context assembly: `src/features/agent-runtime/execution/context.ts`
- Plan initialization: `src/features/agent-runtime/execution/plan.ts`

The queue pulls from `chatbotAgentRun` when the Prisma tables exist and
auto-resumes stuck runs. The engine orchestrates planning, tool execution,
memory, and finalization.

### Planning Layer

- LLM planning: `src/features/agent-runtime/planning/llm.ts`
- Decision utils: `src/features/agent-runtime/planning/utils.ts`

The planner selects task type, decomposes steps, and decides whether to invoke
tools.

### Execution Layer

- Step loop: `src/features/agent-runtime/execution/step-runner.ts`
- Loop guard: `src/features/agent-runtime/execution/loop-guard.ts`
- Finalize + verification: `src/features/agent-runtime/execution/finalize.ts`

### Memory Layer

- Session + long-term memory: `src/features/agent-runtime/memory/index.ts`
- Checkpointing: `src/features/agent-runtime/memory/checkpoint.ts`
- Memory context assembly: `src/features/agent-runtime/memory/context.ts`

Memory storage is backed by Prisma tables when available
(`agentMemoryItem`, `agentLongTermMemory`).

### Tools & Browsing

- Tool router: `src/features/agent-runtime/tools/index.ts`
- LLM helper tools: `src/features/agent-runtime/tools/llm/*`
- Playwright automation: `src/features/agent-runtime/tools/playwright/*`
- Search integration: `src/features/agent-runtime/tools/search/index.ts`
- Browsing context: `src/features/agent-runtime/browsing/context.ts`

Playwright tooling handles navigation, extraction, and snapshotting. Search
can be used to find candidates before browsing.

### Audit & Approvals

- Audit logging: `src/features/agent-runtime/audit/index.ts`
- Approval gating: `src/features/agent-runtime/audit/gate.ts`
- Human approval workflows: `src/features/agent-runtime/audit/approvals.ts`

Audit logs and browser artifacts are stored in Prisma tables when present
(`agentAuditLog`, `agentBrowserLog`, `agentBrowserSnapshot`).

### Runtime Diagram (High-Level)

```
User Prompt
   │
   ▼
chatbotAgentRun (DB)  ◀─────────── status/planState/logLines
   │
   ▼
Queue (src/features/jobs/workers/agentQueue.ts) ──> Engine (core/engine.ts)
                             │
                             ├─ Planning (planning/llm.ts, utils.ts)
                             │      ▼
                             ├─ Execution (execution/*)
                             │      ├─ step-runner / loop-guard
                             │      └─ finalize / verification
                             │
                             ├─ Tools (tools/*)
                             │      ├─ Playwright (browse/extract/snapshot)
                             │      └─ Search (provider + LLM ranking)
                             │
                             └─ Memory (memory/*)
                                    ├─ session memory
                                    └─ long-term memory
```

### Debug Runbook (Agent Runtime)

1. **Confirm tables exist**  
   - Engine bails if `chatbotAgentRun` (or related tables) are missing.  
   - Check migrations/schema before debugging code.
2. **Check queue status**  
   - `src/features/jobs/workers/agentQueue.ts` controls polling and stuck-run recovery.  
   - Look for `status: queued|running|failed` in `chatbotAgentRun`.
3. **Inspect run logs**  
   - `chatbotAgentRun.logLines` captures run-level events.  
   - `agentAuditLog` tracks granular events and errors.
4. **Validate tool execution**  
   - `src/features/agent-runtime/tools/index.ts` is the router.  
   - Playwright failures are often logged in `agentBrowserLog`.
5. **Check memory pipelines**  
   - Memory validation uses `OLLAMA_BASE_URL`.  
   - See `src/features/agent-runtime/memory/index.ts` for failure paths.
6. **Approval gate issues**  
   - `src/features/agent-runtime/audit/gate.ts` determines human approval requirements.  
   - If a run stalls, check approval decisions + UI workflow.
7. **Model selection mismatches**  
   - `prepareRunContext` sets planner/self-check/loop guard models.  
   - Ensure `OLLAMA_MODEL`/`OPENAI_API_KEY`/settings align.

## Key Domains

- Products, catalogs, tags, pricing, stock
- Drafts (product templates and pre-publish states)
- Notes (internal knowledge base)
- Integrations (Base.com/Baselinker import/export)
- Settings (feature flags, AI config, defaults)

## Integrations (Base.com/Baselinker)

- Import and export templates are first-class.
- Relevant paths:
  - `src/features/integrations/services/imports/*`
  - `src/features/integrations/services/exports/*`
  - `src/app/api/integrations/imports/base/*`
  - `src/app/api/integrations/exports/base/*`
  - `src/app/api/integrations/products/[id]/export-to-base/route.ts`

## Data Import/Export

- Product import/export UI and helpers live in `src/features/data-import-export/`.
- CSV product import is routed via `/admin/import` and handled by `src/features/data-import-export/api/import/route.ts`.

## File Storage

- Uploads are stored under `public/uploads/`.
- File metadata is tracked in `ImageFile` records (Prisma or Mongo).
- See `src/features/files/utils/fileUploader.ts` and `src/app/api/files/*`.

## Error Handling & Logging

- Error helpers live in `src/shared/errors/*`.
- System logging services live in `src/features/observability/services/*`.
- Client error logging lives in `src/features/observability/utils/client-error-logger.ts`.
- System logs UI lives in `src/features/observability/pages/SystemLogsPage.tsx`
  with the route wrapper in `src/app/(admin)/admin/system/logs/page.tsx`.

## API Design (Guidance)

- Use Zod validation in API routes (`src/features/*/validations`).
- Keep routes thin; call `src/features/*/services` or `src/shared/lib/services` for business logic.
- Return consistent JSON error shapes.

## Testing & Scripts

**IMPORTANT: Do NOT modify eslint settings. Keep them strict.**

```
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:e2e
npm run seed
npm run seed:admin
```

## AI Agent Hygiene (Mandatory)

- Do NOT read `AIPrompts/` (admin-only, sensitive).
- Do NOT access other agents' `AIReasoning/*` folders.
- Do NOT commit reasoning/results files.

---

**Last Updated**: January 27, 2026
