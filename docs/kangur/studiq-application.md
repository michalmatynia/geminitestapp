---
owner: 'Kangur Team'
last_reviewed: '2026-03-17'
status: 'active'
doc_type: 'overview'
scope: 'feature:kangur'
canonical: true
---

# StudiQ App Shell And Kangur Integration

## Purpose

StudiQ is the public learning application brand. Kangur provides the learner-facing
experience (games, lessons, tests, profiles, parent tools) and can either own the
public root route or be embedded inside CMS pages.

## Public routing and ownership

Kangur exposes a canonical base path at `/kangur` and can also own `/` when the
front page selection is set to the StudiQ app.

Front page ownership is controlled through the front-page selection logic:

- Config: `src/shared/lib/front-page-app.ts`
- Frontend entry: `src/app/(frontend)/page.tsx` and
  `src/app/(frontend)/kangur/(app)/[[...slug]]/page.tsx`

When the front page owner is `kangur`, `/` redirects into the canonical Kangur
route for the requested slug + query params.

### Route map

Kangur page keys map to the following slugs (see `src/features/kangur/config/routing.ts`):

- `Game` -> `/kangur/game`
- `Lessons` -> `/kangur/lessons`
- `Tests` -> `/kangur/tests`
- `Competition` -> `/kangur/competition`
- `Duels` -> `/kangur/duels`
- `LearnerProfile` -> `/kangur/profile`
- `ParentDashboard` -> `/kangur/parent-dashboard`
- `SocialUpdates` -> `/kangur/social-updates`

## CMS embedding

StudiQ can be embedded inside CMS pages via the App Embed block:

- App embed option: `appId: 'kangur'` (label: StudiQ)
- Config: `src/shared/lib/app-embeds.ts`
- Default entry page: `DEFAULT_KANGUR_APP_EMBED_ENTRY_PAGE`

Embedding uses the `kangur` query parameter (plus scoped variants) to preserve
Kangur state and a base-path prefix for internal embed routing:

- Embed base-path prefix: `__kangur_embed__:`
- Scoped params: `kangur`, `focus`, `quickStart`, `operation`, `difficulty`,
  `categories`, `count`

All embed query behavior is defined in `src/features/kangur/config/routing.ts`.

## Admin surfaces

Admin pages live under `/admin/kangur` and share the
`AdminKangurPageShell` scaffold (`src/features/kangur/admin/AdminKangurPageShell.tsx`).
Key surfaces include:

- Settings and narration
- Documentation/page-content catalog
- Lessons manager and lesson document editor
- Test suites manager and question editor
- AI Tutor content and native guide settings
- Observability dashboard
- Social updates composer

## AI Tutor content sources

Kangur’s AI Tutor relies on two canonical content stores:

- Page-content catalog: `src/features/kangur/page-content-catalog.ts`
- Native guide entries: `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts`

These sources feed the runtime page-content store and native guide repository,
so they should be updated instead of hardcoding AI tutor copy in UI components.
