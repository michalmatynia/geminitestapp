# GEMINI.md - Project Reference (Authoritative)

## IMPORTANT: Read-Only Unless Asked

Do not modify `GEMINI.md` unless a user explicitly requests it. When asked, keep edits minimal and scoped to the request. (Gemini CLI has been reverting changes.)

## Project Snapshot (Verified)

This repo is an **AI-forward, multi-app platform** built on Next.js (App Router) with a
shared API layer, a feature-rich admin app, and a public frontend. It ships with a
custom Node server, Prisma + optional MongoDB providers, and a growing AI runtime
(chatbot, agent runtime, AI paths, integrations).

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set environment variables (see below).
3. Initialize DB (Prisma):
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

The dev/prod server uses `server.cjs` (HTTP server on port 3000).

## Commands (package.json)

```
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:ui
npm run test:coverage
npm run test:e2e
npm run seed
npm run seed:admin
npm run cleanup:db-providers
npm run cleanup:cms-blocks
npm run check:api-error-sources
npm run auth:indexes
npm run debug
```

## Stack (from package.json)

- Next.js ^16.1.1 (App Router, currently 16.1.x)
- React 19.2.3
- TypeScript 5.9.3 (strict)
- Prisma 7.3.0
- NextAuth/Auth.js 5.0.0-beta.30 + @auth/core 0.41.1
- MongoDB adapter (@auth/mongodb-adapter)
- Tailwind CSS 4.1.18 + ShadCN/ui (copy-pasted in `src/shared/ui/`)
- TanStack Query + TanStack Table
- GSAP 3.14.2 (CMS frontend animations)
- Three.js stack: `three`, `@react-three/fiber`, `@react-three/drei`, `postprocessing`
- OpenAI SDK 6.15
- Zod 4.3.5

## Runtime + Build

- Custom server: `server.cjs` (Node HTTP server) for dev/prod.
- Build: `prisma generate && next build`.
- Next config: `output: "standalone"`, `serverExternalPackages: ["@prisma/client", "bcrypt"]`.
- Remote image patterns include ImageKit and Baselinker CDN (`next.config.mjs`).

## App Structure (App Router)

```
src/app/
  (admin)/admin/        # Admin UI (products, drafts, notes, integrations, CMS, AI paths, system)
  (frontend)/           # Public UI (product listing + CMS pages + preview)
  api/                  # REST-style API routes
  auth/                 # Sign-in/register UI routes
```

Notable API route groups:
- `/api/products`, `/api/drafts`, `/api/notes`
- `/api/integrations` (imports/exports, connections, jobs)
- `/api/cms` (pages, blocks, themes, media, domains)
- `/api/ai-paths`, `/api/agentcreator`, `/api/chatbot`
- `/api/files`, `/api/system`, `/api/databases`

## Core Directories (Actual)

```
src/
  app/                  # Routes + API handlers
  features/             # Domain features (UI + state + hooks + services)
    admin/
    agent-runtime/
    agentcreator/
    ai-paths/
    app-embeds/
    auth/
    chatbot/
    cms/
    data-import-export/
    database/
    drafter/
    files/
    foldertree/
    gsap/
    integrations/
    internationalization/
    jobs/
    notesapp/
    observability/
    playwright/
    products/
    viewer3d/
  shared/               # Shared UI + utils + types
```

## Feature Test Map

Explicit mapping of features to their test locations to aid AI context.

| Feature | Source | Unit/Integration Tests | E2E Tests |
| :--- | :--- | :--- | :--- |
| **Admin** | `src/features/admin` | `__tests__/features/admin` | `e2e/features/admin` |
| **Agent Runtime** | `src/features/agent-runtime` | `__tests__/features/agent-runtime` | - |
| **Agent Creator** | `src/features/agentcreator` | `__tests__/features/agentcreator` | `e2e/features/agentcreator` |
| **AI Paths** | `src/features/ai-paths` | `__tests__/features/ai-paths` | `e2e/features/ai-paths` |
| **App Embeds** | `src/features/app-embeds` | `__tests__/features/app-embeds` | - |
| **Auth** | `src/features/auth` | `__tests__/features/auth` | - |
| **Chatbot** | `src/features/chatbot` | `__tests__/features/chatbot` | `e2e/features/chatbot` |
| **CMS** | `src/features/cms` | `__tests__/features/cms` | `e2e/features/cms` |
| **Data Import/Export** | `src/features/data-import-export` | `__tests__/features/data-import-export` | `e2e/features/data-import-export` |
| **Database** | `src/features/database` | `__tests__/features/database` | `e2e/features/database` |
| **Drafter** | `src/features/drafter` | `__tests__/features/drafter` | `e2e/features/drafter` |
| **Files** | `src/features/files` | `__tests__/features/files` | `e2e/features/files` |
| **Folder Tree** | `src/features/foldertree` | `__tests__/features/foldertree` | - |
| **GSAP** | `src/features/gsap` | `__tests__/features/gsap` | - |
| **Integrations** | `src/features/integrations` | `__tests__/features/integrations` | `e2e/features/integrations` |
| **Internationalization** | `src/features/internationalization` | `__tests__/features/internationalization` | - |
| **Jobs** | `src/features/jobs` | `__tests__/features/jobs` | - |
| **Notes App** | `src/features/notesapp` | `__tests__/features/notesapp` | `e2e/features/notesapp` |
| **Observability** | `src/features/observability` | `__tests__/features/observability` | `e2e/features/observability` |
| **Playwright Mgr** | `src/features/playwright` | `__tests__/features/playwright` | - |
| **Products** | `src/features/products` | `__tests__/features/products` | `e2e/features/products` |
| **Viewer 3D** | `src/features/viewer3d` | `__tests__/features/viewer3d` | `e2e/features/viewer3d` |

## Data Layer (Verified)

- **Prisma** is the primary ORM; `DATABASE_URL` can point to SQLite (dev) or Postgres (prod).
- **MongoDB** is used by auth/user storage and various services; auth routes error without `MONGODB_URI`.
- **App-wide provider**: `app_db_provider` setting (stored in DB) or `APP_DB_PROVIDER` env; fallback prefers Mongo when `MONGODB_URI` is set, else Prisma (requires `DATABASE_URL` for Prisma).
- **CMS, products, integrations, notes, internationalization** use `getAppDbProvider` (app-wide selection).
- **AI Paths** repository chooses Prisma when `DATABASE_URL` is set, otherwise MongoDB (requires `MONGODB_URI` if Prisma is not configured).

## Integrations

- Base.com/Baselinker import/export and Allegro integration.
- Integration credentials are encrypted with `INTEGRATION_ENCRYPTION_KEY`.
- Base API URL configurable via `BASE_API_URL`.

## CMS + Frontend

- CMS pages, blocks, themes, and domain-scoped slugs.
- Frontend CMS rendering supports GSAP animations via `GsapAnimationWrapper`.
- App embeds are supported (e.g., chatbot blocks).
- Grid/row/column backgrounds can use ImageElement settings stored as `backgroundImage` for layered backgrounds.

## AI + Automation

- Product AI description/translation services live in `src/features/products/services/`.
- Job workers in `src/features/jobs/workers/` (AI paths, chatbot, agents, etc.).
- Chatbot and agent runtime in `src/features/chatbot/` + `src/features/agent-runtime/`.
- Agent run management UI/API in `src/features/agentcreator/` and `/api/agentcreator/*`.

## Files + Media

- Local file storage under `public/uploads/`.
- ImageKit integration supported (`IMAGEKIT_ID`).
- File API routes under `/api/files/*`.

## Observability

- Logging + diagnostics under `src/features/observability/` and `/api/system/*`.

## Testing

- Vitest + Testing Library for unit/UI tests.
- Playwright for e2e tests.

## Environment Variables (Common)

```
# Core
DATABASE_URL=
MONGODB_URI=
MONGODB_DB=
APP_DB_PROVIDER=prisma|mongodb

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# AI
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# Integrations
BASE_API_URL=https://api.baselinker.com/connector.php
INTEGRATION_ENCRYPTION_KEY=
ALLEGRO_AUTH_URL=https://allegro.pl/auth/oauth/authorize
ALLEGRO_TOKEN_URL=https://allegro.pl/auth/oauth/token

# Media
IMAGEKIT_ID=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Paths
AI_PATHS_RUN_CONCURRENCY=1
AI_PATHS_RUN_MAX_ATTEMPTS=3
AI_PATHS_RUN_BACKOFF_MS=5000
AI_PATHS_RUN_BACKOFF_MAX_MS=60000
AI_PATHS_RUN_RATE_LIMIT_WINDOW_SECONDS=60
AI_PATHS_RUN_RATE_LIMIT_MAX=20
AI_PATHS_RUN_ACTIVE_LIMIT=5
AI_PATHS_ACTION_RATE_LIMIT_WINDOW_SECONDS=60
AI_PATHS_ACTION_RATE_LIMIT_MAX=120
```

---

**Last Updated**: February 1, 2026
