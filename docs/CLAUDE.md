---
owner: 'Platform Team'
last_reviewed: '2026-03-16'
status: 'active'
doc_type: 'agent-guide'
scope: 'repo'
canonical: true
---

# CLAUDE.md - Claude Overlay

This is a lightweight Claude-specific overlay. It should stay short and defer
to the canonical repo references.

## Read Order

1. `docs/CLAUDE.md` for Claude-specific working style
2. `docs/AGENTS.md` for authoritative repo guidance
3. `GEMINI.md` for the deeper code-backed architecture reference
4. feature docs such as `docs/ai-paths/overview.md` or `docs/case-resolver/index.md`
   when working in those areas

## Claude-Specific Guidance

- Lean into deep analysis when the task is architectural, cross-cutting, or
  risk-heavy.
- Prefer careful, bounded refactors over broad speculative rewrites.
- State assumptions explicitly when persistence routing, queues, or AI runtime
  behavior affect the answer.
- Verify current paths before reasoning from memory. This repo has moved away
  from older root-level `app/`, `lib/`, and `types/` conventions.

## Current Repo Reality

- Source code lives under `src/`, not root-level app folders.
- App routes live in `src/app/`.
- Feature modules live in `src/features/`.
- Shared platform code lives in `src/shared/`.
- Admin UI lives in `src/app/(admin)/admin/`.
- Public/CMS frontend lives in `src/app/(frontend)/`.
- API routes live in `src/app/api/`.
- AI subsystems live primarily in `src/features/ai/` and `src/shared/lib/ai-*`.
- Database routing and provider selection live in `src/shared/lib/db/`.
- Queue infrastructure lives in `src/shared/lib/queue/` with startup in
  `src/features/jobs/queue-init.ts`.

## Where To Look First

- Admin shell and dashboards: `src/features/admin/`
- Auth and session flow: `src/features/auth/`, `src/app/auth/`, `src/proxy.ts`
- AI Paths: `src/features/ai/ai-paths/`, `src/shared/lib/ai-paths/`,
  `docs/ai-paths/overview.md`
- AI Brain/model routing: `src/shared/lib/ai-brain/`
- CMS/frontend rendering: `src/features/cms/`, `src/app/(frontend)/`
- Database engine routing: `src/features/database/`, `src/shared/lib/db/`
- Observability/logging: `src/features/observability/`,
  `src/shared/lib/observability/`
- Shared query/data conventions: `src/shared/lib/query-factories-v2.ts`,
  `docs/platform/architecture-guardrails.md`
- Raw `queryClient.fetchQuery(...)`, `queryClient.prefetchQuery(...)`, and
  `queryClient.ensureQueryData(...)` are forbidden outside the shared helper
  implementation file.

## High-Signal Constraints

- Prefer feature `public.ts` / `server.ts` entrypoints from app-layer code.
- Do not assume a single persistence backend. App, auth, CMS, integrations, and AI
  flows can route differently across MongoDB and Redis-backed helpers.
- Do not assume Redis is always available. Several queues support inline
  fallback behavior when Redis is absent.
- Treat generated docs and guardrail scripts as active maintenance surfaces when
  touching AI Paths, validator docs, or architecture boundaries.
- When consuming scanner/check `--summary-json` output, preserve the envelope
  sections instead of flattening them: `summary`, `details`, `paths`,
  `filters`, and `notes` each have a distinct role.

## Locked Build Configuration — DO NOT MODIFY

The following files contain the production/Vercel build configuration and must
**NOT** be modified by AI agents without explicit user approval:

- `next.config.mjs` — Next.js build config (standalone output, cpus, memory, optimizePackageImports, serverExternalPackages)
- `package.json` `"build"` script — heap size (`--max-old-space-size=3584`) tuned for Vercel free-tier 8GB limit
- `tsconfig.json` — TypeScript compiler config and `include`/`exclude` paths
- `vercel.json` — Vercel deployment settings (if present)

**Key build constraints that must be preserved:**
- `--max-old-space-size=3584` in the build script (Vercel: 1 main + 1 worker × 3.5GB = 7GB, leaves 1GB for OS)
- `experimental.cpus: 1` — limits worker processes to fit Vercel Standard 8GB machine
- Conditional `output: 'standalone'` — enabled only for non-Vercel deploys (Docker/self-hosted); disabled on Vercel to avoid expensive file-tracing
- `typescript.ignoreBuildErrors: true` — type-checking is enforced in CI, not during `next build`

If you need to change any of these files, **stop and ask the user for permission first**.

## Sensitive / Avoid-By-Default Areas

- Do not scan `AIPrompts/` unless the task explicitly requires it.
- Do not read other agents' reasoning/result folders unless the user asks for
  them directly.
- Do not treat ad hoc tmp/debug artifacts as authoritative architecture docs.

## Common Commands

```bash
npm run dev
npm run lint
npm run test
npm run test:e2e
npm run check:factory-meta
npm run metrics:guardrails
npm run bazel:toolchain
npm run bazel:smoke
npm run bazel:quality
npm run bazel:regressions
npm run bazel:ci
bun run bun:repo:toolchain
bun run bun:repo:smoke
bun run bun:repo:quality
bun run bun:repo:ci
```

## Last Updated

Aligned to the scanned repo structure on `2026-03-16`.
