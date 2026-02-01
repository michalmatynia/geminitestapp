# COPILOT.md - GitHub Copilot CLI Overlay

This file is a lightweight overlay for Copilot. It defers to `AGENTS.md` and
`GEMINI.md` for full architecture details.

## Read Order

1. `COPILOT.md` (this file)
2. `AGENTS.md` (authoritative rules + architecture)
3. `GEMINI.md` (deep project reference)

## Copilot-Specific Guidance

- Prefer **small, surgical edits** with `rg`-driven targeting.
- Keep changes **incremental** and easy to review.
- Favor **existing patterns** over new abstractions.
- Avoid speculative refactors unless asked.

## What This Repo Actually Is

- AI-forward **multi-app** platform (admin + public frontend)
- Shared REST API under `app/api/`
- AI features live in `lib/services/*` and `lib/agent/*`
- Dual DB provider support (Prisma Postgres or MongoDB)

## Where to Look First

- Admin UI: `app/(admin)/admin/`
- Public UI: `app/(frontend)/`
- API routes: `app/api/`
- Services + repos: `lib/services/`
- Agent runtime: `lib/agent/`
- Shared types: `types/`

## Restrictions (Non-Negotiable)

- Do NOT read `AIPrompts/` (admin-only, sensitive).
- Do NOT access other agents' `AIReasoning/*` folders.
- Do NOT commit reasoning/results files.

## Commands (Common)

```
npm run dev
npm run lint
npm run test
```

---

**Last Updated**: January 23, 2026
