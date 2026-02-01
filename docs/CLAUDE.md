# CLAUDE.md - Anthropic Claude Overlay

This file is a lightweight overlay for Claude. It defers to `AGENTS.md` and
`GEMINI.md` for full architecture details.

## Read Order

1. `CLAUDE.md` (this file)
2. `AGENTS.md` (authoritative rules + architecture)
3. `GEMINI.md` (deep project reference)

## Claude-Specific Guidance

- Lean into **deep analysis** and **careful refactors**.
- Provide **clear reasoning summaries**, but keep edits minimal when requested.
- Prefer **explicitness** over magic (especially in AI flows).

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
