---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'agent-guide'
scope: 'repo'
canonical: true
---

# AGENTS.md - AI Agent Operating Guide

This is the authoritative agent guide for this repository. Keep it accurate,
code-backed, and shorter than `GEMINI.md`. Other overlay docs should defer to it.

## Read Order

1. `docs/AGENTS.md` for agent rules and repo working conventions
2. `GEMINI.md` for the deeper scanned architecture reference
3. `docs/README.md` for the docs map
4. `docs/documentation/README.md` when the task touches docs
5. feature docs such as `docs/ai-paths/overview.md`, `docs/case-resolver/index.md`,
   or `docs/validator/README.md` when working in those areas
6. Kangur/StudiQ work: start with `docs/kangur/README.md` and
   `docs/kangur/studiq-application.md` before editing Kangur or StudiQ surfaces

## Repo Snapshot

- Product: AI-forward multi-app platform with admin, CMS/public frontend, and a
  large shared API surface
- Framework: Next.js 16 App Router + React 19 + TypeScript strict mode
- Runtime: custom Node server via `server.cjs`
- Data: MongoDB and optional Redis-backed queue/cache/routing
- UI/data stack: Tailwind 4, local shared UI, TanStack Query, TanStack Table
- AI stack: AI Paths, chatbot, agent runtime, AI Brain routing, image studio,
  AI insights, product AI flows

## Locked Build Configuration — DO NOT MODIFY

The following files are locked and must NOT be modified by AI agents without explicit user approval:

- `next.config.mjs` — Next.js build config
- `package.json` `"build"` script — heap size tuned for Vercel
- `tsconfig.json` — TypeScript compiler config
- `vercel.json` — Vercel deployment settings (if present)

Key constraints: `NODE_OPTIONS='--max-old-space-size=8192'` in the build
script, conditional `output: 'standalone'` (disabled on Vercel and Turbopack
builds), and `typescript.ignoreBuildErrors: true`. There is currently no
explicit `experimental.cpus` override in `next.config.mjs`.

If you need to change any of these files, stop and ask the user for permission first.

## Canonical Repo Lanes

Use these as the primary cross-cutting execution lanes before reaching for
older helper scripts:

- Bazel repo toolchain lane: `npm run bazel:toolchain`
- Bazel repo smoke lane: `npm run bazel:smoke`
- Bazel repo quality lane: `npm run bazel:quality`
- Bazel repo regression lane: `npm run bazel:regressions`
- Bazel repo CI lane: `npm run bazel:ci`
- Bun repo toolchain lane: `bun run bun:repo:toolchain`
- Bun repo smoke lane: `bun run bun:repo:smoke`
- Bun repo quality lane: `bun run bun:repo:quality`
- Bun repo CI lane: `bun run bun:repo:ci`

## Documentation Placement Rules

Use the nearest-owner rule first, then the document-type rule.

- Root `docs/`: entrypoints, governance, and agent overlays only
- `docs/platform/`: new cross-cutting architecture, handbook, API policy,
  shared patterns, and platform references
- `docs/<feature>/`: feature-owned overviews, architecture, APIs, examples,
  local runbooks, and references
- `docs/runbooks/`: cross-feature operational procedures
- `docs/plans/`: cross-feature implementation plans, migration plans, and
  closeouts
- `docs/decisions/`: cross-feature decisions, exception registers, matrices,
  and architecture records
- `docs/migrations/`: migration wave execution artifacts and reports
- generated areas such as `docs/metrics/`, `docs/ai-paths/semantic-grammar/`,
  and `docs/validator/semantic-grammar/`: generated outputs only

Hard rules:

- never create new dated files directly under `docs/`
- never place generated outputs in hand-written doc folders
- never add a new doc without updating the nearest index or hub page
- every `docs/**/` directory with markdown content must expose a `README.md` or
  `index.md` hub page
- every child docs hub must be linked from its immediate parent hub unless the
  structure manifest explicitly exempts it
- every `canonical: true` docs file must be listed in `requiredCanonicalDocs`
  within the structure manifest
- every docs hub must follow its declared indexing policy: either a
  complete direct-file index or a curated stable-entry-point index
- hand-written stable entry points surfaced by curated hubs should be canonical
  docs with metadata, not untyped markdown strays
- every artifact-only docs directory must either have a local hub or be declared
  in the structure manifest and linked from an owning markdown doc
- never silently replace a canonical doc with a second doc covering the same role
- update repo-internal consumers to canonical doc paths in the same patch when
  removing obsolete root aliases
- root compatibility stubs are an exceptional escape hatch, not the default
  migration model; do not keep them once repo-internal consumers are updated
- canonical docs and repo reference guides must use canonical destinations as
  their steady-state paths
- compatibility mirrors for machine-readable artifacts must stay byte-identical
  to their canonical source until they are removed
- when a manifest-defined mirror changes, prefer `npm run docs:structure:sync-mirrors`
  over hand-copying the mirror file
- remove compatibility mirrors once internal consumers are gone; do not keep
  them indefinitely out of habit

## AI Documentation Workflow

When a task changes docs:

1. Classify the scope: repo-wide, cross-feature, feature-specific, generated, or
   migration-only.
2. Classify the doc type: index, overview, architecture, reference, runbook,
   plan, decision, or generated artifact.
3. Place the file in the canonical folder from `docs/documentation/README.md`.
4. Add or update metadata fields such as `owner`, `last_reviewed`, `status`,
   `doc_type`, and `scope`.
5. If the doc is canonical, register it in `requiredCanonicalDocs`.
6. Update the nearest hub page and `docs/README.md` when the doc is
   cross-cutting.
7. If the change introduces a markdown-bearing docs folder, add a `README.md` or
   `index.md` hub in the same patch.
8. If the change adds a child docs hub, link it from the immediate parent hub in
   the same patch unless the structure manifest documents an exemption.
9. If the change supersedes older material, cross-link it explicitly and mark the
   old doc for follow-up migration or archival.
10. Run `npm run docs:structure:check` when the change affects documentation
   placement, metadata, or hub pages.
11. If the docs structure manifest declares a compatibility mirror pair, sync it
    with `npm run docs:structure:sync-mirrors`.
12. When linking to documentation, use the canonical destination rather than an
    obsolete root alias.
13. If the folder uses a curated hub model, update the stable entry-point list
    when the active documentation surface changes.
14. If the change introduces a non-markdown artifact bucket, add its manifest
    policy and owning markdown reference in the same patch.
15. If the task is frontmatter normalization rather than a targeted doc edit,
    run `npm run docs:structure:audit:frontmatter` first and work one folder or
    policy slice at a time.
16. If the task touches generated markdown under `docs/metrics/`, run
    `npm run docs:metrics:normalize-frontmatter` instead of manually editing the
    generated snapshots one by one.
17. Stable generated metrics entry points are the `README.md` hubs,
    `route-hotspots.md`, and `*-latest.md` aliases; timestamped metrics history
    files are optional generated artifacts and should be written only when a
    task explicitly needs history via `--write-history`.
18. If a docs generator writes markdown into a managed canonical surface, keep
    frontmatter in the generator itself through the shared helpers under
    `scripts/docs/` instead of relying on a later cleanup pass.
19. Do not hand-tune metadata on managed generated-doc outputs after generation;
    if the metadata contract needs to change, update the shared helper and let
    `npm run docs:structure:check` enforce it.
20. If a historical docs surface has no live repo consumers left, prune it
    instead of preserving it as passive archive clutter.
21. If a later dated plan or decision supersedes an older one, remove the older
    version once active references and tooling have moved to the newer record.

## Scanner JSON Contract

When a repository scanner or check runs with `--summary-json`, treat stdout as a
fixed envelope rather than ad hoc JSON.

- `summary`: scalar headline metrics only
- `details`: arrays/maps of findings and supporting structured data
- `paths`: emitted artifact locations
- `filters`: run flags and scan filters
- `notes`: annotations or operator hints

Use `buildScanOutput`, `parseScanOutput`, and `parseScanSummary` from
`scripts/architecture/lib/scan-output.mjs` for code consumers. If you are an AI
agent summarizing scanner output, keep findings in their matching fields instead
of collapsing everything into one mixed block.

## Testing Documentation Workflow

Major test runs must leave a written record.

- Canonical lanes are defined in
  `scripts/testing/config/test-suite-registry.mjs`
- Lane inventory is generated to
  `docs/metrics/testing-suite-inventory-latest.*`
- Run history is generated to
  `docs/metrics/testing-run-ledger-latest.*`

When you run a major validation pass, do one of the following:

1. Prefer a canonical lane such as `npm run test:lane:pr-required` or
   `npm run test:lane:weekly-audit`
2. If you run a bespoke major validation command, follow it with
   `npm run testing:record -- --label="..." --status=ok --suite=...`

Treat these as major runs:

- any lane with `pr-required`, `nightly-deep`, `weekly-audit`, or `release-gate`
- any manual build + e2e or multi-suite regression sweep
- any broader AI-agent validation pass used to support merge or release decisions

Every recorded entry should capture:

- what ran
- when it ran
- final status
- lane or suite scope
- duration when known
- generated artifact paths
- short follow-up notes for failures, skips, or advisory gaps

## Current Source Layout

Use current `src/` paths, not older root-level conventions.

### App routes

- Admin UI: `src/app/(admin)/admin/`
- Public/CMS frontend: `src/app/(frontend)/`
- Auth UI: `src/app/auth/`
- API routes: `src/app/api/`

### Feature modules

Top-level features live under `src/features/`, including:

- `admin`
- `ai`
- `app-embeds`
- `auth`
- `case-resolver`
- `cms`
- `data-import-export`
- `database`
- `document-editor`
- `drafter`
- `filemaker`
- `files`
- `foldertree`
- `gsap`
- `integrations`
- `internationalization`
- `jobs`
- `kangur`
- `notesapp`
- `observability`
- `playwright`
- `product-sync`
- `products`
- `prompt-engine`
- `prompt-exploder`
- `tooltip-engine`
- `viewer3d`

AI subsystems are primarily under `src/features/ai/`.

### Active workspaces outside `src/`

- `apps/mobile` is the active Expo Router native Kangur app
- `apps/mobile-web` is reserved for a future dedicated React Native Web target
- `packages/kangur-contracts`, `packages/kangur-core`,
  `packages/kangur-api-client`, and `packages/kangur-platform` are active
  shared workspaces

### Shared platform code

Shared platform/runtime code lives under `src/shared/`, especially:

- `src/shared/contracts/`
- `src/shared/lib/ai-brain/`
- `src/shared/lib/ai-paths/`
- `src/shared/lib/db/`
- `src/shared/lib/files/`
- `src/shared/lib/observability/`
- `src/shared/lib/queue/`
- `src/shared/lib/security/`
- `src/shared/providers/`
- `src/shared/ui/`

### Kangur + StudiQ quick map

- Front page ownership and StudiQ routing: `src/shared/lib/front-page-app.ts`,
  `src/app/(frontend)/page.tsx`, `src/app/(frontend)/kangur/(app)/[[...slug]]/page.tsx`
- Kangur routing + embed params: `src/features/kangur/config/routing.ts`
- Kangur learner pages: `src/features/kangur/ui/pages/`
- Kangur admin pages: `src/features/kangur/admin/` (`AdminKangurPageShell`)
- CMS app embed option (StudiQ): `src/shared/lib/app-embeds.ts`
- AI Tutor content sources: `src/features/kangur/page-content-catalog.ts`,
  `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts`
- Canonical docs: `docs/kangur/README.md`, `docs/kangur/studiq-application.md`

## Runtime Reality

- Dev and prod start through `server.cjs`.
- `src/instrumentation.ts` and `src/instrumentation-node.ts` register startup
  logging, database validation, process error hooks, and queue initialization.
- `src/proxy.ts` handles `/admin/*` and `/api/*`, ensuring CSRF cookie setup and
  auth wrapping for admin flows.
- `src/app/layout.tsx` bootstraps query, settings, session, background sync,
  CSRF, URL guard, analytics, and client error reporting providers.

## Data Layer Rules

- Do not assume MongoDB is the only stateful service.
- App, auth, CMS, products, integrations, and other services can still depend
  on Database Engine routing and Redis-backed helpers.

Key files:

- `src/shared/lib/db/app-db-provider.ts`
- `src/shared/lib/db/database-engine-policy.ts`
- `src/shared/lib/auth/services/auth-provider.ts`

Important current behavior:

- app provider can resolve from env, settings, or Database Engine routes
- MongoDB is the required primary database configuration for app data
- auth can be routed independently from app data
- Redis is a supported Database Engine target for selected routing/caching cases,
  but not for every service

## Queue and Async Work Rules

- Queue infrastructure lives in `src/shared/lib/queue/`.
- Worker startup lives in `src/features/jobs/queue-init.ts`.
- BullMQ is used when Redis is available.
- Several workflows fall back to inline processing when Redis is absent.

Do not assume durable queue behavior in local/dev unless the relevant env is set.

High-signal worker areas:

- `src/features/ai/ai-paths/workers/`
- `src/features/ai/chatbot/workers/`
- `src/features/ai/agent-runtime/workers/`
- `src/features/ai/image-studio/workers/`
- `src/features/integrations/workers/`
- `src/features/product-sync/workers/`
- `src/features/case-resolver/workers/`
- `src/shared/lib/observability/workers/`

## Feature Boundary Rules

- Prefer feature `public.ts` / `server.ts` entrypoints from app-layer code.
- Avoid deep cross-feature imports when a public/server entrypoint already exists.
- Treat `docs/platform/architecture-guardrails.md` as an active constraint, not
  optional reading.

Related checks:

- `npm run metrics:guardrails`
- `npm run metrics:all`
- `npm run check:factory-meta`
- `npm run check:factory-meta:strict`

## Query and State Conventions

- The preferred data-fetching layer is the shared TanStack Query factory system,
  not ad hoc direct query usage everywhere.
- See `src/shared/lib/query-factories-v2.ts`.
- Raw `queryClient.fetchQuery(...)`, `queryClient.prefetchQuery(...)`, and
  `queryClient.ensureQueryData(...)` are forbidden outside that helper file.
- Query persistence, offline support, and advanced runtime hooks are wired into
  the root query provider.

When editing feature hooks, verify they still align with shared query keys,
telemetry metadata, invalidation conventions, and the manual-query helper rule.

## Files, Media, and Storage

- Local uploads live under `public/uploads/`.
- Storage can switch between local and FastComet-backed remote storage.
- File storage behavior is resolved from settings and env, not only from code defaults.

Key files:

- `src/shared/lib/files/file-uploader.ts`
- `src/shared/lib/files/services/storage/file-storage-service.ts`
- `src/features/files/pages/AdminFileStorageSettingsPage.tsx`

## Testing Layout

Tests are split across:

- top-level `__tests__/`
- colocated `src/**/__tests__/`
- Playwright specs in `e2e/features/`

Do not assume a feature’s tests live in only one place.

Core commands:

```bash
npm run test
npm run test:coverage
npm run test:e2e
```

## Deep Application Scan

Use this for a full application-level scan or when a task asks for a "deep
scan". The full runbook lives at `docs/runbooks/application-performance-operations.md`.

Default scan command:

```bash
npm run perf:ops:baseline
```

Notes:

- The baseline run includes `observability:check` plus critical-path budgets,
  critical-flow tests, route hotspots, and unit-domain timings.
- Generated artifacts land under `docs/metrics/*-latest.*`,
  `docs/metrics/route-hotspots.md`, and `logs/observability-check*.log`.
- Do not hand-edit generated metrics/log outputs; re-run the scan instead.
- For scan-only JSON snapshots without writing `docs/metrics`, follow the
  runbook’s `--summary-json --no-write --no-history` commands.

## Sensitive and Non-Authoritative Areas

- Avoid scanning `AIPrompts/` unless the task explicitly requires it.
- Avoid other agents' reasoning/result folders unless the user explicitly asks.
- Do not treat `tmp/`, ad hoc debug scripts, or one-off output files as
  authoritative architecture documentation.

## Common Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run test:e2e
npm run seed
npm run seed:admin
npm run auth:indexes
npm run cleanup:db-providers
npm run cleanup:cms-blocks
npm run cleanup:category-mapping-duplicates
npm run metrics:guardrails
npm run check:factory-meta
npm run test:coverage:high-risk
npm run check:coverage:high-risk
npm run check:test-distribution
npm run check:test-quality
npm run sync:toolchain:mirrors
npm run check:toolchain:contract:node
npm run test:toolchain:contract
bun run check:bun:config
bun run check:toolchain:contract
bun run check:node:toolchain-sync
bun run lock:bun:sync
bun run test:bun:runtime
bun run check:bun:compat
```

## Documentation Maintenance Rule

- Update `docs/AGENTS.md` when repo-wide working conventions, architecture
  boundaries, or agent rules change.
- Update `GEMINI.md` when the deeper architecture reference has drifted from the
  codebase.
- Update `docs/documentation/README.md` when the documentation taxonomy or
  placement rules change.
- Keep `docs/CLAUDE.md` and other overlays shorter than this file.

## Last Updated

Aligned to the scanned repo structure and documentation taxonomy on `2026-03-26`.
