---
owner: 'Kangur Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'overview'
scope: 'feature:kangur'
canonical: true
---

# StudiQ App Shell And Kangur Integration

## Purpose

StudiQ is the public learning application brand. Kangur provides the learner-facing
experience across web and native shells: games, lessons, tests, profiles, parent
tools, AI Tutor flows, and supporting admin or API surfaces. Kangur can either own
the public root route or be embedded inside CMS pages.

## Application topology

- The repository root remains the canonical Next.js application. It owns the public web shell, CMS routing, `/admin/kangur`, and `/api/kangur/*`.
- `apps/studiq-web` is a standalone Next.js workspace for the focused StudiQ and Kangur web shell. It reuses repo-root code and loads env from the monorepo root, but it does not replace the root app as the canonical owner of admin, CMS, or API surfaces.
- `apps/mobile` is the Expo Router application for native Kangur learner flows.
- `apps/mobile-web` is reserved for a future Expo or React Native Web target and is not part of the active production web topology.
- Shared cross-platform logic is split across:
  - `packages/kangur-contracts` for request and domain types.
  - `packages/kangur-core` for portable lessons, progress, assignments, profile, rewards, and leaderboard logic.
  - `packages/kangur-api-client` for `/api/kangur/*` transport.
  - `packages/kangur-platform` for auth session, storage, and app-facing platform ports.

## Surface ownership matrix

| Surface | Canonical location | Responsibility |
| --- | --- | --- |
| Public web shell | repository root Next.js app | Owns the public StudiQ frontend, front-page ownership, CMS embedding, localized Kangur routes, and the canonical `/kangur/*` web routes. |
| Standalone StudiQ web workspace | `apps/studiq-web` | Owns a focused Kangur-only Next.js shell for isolated web runtime work. It reuses repo-root features and shared code, but it does not take over root admin, CMS, or API ownership. |
| Kangur admin | `src/app/(admin)/admin/kangur/*` | Owns authoring, content management, settings, observability, social publishing, and test or lesson management. |
| Kangur backend | `src/app/api/kangur/*` | Owns learner auth, parent auth, progress, lessons, assignments, scores, duels, AI Tutor, and supporting operational endpoints. |
| Native learner app | `apps/mobile` | Owns Expo routing, native bootstrapping, mobile auth flow, device storage, and mobile learner UI. |
| Future native web target | `apps/mobile-web` | Reserved only; does not currently own any production web traffic. |
| Shared contracts | `packages/kangur-contracts` | Defines transport and domain types reused by web, mobile, and API clients. |
| Shared domain logic | `packages/kangur-core` | Owns deterministic business logic such as lessons, progress, assignments, rewards, and profile helpers. |
| Shared transport layer | `packages/kangur-api-client` | Owns portable request helpers for `/api/kangur/*`. |
| Shared platform boundary | `packages/kangur-platform` | Owns auth session, storage, and app-facing port abstractions. |

## Public routing and ownership

Kangur exposes a canonical base path at `/kangur` and can also own `/` when the
front page selection is set to the StudiQ app.

Front page ownership is controlled through the front-page selection logic:

- Config: `src/shared/lib/front-page-app.ts`
- Frontend entry: `src/app/(frontend)/page.tsx` and
  `src/app/(frontend)/kangur/(app)/[[...slug]]/page.tsx`
- Allowed public owners: `cms` and `kangur`

When the front page owner is `kangur`, `/` redirects into the canonical Kangur
route for the requested slug + query params. The web shell also supports
default-locale bare learner slugs such as `/game`, `/lessons`, and `/tests`
through the same frontend routing and proxy path.

### Route map

Kangur page keys map to the following slugs (see `src/features/kangur/config/routing.ts`):

- `Game` -> `/kangur/game`
- `Lessons` -> `/kangur/lessons`
- `Tests` -> `/kangur/tests`
- `Competition` -> `/kangur/competition`
- `Duels` -> `/kangur/duels`
- `GamesLibrary` -> `/kangur/games`
- `LearnerProfile` -> `/kangur/profile`
- `ParentDashboard` -> `/kangur/parent-dashboard`
- `SocialUpdates` -> `/kangur/social-updates`

Canonical learner-facing web entrypoints:

- `src/app/(frontend)/kangur/(app)/[[...slug]]/page.tsx`
- `src/app/(frontend)/kangur/(app)/layout.tsx`
- `src/app/(frontend)/kangur/layout.tsx`
- `src/app/(frontend)/kangur/loading.tsx`
- `src/app/(frontend)/kangur/login/page.tsx`
- `src/app/[locale]/(frontend)/kangur/[[...slug]]/page.tsx`
- `src/app/[locale]/(frontend)/kangur/layout.tsx`

Public web analytics for Kangur now mounts in two places:

- `src/app/(frontend)/kangur/layout.tsx` for the canonical `/kangur/*` subtree
- `src/features/kangur/ui/FrontendPublicOwnerKangurShell.tsx` for root-owned `/`, `/login`, and localized public-owner Kangur routes

Embedded Kangur surfaces do not mount Vercel Analytics directly, so CMS embeds
and internal reusable shells do not double-count page views.

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

- Landing page and catch-all page routing
- Appearance and builder pages
- Documentation and content manager
- Lessons manager and lesson document editor
- Tests manager and question editor
- Settings and narration
- Observability dashboard
- Social updates composer

Concrete route entrypoints:

- `src/app/(admin)/admin/kangur/page.tsx`
- `src/app/(admin)/admin/kangur/[...slug]/page.tsx`
- `src/app/(admin)/admin/kangur/appearance/page.tsx`
- `src/app/(admin)/admin/kangur/builder/page.tsx`
- `src/app/(admin)/admin/kangur/content-manager/page.tsx`
- `src/app/(admin)/admin/kangur/documentation/page.tsx`
- `src/app/(admin)/admin/kangur/lessons-manager/page.tsx`
- `src/app/(admin)/admin/kangur/observability/page.tsx`
- `src/app/(admin)/admin/kangur/settings/page.tsx`
- `src/app/(admin)/admin/kangur/social/page.tsx`
- `src/app/(admin)/admin/kangur/tests-manager/page.tsx`

## Mobile route map

The native app lives under `apps/mobile/app/*` and currently exposes these routes:

- `/` -> home and quick-start practice shell.
- `/lessons` -> lesson catalog and lesson-centric learning flow.
- `/tests` -> learner test suites.
- `/competition` -> competition sessions.
- `/practice` -> operation-focused practice.
- `/profile` -> learner profile and recommendations.
- `/results` -> recent score history.
- `/leaderboard` -> leaderboard and standings.
- `/plan` -> daily plan.
- `/duels` -> duel lobby and active duels.

The current branch also contains `/parent` under `apps/mobile/app/parent.tsx`, but it should be treated as branch-local work until the parent dashboard contract is stabilized.

## Mobile runtime layers

`apps/mobile/app/_layout.tsx` wraps the app in `KangurAppProviders`, which currently compose:

- `SafeAreaProvider`
- `QueryClientProvider`
- `KangurRuntimeProvider`
- `KangurMobileI18nProvider`
- `KangurMobileAuthProvider`

The runtime layer builds a shared `@kangur/api-client`, mobile storage, and a
`@kangur/core` progress store. It resolves the API base URL from `EXPO_PUBLIC_KANGUR_API_URL`
or Expo `extra.kangurApiUrl`, then falls back to `http://10.0.2.2:3000` on Android
and `http://localhost:3000` elsewhere. The auth layer resolves `development` vs
`learner-session`, refreshes session state on boot, and optionally performs developer
auto sign-in from Expo `extra` values.

Current startup behavior is intentionally staged:

- Expo splash hands off to a branded JS bootstrap gate before route content mounts.
- The auth layer seeds from persisted learner snapshots first, then refreshes in the background.
- Home restores tiny persisted lesson and score snapshots before mounting heavier query work.
- Home and lessons use bounded boot-state gates so the startup skeleton resolves even when native interactions stall.
- Secondary home panels, duel sections, and score refreshes are deferred behind interaction-aware stages to protect first paint.

## Shared package and API surface

The mobile and web shells share the same Kangur backend. The current `/api/kangur/*`
surface includes:

- Auth routes for learner and parent sign-in, sign-out, password, email, and account flows.
- Progress, scores, subject-focus, lessons, lesson documents, lesson sections, and lesson templates.
- Learners, learner sessions, learner interactions, assignments, and learner activity stream.
- Duels create, join, lobby, presence, chat, reactions, search, answer, leave, heartbeat, state, spectate, and leaderboard routes.
- AI Tutor routes for content, chat, experiments, follow-up, guest intro, knowledge graph, native guide, page content, usage, and admin tooling.
- Number Balance, observability, social image addons, social pipeline, social posts, knowledge graph, and TTS routes.

Package entry docs now live beside the code:

- `packages/kangur-contracts/README.md`
- `packages/kangur-core/README.md`
- `packages/kangur-api-client/README.md`
- `packages/kangur-platform/README.md`

## AI Tutor content sources

Kangur’s AI Tutor relies on two canonical content stores:

- Page-content catalog: `src/features/kangur/ai-tutor/page-content-catalog.ts`
- Native guide entries: `src/shared/contracts/kangur-ai-tutor-native-guide-entries.ts`

These sources feed the runtime page-content store and native guide repository,
so they should be updated instead of hardcoding AI tutor copy in UI components.

## Operational checks

- `npm run docs:structure:check`
- `npm run typecheck:mobile`
- `npm run test:mobile:tooling`
- `npm run check:mobile:runtime:backend`

## Primary commands by workflow

- Web app shell: `npm run dev:web`
- Mobile app shell: `npm run dev:mobile`
- Mobile Expo web preview: `npm run dev:mobile:web`
- Mobile iOS simulator flow: `npm run dev:mobile:ios:local`
- Mobile Android emulator flow: `npm run dev:mobile:android:local`
- Mobile config inspection: `npm run config:mobile`
- Mobile typecheck: `npm run typecheck:mobile`
- Docs structure validation: `npm run docs:structure:check`

## Current boundaries

- The web app is still rooted at the repository root rather than `apps/web`.
- `apps/mobile-web` remains a placeholder workspace.
- Mobile documentation should describe only stabilized native contracts; branch-local in-progress routes such as the current parent dashboard should be clearly qualified.
