# AGENTS.md - AI Agent Operating Guide

This is the authoritative, up-to-date guide for AI agents working in this repo.
Keep this file accurate and lean. Other agent docs should defer to it.

## Project Snapshot (Reality, not marketing)

- **Product**: AI-forward, multi-app platform with admin + public frontends.
- **Framework**: Next.js 16.1.1 (App Router) + React 19.2.3
- **Language**: TypeScript 5.9 (strict true)
- **DB**: Prisma 7.2.0 (Postgres) with optional MongoDB provider
- **Auth**: NextAuth/Auth.js 5.0.0-beta.30
- **UI**: Tailwind CSS 4.1 + ShadCN/ui (copy-pasted in `src/shared/ui/`)
- **Data**: TanStack Query + TanStack Table
- **AI**: OpenAI SDK (chat completions) with optional Ollama local models
- **Runtime**: Custom server (`server.cjs`) for dev/prod start

## Multi-App Structure (Current)

- **Admin app**: `src/app/(admin)/admin/*` (products, drafts, notes, settings, integrations)
- **Public app**: `src/app/(frontend)/*` (product listings, detail pages)
- **Shared API**: `src/app/api/*` (REST-style routes for admin + frontend)

## Core Directories (Actual)

```
src/
  app/
    (admin)/admin/      # Admin UI
    (frontend)/         # Public UI
    api/                # Server routes (Next.js route handlers)

  features/             # Domain feature modules (UI + state + hooks + api)
    admin/              # Admin shell, navigation, admin-only pages
    ai-paths/           # AI path runtime + UI
    products/           # Product domain UI + services
  shared/               # Cross-feature UI primitives, components, utils, hooks, types
    lib/                # Shared runtime helpers (api, db, query-client, transient-recovery)
    types/              # Shared TS types (cross-feature)
    ui/                 # ShadCN/ui components
prisma/                 # Prisma schema + migrations
public/uploads/         # File storage (images, notes)
```

## Data Layer Reality

The platform can run on **Prisma (Postgres)** or **MongoDB**, selected by:
- `product_db_provider` setting (db)
- `PRODUCT_DB_PROVIDER` env var
- Fallback to Prisma when `DATABASE_URL` exists, else Mongo if `MONGODB_URI` exists

See: `src/features/products/services/product-provider.ts` and repository implementations under
`src/features/products/services/*-repository/` (e.g. `mongo-*` and `prisma-*`).

## AI & Agent Runtime

- **AI services** live in `src/features/products/services/aiDescriptionService.ts` and
  `src/features/products/services/aiTranslationService.ts`. Product AI job processing lives in
  `src/features/jobs/workers/productAiQueue.ts` (orchestrated by
  `src/features/jobs/services/productAiService.ts`).
- **Job workers** for chatbot/agent queues live in `src/features/jobs/workers/`
  (e.g. `chatbotJobQueue.ts`, `agentQueue.ts`).
- **Agent runtime** lives in `src/features/agent-runtime/` with planning, execution, memory,
  and tool orchestration. It uses `OLLAMA_BASE_URL` when targeting local models.
- **Chatbot API** is implemented in `src/app/api/chatbot/route.ts`.
- **Chatbot feature UI + state** live in `src/features/chatbot/`.
- **Agent creator UI + settings** live in `src/features/agentcreator/`.
- **Agent run monitoring API** routes are under `src/app/api/agentcreator/agent/*`
  with handlers in `src/features/agentcreator/api/agent/*`.
- **AI models** are configured via settings and env; OpenAI or Ollama is picked
  dynamically by model name.

## Notes & Folder Tree

- Folder tree UI + helpers live in `src/features/foldertree/` and are reused by notes.

## Integrations

- Base.com/Baselinker import/export is first-class:
  - `src/features/integrations/services/imports/` and `src/features/integrations/services/exports/`
  - `src/app/api/integrations/imports/base/*`
  - `src/app/api/integrations/products/[id]/export-to-base/route.ts`

## Playwright Personas

- Shared Playwright persona settings live in `src/features/playwright/`.
- Personas are stored via `/api/settings` under the `playwright_personas` key.

## Data Import/Export

- Product import/export UI and shared helpers live in `src/features/data-import-export/`.
- CSV product import uses `/admin/import` with the handler in `src/features/data-import-export/api/import/route.ts`.

## File Storage

- Files are stored under `public/uploads/*`.
- Metadata lives in `ImageFile` records (Prisma or Mongo).
- See `src/features/files/utils/fileUploader.ts` and `src/app/api/files/*`.

## Error Handling & Logging

- **Error helpers** live in `src/shared/errors/*`.
- **System logging** services live in `src/features/observability/services/*`
  (system logger, log repository, critical notifier, ErrorSystem).
- **Client error logging** lives in `src/features/observability/utils/client-error-logger.ts`.
- **System logs UI** lives in `src/features/observability/pages/SystemLogsPage.tsx`
  with the route wrapper in `src/app/(admin)/admin/system/logs/page.tsx`.

## Conventions That Actually Match the Code

- **Routes**: thin handlers, Zod-validated inputs, call services/repositories.
- **Services**: `src/features/*/services` or `src/shared/lib/services` modules, not always classes.
- **Repositories**: live under feature services folders (e.g. `src/features/*/services/*-repository`).
- **Types**: shared definitions live in `src/shared/types/`, with feature-specific types under `src/features/*/types/`.
- **UI**: ShadCN components are copy-pasted; do not assume external UI packages.

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

## Commands (package.json)

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

## Agent Hygiene & Restrictions

- **Do NOT read** `AIPrompts/` (admin-only sensitive).
- **Do NOT read or write** other agents' AIReasoning folders.
- **Do NOT commit** reasoning/results files.
- Use your own `AIReasoning/<Agent>/` folder if needed.

## Update Expectations

If you change architecture, data providers, or AI flows, update this file and
`GEMINI.md` to keep them accurate.

---

**Last Updated**: January 27, 2026
