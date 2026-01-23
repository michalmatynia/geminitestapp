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
```

## Stack (Actual Versions)

- Next.js 16.1.1 (App Router)
- React 19.2.3
- TypeScript 5.9 (strict true)
- Prisma 7.2.0 + Postgres
- MongoDB optional provider for products/settings
- Tailwind CSS 4.1 + ShadCN/ui (copy-pasted components)
- TanStack Query + TanStack Table
- NextAuth/Auth.js 5.0.0-beta.30
- OpenAI SDK 6.15 (chat completions)
- Ollama local models (via `OLLAMA_BASE_URL`)

## Multi-App Architecture

```
app/
  (admin)/admin/        # Admin UI
  (frontend)/           # Public UI
  api/                  # REST-style API
```

- Admin handles products, drafts, notes, settings, integrations.
- Frontend exposes public product experiences.
- API is shared by both apps.

## Core Layers

```
lib/
  services/             # Domain logic + repositories
  agent/                # Internal agent runtime (planning/execution/memory/tools)
  chatbot/              # AI job orchestration
  db/                   # Mongo client
  validations/          # Zod schemas
  context/              # React contexts
  hooks/                # Custom hooks
  utils/                # Shared helpers

types/                  # Shared TS types (source of truth)
components/             # UI + feature components
prisma/                 # Schema + migrations
public/uploads/         # File storage
```

## Data Providers (Prisma + Mongo)

The product domain can run on **Prisma (Postgres)** or **MongoDB**. Provider is
selected by:
- `product_db_provider` setting (db)
- `PRODUCT_DB_PROVIDER` env var
- Fallback: Prisma if `DATABASE_URL` is set, else Mongo if `MONGODB_URI` is set

See `lib/services/product-provider.ts` and the repository implementations under
`lib/services/*-repository/`.

## AI & Agent Runtime

- **AI services**: `lib/services/aiDescriptionService.ts`,
  `lib/services/aiTranslationService.ts`, `lib/services/productAiQueue.ts`
- **Agent runtime**: `lib/agent/` (planning, execution, memory, tool calls)
- **Chatbot API**: `app/api/chatbot/route.ts`

Model selection is dynamic. OpenAI models use `OPENAI_API_KEY`; non-OpenAI
models route to Ollama via `OLLAMA_BASE_URL`.

## AI Runtime Deep Dive (Planning, Memory, Tools)

This is the internal agent stack used by the chatbot and automation flows.

### Lifecycle (Queue -> Engine)

- Queue loop: `lib/agent/core/queue.ts` (`startAgentQueue`, `processAgentQueue`)
- Control loop: `lib/agent/core/engine.ts` (`runAgentControlLoop`)
- Run context assembly: `lib/agent/execution/context.ts`
- Plan initialization: `lib/agent/execution/plan.ts`

The queue pulls from `chatbotAgentRun` when the Prisma tables exist and
auto-resumes stuck runs. The engine orchestrates planning, tool execution,
memory, and finalization.

### Planning Layer

- LLM planning: `lib/agent/planning/llm.ts`
- Decision utils: `lib/agent/planning/utils.ts`

The planner selects task type, decomposes steps, and decides whether to invoke
tools.

### Execution Layer

- Step loop: `lib/agent/execution/step-runner.ts`
- Loop guard: `lib/agent/execution/loop-guard.ts`
- Finalize + verification: `lib/agent/execution/finalize.ts`

### Memory Layer

- Session + long-term memory: `lib/agent/memory/index.ts`
- Checkpointing: `lib/agent/memory/checkpoint.ts`
- Memory context assembly: `lib/agent/memory/context.ts`

Memory storage is backed by Prisma tables when available
(`agentMemoryItem`, `agentLongTermMemory`).

### Tools & Browsing

- Tool router: `lib/agent/tools/index.ts`
- LLM helper tools: `lib/agent/tools/llm/*`
- Playwright automation: `lib/agent/tools/playwright/*`
- Search integration: `lib/agent/tools/search/index.ts`
- Browsing context: `lib/agent/browsing/context.ts`

Playwright tooling handles navigation, extraction, and snapshotting. Search
can be used to find candidates before browsing.

### Audit & Approvals

- Audit logging: `lib/agent/audit/index.ts`
- Approval gating: `lib/agent/audit/gate.ts`
- Human approval workflows: `lib/agent/audit/approvals.ts`

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
Queue (core/queue.ts) ──> Engine (core/engine.ts)
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
   - Engine bails if `chatbotAgentRun` (or related tables) are missing.\n+   - Check migrations/schema before debugging code.\n+2. **Check queue status**  
   - `lib/agent/core/queue.ts` controls polling and stuck-run recovery.\n+   - Look for `status: queued|running|failed` in `chatbotAgentRun`.\n+3. **Inspect run logs**  
   - `chatbotAgentRun.logLines` captures run-level events.\n+   - `agentAuditLog` tracks granular events and errors.\n+4. **Validate tool execution**  
   - `lib/agent/tools/index.ts` is the router.\n+   - Playwright failures are often logged in `agentBrowserLog`.\n+5. **Check memory pipelines**  
   - Memory validation uses `OLLAMA_BASE_URL`.\n+   - See `lib/agent/memory/index.ts` for failure paths.\n+6. **Approval gate issues**  
   - `lib/agent/audit/gate.ts` determines human approval requirements.\n+   - If a run stalls, check approval decisions + UI workflow.\n+7. **Model selection mismatches**  
   - `prepareRunContext` sets planner/self-check/loop guard models.\n+   - Ensure `OLLAMA_MODEL`/`OPENAI_API_KEY`/settings align.\n+
## Key Domains

- Products, catalogs, tags, pricing, stock
- Drafts (product templates and pre-publish states)
- Notes (internal knowledge base)
- Integrations (Base.com/Baselinker import/export)
- Settings (feature flags, AI config, defaults)

## Integrations (Base.com/Baselinker)

- Import and export templates are first-class.
- Relevant paths:
  - `lib/services/imports/*`
  - `lib/services/exports/*`
  - `app/api/products/imports/base/*`
  - `app/api/products/exports/base/*`
  - `app/api/products/[id]/export-to-base/route.ts`

## File Storage

- Uploads are stored under `public/uploads/`.
- File metadata is tracked in `ImageFile` records (Prisma or Mongo).
- See `lib/utils/fileUploader.ts` and `app/api/files/*`.

## API Design (Guidance)

- Use Zod validation in API routes (`lib/validations/*`).
- Keep routes thin; call `lib/services/*` for business logic.
- Return consistent JSON error shapes.

## Testing & Scripts

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

**Last Updated**: January 23, 2026
