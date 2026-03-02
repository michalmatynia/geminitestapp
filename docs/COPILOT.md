# COPILOT.md - Copilot Overlay

This is a lightweight GitHub Copilot overlay. It should stay short and defer to
the canonical repo references.

## Read Order

1. `docs/COPILOT.md` for Copilot-specific working style
2. `docs/AGENTS.md` for authoritative repo guidance
3. `GEMINI.md` for the deeper scanned architecture reference
4. feature docs such as `docs/AI_PATHS.md` or `docs/case-resolver/index.md`
   when working in those areas

## Copilot-Specific Guidance

- Prefer small, reviewable edits with `rg`-driven targeting.
- Reuse existing patterns before introducing new abstractions.
- Be careful with cross-feature imports; look for `public.ts` / `server.ts`
  entrypoints first.
- Verify paths before acting. This repo now uses `src/app`, `src/features`,
  and `src/shared`, not the older root-level `app/`, `lib/`, or `types/`
  layout.

## Current Repo Reality

- Source code lives under `src/`.
- App routes live in `src/app/`.
- Admin UI lives in `src/app/(admin)/admin/`.
- Public/CMS frontend lives in `src/app/(frontend)/`.
- API routes live in `src/app/api/`.
- Feature modules live in `src/features/`.
- Shared platform code lives in `src/shared/`.
- AI subsystems live primarily in `src/features/ai/` and `src/shared/lib/ai-*`.
- Database routing lives in `src/shared/lib/db/`.
- Queue infrastructure lives in `src/shared/lib/queue/` with startup in
  `src/features/jobs/queue-init.ts`.

## Where To Look First

- Admin shell and dashboards: `src/features/admin/`
- Auth/session flow: `src/features/auth/`, `src/app/auth/`, `src/proxy.ts`
- AI Paths: `src/features/ai/ai-paths/`, `src/shared/lib/ai-paths/`
- AI Brain/model routing: `src/shared/lib/ai-brain/`
- CMS/frontend rendering: `src/features/cms/`, `src/app/(frontend)/`
- Database engine routing: `src/features/database/`, `src/shared/lib/db/`
- Observability/logging: `src/features/observability/`,
  `src/shared/lib/observability/`

## High-Signal Constraints

- Do not assume Prisma-only persistence.
- Do not assume Redis is always available; several queues support inline
  fallback behavior.
- Treat `docs/ARCHITECTURE_GUARDRAILS.md` and query-factory metadata checks as
  active engineering constraints.

## Sensitive / Avoid-By-Default Areas

- Do not scan `AIPrompts/` unless the task explicitly requires it.
- Do not read other agents' reasoning/result folders unless the user asks for
  them directly.
- Do not treat `tmp/` or one-off debug output as authoritative docs.

## Common Commands

```bash
npm run dev
npm run lint
npm run test
npm run test:e2e
npm run check:factory-meta
npm run metrics:guardrails
```

## Last Updated

Aligned to the scanned repo structure on `2026-03-03`.
