# AGENTS.md - AI Agent Operating Guide

This is the authoritative, up-to-date guide for AI agents working in this repo.
Keep this file accurate and lean. Other agent docs should defer to it.

## Project Snapshot (Reality, not marketing)

- **Product**: AI-forward, multi-app platform with admin + public frontends.
- **Framework**: Next.js 16.1.1 (App Router) + React 19.2.3
- **Language**: TypeScript 5.9 (strict true)
- **DB**: Prisma 7.2.0 (Postgres) with optional MongoDB provider
- **Auth**: NextAuth/Auth.js 5.0.0-beta.30
- **UI**: Tailwind CSS 4.1 + ShadCN/ui (copy-pasted in `components/ui/`)
- **Data**: TanStack Query + TanStack Table
- **AI**: OpenAI SDK (chat completions) with optional Ollama local models
- **Runtime**: Custom server (`server.cjs`) for dev/prod start

## Multi-App Structure (Current)

- **Admin app**: `app/(admin)/admin/*` (products, drafts, notes, settings, integrations)
- **Public app**: `app/(frontend)/*` (product listings, detail pages)
- **Shared API**: `app/api/*` (REST-style routes for admin + frontend)

## Core Directories (Actual)

```
app/
  (admin)/admin/        # Admin UI
  (frontend)/           # Public UI
  api/                  # Server routes (Next.js route handlers)

lib/
  agent/                # Internal agent runtime (planning/execution/memory/tools)
  chatbot/              # AI job orchestration
  context/              # React context providers
  db/                   # Mongo client + helpers
  hooks/                # Custom React hooks
  services/             # Domain services + repositories
  utils/                # Shared utilities
  validations/          # Zod schemas
  prisma.ts             # Prisma client bootstrap

components/
  ui/                   # ShadCN/ui primitives
  ...                   # Feature components

types/                  # Shared TS types (source of truth)
prisma/                 # Prisma schema + migrations
public/uploads/         # File storage (images, notes)
```

## Data Layer Reality

The platform can run on **Prisma (Postgres)** or **MongoDB**, selected by:
- `product_db_provider` setting (db)
- `PRODUCT_DB_PROVIDER` env var
- Fallback to Prisma when `DATABASE_URL` exists, else Mongo if `MONGODB_URI` exists

See: `lib/services/product-provider.ts` and repository implementations under
`lib/services/*-repository/` (e.g. `mongo-*` and `prisma-*`).

## AI & Agent Runtime

- **AI services** live in `lib/services/aiDescriptionService.ts`,
  `lib/services/aiTranslationService.ts`, and `lib/services/productAiQueue.ts`.
- **Agent runtime** lives in `lib/agent/` with planning, execution, memory,
  and tool orchestration. It uses `OLLAMA_BASE_URL` when targeting local models.
- **Chatbot API** is implemented in `app/api/chatbot/route.ts`.
- **AI models** are configured via settings and env; OpenAI or Ollama is picked
  dynamically by model name.

## Integrations

- Base.com/Baselinker import/export is first-class:
  - `lib/services/imports/` and `lib/services/exports/`
  - `app/api/products/imports/base/*`
  - `app/api/products/[id]/export-to-base/route.ts`

## File Storage

- Files are stored under `public/uploads/*`.
- Metadata lives in `ImageFile` records (Prisma or Mongo).
- See `lib/utils/fileUploader.ts` and `app/api/files/*`.

## Conventions That Actually Match the Code

- **Routes**: thin handlers, Zod-validated inputs, call services/repositories.
- **Services**: `lib/services/*` functions or modules, not always classes.
- **Repositories**: live under `lib/services/*-repository` with Prisma/Mongo impls.
- **Types**: primary definitions live in `types/`.
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

**Last Updated**: January 23, 2026
