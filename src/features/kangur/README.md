# Kangur Feature Layout

This folder owns the StudiQ/Kangur product domain.

## Root Rules

- Keep the feature root limited to intentional entrypoints such as `public.ts`,
  `server.ts`, and `settings.ts`.
- New domain logic should land in the owning subdomain folder, not at the root.
- Route wiring belongs in `src/app/`; cross-domain platform code belongs in
  `src/shared/`.
- Avoid new compatibility shims at the root. Move consumers to the canonical
  path and delete the shim when the migration is complete.

## First-Class Subdomains

- `admin/`: Kangur admin workspaces and authoring tools
- `ai-tutor/`: AI tutor content catalogs, validation, and tutor-owned support
- `appearance/`: storefront appearance settings and server bootstrap
- `config/`: routing, page access, and launch-route ownership
- `docs/`: Kangur-specific help and tooltip settings
- `duels/`: duel runtime support
- `games/`: game catalogs, engines, and defaults
- `lesson-documents/`: lesson-document factories, converters, and normalization
- `lessons/`: lesson catalogs, templates, focus utilities, and imports
- `observability/`: client/server observability and summaries
- `social/`: social admin, capture, server workflows, and workers
- `test-suites/`: question/test-suite domain logic
- `tts/`: narration contracts, script generation, audio caching, and backend probes
- `ui/`: learner-facing shells, pages, components, hooks, and runtime contexts

## Transitional Internal Layers

- `services/`: repository and persistence-facing Kangur adapters
- `shared/`: Kangur-only shared contracts, providers, hooks, and UI primitives

Use these when the code is genuinely cross-Kangur. Prefer a named product
subdomain when the ownership is specific.
