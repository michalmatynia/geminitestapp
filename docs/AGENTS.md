# AGENTS.md - AI Agent Operating Guide

This is the authoritative, up-to-date guide for AI agents working in this repo.
Keep this file accurate and lean. Other agent docs should defer to it.

## Project Snapshot (Reality, not marketing)

- **Product**: AI-forward, multi-app platform with admin + public frontends.
- **Framework**: Next.js 16.1.1 (App Router) + React 19.2.3
- **Language**: TypeScript 5.9.3 (strict true)
- **DB**: Prisma 7.3.0 with optional MongoDB provider
- **Auth**: NextAuth/Auth.js 5.0.0-beta.30 (MongoDB adapter)
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
    drafter/            # Product draft templates + editor
    products/           # Product domain UI + services
  shared/               # Cross-feature UI primitives, components, utils, hooks, types
    lib/                # Shared runtime helpers (api, db, query-client, transient-recovery)
    types/              # Shared TS types (cross-feature)
    ui/                 # ShadCN/ui components
prisma/                 # Prisma schema + migrations
public/uploads/         # File storage (images, notes)
```

## Data Layer Reality

The platform can run on **Prisma** or **MongoDB**, selected by:

- `app_db_provider` setting (db)
- `APP_DB_PROVIDER` env var
- Fallback: prefer Mongo when `MONGODB_URI` is set, else Prisma when `DATABASE_URL` exists

See: `src/shared/lib/db/app-db-provider.ts` plus feature providers in
`src/features/*/services/*-provider.ts` (products, cms, integrations, notes, internationalization).

## CMS Domains & Slugs (Mongo)

- CMS slugs are scoped per **domain** via Mongo collections `cms_domains` and `cms_domain_slugs`.
- Slugs can be shared across domains; default slug is **domain-specific**.
- Slug APIs and pickers resolve the active domain from the request host.

**AI Paths storage** uses Prisma when `DATABASE_URL` is set, otherwise MongoDB
(collections: `ai_path_runs`, `ai_path_run_nodes`, `ai_path_run_events`).
Ensure `MONGODB_URI` is set if Prisma is not configured.

**Auth + user storage is MongoDB-only** (`users`, `sessions`, `accounts`, `auth_security_profiles`).
Auth settings (roles, permissions, policies) are stored in the Mongo `settings` collection.

## AI & Agent Runtime

- **AI services** live in `src/features/products/services/aiDescriptionService.ts` and
  `src/features/products/services/aiTranslationService.ts`. Product AI job processing lives in
  `src/features/jobs/workers/productAiQueue.ts` (orchestrated by
  `src/features/jobs/services/productAiService.ts`).
- **AI Paths persistent runtime** runs are stored in Mongo only:
  `ai_path_runs`, `ai_path_run_nodes`, `ai_path_run_events`.
  Queue worker: `src/features/jobs/workers/aiPathRunQueue.ts`.
  API access is per-user scoped with `ai_paths.manage` permission and rate limits.
- **Job workers** for chatbot/agent queues live in `src/features/jobs/workers/`
  (e.g. `chatbotJobQueue.ts`, `agentQueue.ts`).
- **Agent runtime** lives in `src/features/agent-runtime/` with planning, execution, memory,
  and tool orchestration. Model routing is resolved via AI Brain capabilities.
- **Chatbot API** is implemented in `src/app/api/chatbot/route.ts`.
- **Chatbot feature UI + state** live in `src/features/chatbot/`.
- **Agent creator UI + settings** live in `src/features/agentcreator/`.
- **Agent run monitoring API** routes are under `src/app/api/agentcreator/agent/*`
  with handlers in `src/features/agentcreator/api/agent/*`.
- **AI models** are configured via settings and env; OpenAI or Ollama is picked
  dynamically by model name.

## Notes & Folder Tree

The Master Folder Tree is a shared, production-grade tree engine used by **11 independent instances**:
`notes`, `image_studio`, `product_categories`, `cms_page_builder`, `case_resolver`,
`case_resolver_cases`, `validator_list_tree`, `validator_pattern_tree`,
`prompt_exploder_hierarchy`, `brain_catalog_tree`, `brain_routing_tree`.

**Key directories:**
- `src/features/foldertree/v2/` — engine root (barrel: `index.ts`)
  - `hooks/useFolderTreeInstanceV2.ts` — main React hook; returns `MasterFolderTreeController`
  - `hooks/useFolderTreeKeyboardNav.ts` — opt-in keyboard navigation hook
  - `components/FolderTreeViewportV2.tsx` — virtualized tree viewport (TanStack Virtual)
  - `components/FolderTreeContextMenu.tsx` — right-click context menu wrapper
  - `runtime/MasterFolderTreeRuntimeProvider.tsx` — cross-instance runtime bus (undo, keyboard dispatch)
  - `operations/` — pure-function utilities: `expansion`, `keyboard`, `selection`, `search`, `clipboard`, `bulk`, `node-status`
  - `search/` — search bar components + `FolderTreeSearchViewport` composite
  - `adapter/createMasterFolderTreeAdapterV3.ts` — adapter factory (prepare/apply/commit/rollback)
- `src/shared/contracts/master-folder-tree.ts` — `MasterFolderTreeController`, `FolderTreeProfileV2`, `MasterTreeNodeStatus`
- `src/shared/utils/folder-tree-profiles-v2.ts` — Zod schemas, `parseFolderTreeProfilesV2`, `defaultFolderTreeProfilesV2`

**Controller capabilities (all optional, backward-compatible):**
- `expandToNode(nodeId)` — expands all ancestors to reveal a deep node
- `scrollToNode(nodeId)` — programmatically scrolls viewport (requires `scrollToNodeRef` on viewport)
- `selectedNodeIds` (Set) + `toggleSelectNode`, `selectNodeRange`, `selectAllNodes`, `clearMultiSelection`, `setSelectedNodeIds` — multi-selection
- `expandNode/collapseNode/expandAll/collapseAll`, `startRename/commitRename/cancelRename`, `moveNode/reorderNode/dropNodeToRoot`, `undo`, `replaceNodes`, `refreshFromAdapter`

**Profile-driven capabilities** (`FolderTreeProfileV2` optional sections):
- `keyboard` — arrow nav, Enter-to-rename, Delete key
- `multiSelect` — Ctrl+click, Shift+click, Ctrl+A
- `search` — built-in search bar, debounce, filter modes (`highlight` | `filter_tree`)
- `badges` — children count or custom metadata badge
- `statusIcons` — per-status icon IDs; read from `node.metadata['_status']` (`loading|error|locked|warning|success`)

**Viewport props** (all optional, zero overhead when absent):
- `renderNode` — custom row renderer (receives `FolderTreeViewportRenderNodeInput` incl. `nodeStatus`)
- `contextMenuItems(node, controller)` — right-click menu factory per row
- `estimateRowHeight` — number or per-row function for dynamic virtualization
- `autoExpandOnHoverMs` — auto-expand collapsed folders on drag hover (default 600ms)
- `scrollToNodeRef` — wires `scrollToNode` into the controller
- `onNodeDrop`, `canDrop`, `resolveDropPosition`, `canStartDrag`, `onNodeDragStart` — drop customization

**Node status convention:** set `node.metadata['_status']` to one of the `MasterTreeNodeStatus` values;
the default row renderer shows a colored status glyph automatically. Use `getMasterTreeNodeStatus(node)` to read it.

**Operations (pure functions, no React):** `getAncestorIds`, `resolveKeyboardAction`,
`resolveNextSelectedNodeIds`, `isNodeInSelection`, `getSelectionBoundary`,
`searchMasterTreeNodes`, `filterMasterTreeToMatches`, `captureMasterTreeClipboard`,
`applyMasterTreePaste`, `bulkMoveNodes`, `bulkDeleteNodes`, `getMasterTreeNodeStatus`

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
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
OPENAI_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434
BASE_API_URL=https://api.baselinker.com/connector.php
INTEGRATION_ENCRYPTION_KEY=...
ALLEGRO_AUTH_URL=https://allegro.pl/auth/oauth/authorize
ALLEGRO_TOKEN_URL=https://allegro.pl/auth/oauth/token
NEXT_PUBLIC_APP_URL=http://localhost:3000
IMAGEKIT_ID=...
APP_DB_PROVIDER=prisma|mongodb
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

## Agent Hygiene & Restrictions

- **Do NOT read** `AIPrompts/` (admin-only sensitive).
- **Do NOT read or write** other agents' AIReasoning folders.
- **Do NOT commit** reasoning/results files.
- Use your own `AIReasoning/<Agent>/` folder if needed.

## Update Expectations

If you change architecture, data providers, or AI flows, update this file.
Only update `GEMINI.md` when a user explicitly requests it (it gets reverted otherwise).

---

**Last Updated**: February 1, 2026
