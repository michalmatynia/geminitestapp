# Kangur Mobile

`apps/mobile` is the Expo Router application for Kangur's native learner experience. It renders the mobile versions of the learner home, lessons, tests, competition, duels, plan, profile, leaderboard, and results surfaces while reusing shared packages from `packages/*` and the `/api/kangur/*` backend served by the root Next.js app.

## Workspace role

- Own native route files in `app/*` and native screen implementations in `src/*`.
- Consume the same Kangur backend and contracts as the root web app instead of hosting a separate API.
- Reuse shared domain logic from `@kangur/core`, transport types from `@kangur/contracts`, HTTP access from `@kangur/api-client`, and auth/storage interfaces from `@kangur/platform`.
- Keep admin authoring, CMS composition, and most operations tooling in the root web app.
- Own the native startup experience: splash handoff, mobile auth bootstrap, cached startup state, and staged first-paint behavior.
- Treat the branch-local `/parent` route and `src/parent/*` files as in-progress work until their typecheck contract is stabilized.

## Route inventory

- `/` -> `app/index.tsx`: learner home, auth boundary, practice entry, recent activity, and primary navigation.
- `/lessons` -> `app/lessons.tsx`: lesson catalog, checkpoints, assignments, and lesson recommendations.
- `/tests` -> `app/tests.tsx`: curated test suites and practice-ready test playback.
- `/competition` -> `app/competition.tsx`: competition and exam-style sessions.
- `/practice` -> `app/practice.tsx`: quick practice and operation-focused drills.
- `/profile` -> `app/profile.tsx`: learner summary, progress, recommendations, and account actions.
- `/results` -> `app/results.tsx`: recent score history and score breakdowns.
- `/leaderboard` -> `app/leaderboard.tsx`: score and duel standings.
- `/plan` -> `app/plan.tsx`: daily learning plan and recommended work.
- `/duels` -> `app/duels.tsx`: duel lobby, active sessions, invites, and rematches.
- `/parent` -> `app/parent.tsx`: currently present in this branch, but still branch-local and not yet part of the stable mobile contract.

## Runtime architecture

- `app/_layout.tsx` wraps every route in `KangurAppProviders`.
- The provider stack is `SafeAreaProvider` -> `QueryClientProvider` -> `KangurRuntimeProvider` -> `KangurMobileI18nProvider` -> `KangurMobileAuthProvider`.
- `KangurRuntimeProvider` creates the shared API client, the local progress store, and the storage adapter used by auth and cached mobile state.
- API requests attach the active learner header `x-kangur-learner-id`, a bearer token when present, and the mobile CSRF token.
- API base URL resolution prefers `EXPO_PUBLIC_KANGUR_API_URL`, then Expo `extra.kangurApiUrl`, then falls back to `http://10.0.2.2:3000` on Android and `http://localhost:3000` elsewhere.
- Auth mode resolution prefers `EXPO_PUBLIC_KANGUR_AUTH_MODE`, then Expo `extra.kangurAuthMode`. Supported modes are `development` and `learner-session`.
- Developer auto sign-in is controlled through Expo `extra.kangurDevAutoSignIn`, `extra.kangurDevLearnerLogin`, and `extra.kangurDevLearnerPassword`.
- `KangurMobileAuthProvider` seeds session state from persisted learner data, then refreshes in the background and invalidates auth-scoped React Query data only when the auth query identity actually changes.
- Home and lessons boot shells intentionally fail open after a bounded interaction wait so the initial mobile skeleton cannot hang indefinitely if native interactions never drain.

## Startup and performance model

- Expo splash is kept under app control until a branded JS bootstrap screen is ready.
- The initial route shell mounts before heavy home content and progresses through bounded boot gates.
- Tiny persisted bootstrap snapshots are reused for learner auth, lesson checkpoints, recent results, training focus, and duel invites when available.
- The home route restores essential UI first, then wakes secondary sections in staged deferred waves after interactions settle.
- Duel, score, lesson-insight, account, and navigation sections are intentionally split so the first visible frame avoids the full network and render burst.
- The development storage adapter caches its native JSON snapshot in memory after the first read, which avoids repeated boot-time disk reads.

## Shared package boundaries

- `@kangur/contracts`: shared request, response, and domain contracts for lessons, tests, duels, auth, and AI Tutor-adjacent data.
- `@kangur/core`: deterministic Kangur logic such as progress stores, lessons, assignments, practice generation, badges, profile summaries, and leaderboard helpers.
- `@kangur/api-client`: a portable client for `/api/kangur/*`, including auth, scores, progress, assignments, learners, learner activity, and duels.
- `@kangur/platform`: cross-platform auth session, storage, and port abstractions used by both mobile and web-facing adapters.

## Common commands

- `npm run dev:mobile`: start the Expo development server through the shared mobile env wrapper.
- `npm run dev:mobile:web`: run the Expo web preview for the native app shell.
- `npm run dev:mobile:ios:local`: launch the local iOS simulator workflow.
- `npm run dev:mobile:android:local`: launch the local Android emulator workflow.
- `npm run dev:mobile:device:local`: prepare the local device workflow.
- `npm run config:mobile`: print the resolved Expo public config.
- `npm run init:mobile:env`: create or refresh the local mobile env files.
- `npm run preview:mobile:web`: preview the exported Expo web bundle.

## Validation workflow

- `npm run test:mobile:config`: verify the app config contract.
- `npm run test:mobile:tooling`: verify the mobile scripts, env wrappers, and runtime checks.
- `npm run typecheck:mobile`: typecheck the Expo workspace.
- `npm run check:mobile:runtime:backend`: verify the app can reach the configured Kangur backend.
- `npm run check:mobile:native:runtime:ios`: verify iOS runtime readiness.
- `npm run check:mobile:native:runtime:android`: verify Android runtime readiness.
- `npx vitest run apps/mobile/src/...`: use targeted screen and hook tests when changing one surface rather than rerunning the entire workspace.

## Known boundaries

- The canonical public web app and all `/api/kangur/*` routes still live at the repository root, not in `apps/web`.
- `apps/mobile-web` is reserved; Expo web preview is a validation path for `apps/mobile`, not a replacement for the root Next.js app.
- Mobile currently focuses on learner-facing flows. Admin authoring and most operational tooling stay web-only under `/admin/kangur`.
- This branch contains in-progress parent dashboard files under `src/parent/*`; they should not be documented as stable product surface until their unrelated typecheck failures are resolved.

## Related docs

- `../../docs/kangur/README.md`
- `../../docs/kangur/studiq-application.md`
- `../../docs/kangur/react-native-monorepo-scaffold.md`
- `../../packages/kangur-contracts/README.md`
- `../../packages/kangur-core/README.md`
- `../../packages/kangur-api-client/README.md`
- `../../packages/kangur-platform/README.md`
- `../mobile-web/README.md`
