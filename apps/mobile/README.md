# Kangur Mobile

Expo Router mobile workspace for the Kangur app.

## Current state

This workspace is no longer a scaffold. It contains a real mobile shell with:

- shared Kangur runtime and auth providers
- learner-session and development auth adapters
- persistent mobile development storage
- home, lessons, practice, profile, results, leaderboard, daily-plan, and duels routes
- home dashboard shortcuts for private duel invites, outgoing challenge re-sharing, active lobby rivals with direct challenges, live public duel matches, recent-opponent rematches, series-aware duel cards, a duel leaderboard snapshot, a profile duel summary, a results duel recap, a leaderboard duel section with direct challenges, a daily-plan duel section, a lessons duel section, a practice duel section, and local lesson checkpoints that immediately update profile/day-plan mastery
- visible lesson skeleton loading on the lessons screen instead of a hero-only freeze
- native/export tooling under `scripts/mobile`

## Source of truth

- Expo config: [app.config.ts](./app.config.ts)
- Expo config helpers: [mobileExpoConfig.ts](./mobileExpoConfig.ts)
- Route shell: [app/_layout.tsx](./app/_layout.tsx)
- App providers: [src/providers/KangurAppProviders.tsx](./src/providers/KangurAppProviders.tsx)
- Shared Expo command wrapper: [../../scripts/mobile/run-with-mobile-env.ts](../../scripts/mobile/run-with-mobile-env.ts)
- Mobile Babel config: [babel.config.js](./babel.config.js)

`app.json` is legacy config drift and should not be treated as the active source of truth if it still exists in a branch.

## Main routes

- `/`
- `/lessons`
- `/practice`
- `/profile`
- `/results`
- `/leaderboard`
- `/plan`
- `/duels`

## Local commands

Useful repo-root wrappers:

```bash
npm run dev:mobile
npm run dev:mobile:web
npm run typecheck:mobile
npm run config:mobile
npm run export:mobile:web
npm run check:mobile:native:deps
npm run check:mobile:native:port
npm run dev:mobile:ios:local
npm run dev:mobile:android:local
```

Workspace-direct equivalents still live in `apps/mobile/package.json`, including:

- native local launch helpers
- runtime/backend/toolchain checks
- exported web preview and smoke scripts
- iOS native debug-proof tooling

Validated on March 21, 2026:

```bash
npm run typecheck:mobile
npm run check:mobile:native:deps
npm run check:mobile:native:port
npm run check:mobile:native:runtime:ios
npm run check:mobile:native:runtime:android
npm run prepare:mobile:runtime:android
npx vitest run apps/mobile/src/practice/KangurPracticeScreen.test.tsx apps/mobile/src/home/HomeScreen.test.tsx apps/mobile/src/plan/KangurDailyPlanScreen.test.tsx apps/mobile/src/scores/KangurResultsScreen.test.tsx apps/mobile/src/lessons/KangurLessonsScreen.test.tsx apps/mobile/src/profile/KangurProfileScreen.test.tsx apps/mobile/src/leaderboard/KangurLeaderboardScreen.test.tsx
npm run config:mobile
npm run export:mobile:web
npm run dev:mobile:ios:local
npm run dev:mobile:android:local
```

Runtime-checked on the exported preview:

- `/`
- `/lessons`
- `/practice`
- `/profile`
- `/results`
- `/leaderboard`
- `/plan`

Notes from that route sweep:

- all of the exported mobile routes above returned `200`
- the major mobile routes now use consistent Polish UI copy on the main shell, profile, results, plan, leaderboard, and practice flows
- score-family labels, demo-session names, and practice sync messages were also normalized to the same Polish copy style
- the main mobile route shells now also have light screen-level regression coverage:
  - `apps/mobile/src/practice/KangurPracticeScreen.test.tsx`
  - `apps/mobile/src/home/HomeScreen.test.tsx`
  - `apps/mobile/src/plan/KangurDailyPlanScreen.test.tsx`
  - `apps/mobile/src/scores/KangurResultsScreen.test.tsx`
  - `apps/mobile/src/profile/KangurProfileScreen.test.tsx`
  - `apps/mobile/src/leaderboard/KangurLeaderboardScreen.test.tsx`
- the lessons routes still settle correctly for both `/lessons` and `/lessons?focus=clock`
- the lessons loading state is now covered by screen-level regression tests in `apps/mobile/src/lessons/KangurLessonsScreen.test.tsx`
- `/lessons` now shows the catalog skeleton during initial boot, while `/lessons?focus=clock` shows both the focused-lesson skeleton and the catalog skeleton before settled content appears
- exported-preview proof artifacts for that loader pass are in:
  - `output/playwright/lessons-catalog-loading.png`
  - `output/playwright/lessons-catalog-settled.png`
  - `output/playwright/lessons-focus-clock-loading.png`
  - `output/playwright/lessons-focus-clock-settled.png`
- a second exported-preview sweep now also rechecked `/`, `/plan`, and `/results` after the new screen tests:
  - `output/playwright/home-route-shell.png`
  - `output/playwright/plan-route-shell.png`
  - `output/playwright/results-route-shell.png`
- that later sweep confirmed all three routes still return `200` and none of them leak raw `Failed to fetch`
- a third exported-preview sweep rechecked `/profile` and `/leaderboard` after the new route-shell tests:
  - `output/playwright/profile-route-shell.png`
  - `output/playwright/leaderboard-route-shell.png`
- that later sweep confirmed both routes return `200`, render the correct route titles, and do not leak raw `Failed to fetch`
- a fourth exported-preview sweep rechecked `/practice` after the new route-shell test:
  - `output/playwright/practice-route-shell.png`
- that later sweep confirmed `/practice` returns `200`, renders the mobile training shell with the first question, and does not leak raw `Failed to fetch`
- the profile screen no longer leaks raw `Failed to fetch`; it now shows a friendly localized API-connection message

## Native iOS state

As of March 21, 2026, the checked iOS local launch path is healthy again:

- `npm run dev:mobile:ios:local` now gets through:
  - iOS toolchain check
  - native Expo/React Native dependency preflight
  - mobile tooling tests
  - mobile typecheck
  - scoped iOS runtime readiness
  - Expo Go launch on the simulator
  - Metro bundle startup
- `npm run check:mobile:native:runtime:ios` now behaves like the real sandbox gate:
  - `status=warning`
  - `host=ok`
  - `backend=skipped`
  - `runtime=ok`
- the latest checked run reached:
  - `Starting Metro Bundler`
  - `Opening exp://192.168.0.33:8081 on iPhone 17 Pro`
  - `iOS Bundled ... node_modules/expo-router/entry.js`
  - `Waiting on http://localhost:8081`
- backend probing is still reported as `skipped` inside the Codex sandbox, so the remaining native learner-session validation still belongs in a normal shell plus Expo Go interaction
- direct backend proof in a normal shell is now available too:
  - `curl -I http://localhost:3000/api/kangur/auth/me`
  - returned `401 Unauthorized` on March 21, 2026, which is the expected unauthenticated response and confirms the local Kangur API was actually up during the latest iOS run
- fresh simulator launch proof artifact:
  - `output/playwright/ios-native-launch-home.png`
- fresh live-backend ordinary-route artifacts from the latest checked iOS session:
  - `output/playwright/ios-native-home-live.png`
  - `output/playwright/ios-native-results-live-cold.png`
  - `output/playwright/ios-native-profile-live-cold.png`
  - `output/playwright/ios-native-plan-live-cold.png`
  - `output/playwright/ios-native-leaderboard-live-cold.png`
  - `output/playwright/ios-native-practice-live-cold.png`
- ordinary native route recheck after the repaired launch path:
  - `output/playwright/ios-native-home-ordinary.png`
  - `output/playwright/ios-native-results-ordinary.png`
  - `output/playwright/ios-native-practice-ordinary.png`
  - `output/playwright/ios-native-profile-ordinary.png`
  - `output/playwright/ios-native-plan-ordinary.png`
  - `output/playwright/ios-native-leaderboard-ordinary.png`

Current native caveat:

- this host can still hit transient CoreSimulatorService failures during `simctl`, but the checked iOS readiness path no longer reports that as a fake “install Xcode” blocker
- `prepare:runtime:ios` now also runs both `npm run check:mobile:native:deps` and `npm run check:mobile:native:port` so missing native Expo/React Native modules and stale Expo port conflicts fail fast before Metro starts
- `npm run checklist:mobile:native:runtime:ios` now prints the same checked chain, including `npm run check:mobile:native:deps`, before the backend, prepare, launch, and learner-session validation steps
- `npm run dev:mobile:ios:local -- --dry-run` and the checked launch failure hints now also surface `npm run check:mobile:native:deps` explicitly, so the launcher output matches the actual native prepare flow
- `npm run dev:mobile:ios:local` now also fails fast when Expo port `8081` is already occupied, instead of falling into Expo's interactive port prompt; the recovery hint points at `lsof -i tcp:8081`
- there is now a standalone preflight for that case too:
  - `npm run check:mobile:native:port`
- the checked `prepare:runtime:android` and `prepare:runtime:device` scripts now also include the same port preflight before their runtime launch phase
- the checked launch command is the better source of truth than the standalone prepare wrapper when this host is flaky
- the main remaining native iOS gap is still one manual non-debug learner-session practice run inside Expo Go, followed by the ordinary-route recheck from the checklist
- the latest checked iOS session supersedes the older ambiguous route captures:
  - cold-open `/results` now reaches `Historia wyników / Ostatnie sesje mobilne` in Expo Go with the live backend up
  - the fresh home capture also shows the ordinary authenticated dashboard shell again
  - fresh cold-open captures now also cover `/profile`, `/plan`, `/leaderboard`, and `/practice` from the same healthy session
- a one-off LAN-IP relaunch experiment (`EXPO_PUBLIC_KANGUR_API_URL=http://192.168.0.33:3000`) was inconclusive on this host because Expo never reached `Waiting on http://localhost:8081`, so no config change was adopted from that trial
- the ordinary-route `Network request failed` screenshots were also captured during a session where the local backend had in fact fallen out of service on `localhost:3000`, so they should not be treated as proof of a stable iOS runtime bug by themselves

## Native Android state

As of March 21, 2026, the checked Android local launch path is healthy again:

- Android Studio is installed at `/Applications/Android Studio.app`
- the Android SDK is available at `/Users/michalmatynia/Library/Android/sdk`
- the shared mobile wrapper now auto-detects that default macOS SDK path and augments `PATH`, so the checked mobile scripts no longer depend on manual shell exports on this machine
- `npm run check:mobile:android:toolchain` is green
- `npm run check:mobile:native:deps` is green
- the Android local launcher normalizes `EXPO_PUBLIC_KANGUR_API_URL` from `http://localhost:3000` to `http://10.0.2.2:3000` for emulator runtime traffic
- `npm run check:mobile:native:runtime:android` now behaves like the real sandbox gate:
  - `status=warning`
  - `host=ok`
  - `backend=skipped`
  - `runtime=ok`
- `npm run prepare:mobile:runtime:android` now passes end to end, including:
  - Android toolchain check
  - native Expo/React Native dependency preflight
  - mobile tooling tests
  - mobile typecheck
  - Expo port preflight
  - scoped Android runtime readiness
- `npm run dev:mobile:android:local` now gets through:
  - the full checked prepare chain
  - Metro bundle startup
  - Expo Go open on the `Kangur_API_35` emulator
- the latest checked Android run reached:
  - `Starting Metro Bundler`
  - `Opening exp://192.168.0.33:8081 on Kangur_API_35`
  - `Waiting on http://localhost:8081`
- Expo Go is installed on the emulator already, so future local launches no longer need the earlier online bootstrap just to fetch Expo Go
- `npm run checklist:mobile:native:runtime:android` now prints the full checked chain, including `npm run check:mobile:native:deps`, before the backend, prepare, launch, and learner-session validation steps
- the same printed checklist now includes `npm run check:mobile:native:port` before launch, so Expo port conflicts are surfaced explicitly instead of only through the launcher

Current Android caveat:

- backend probing is still reported as `skipped` inside the Codex sandbox, so the remaining Android learner-session validation still belongs in a normal shell plus Expo Go interaction
- the main remaining Android gap is now the same kind of product/runtime proof as iOS:
  - one normal non-debug learner-session practice run in Expo Go
  - then the ordinary-route recheck from `npm run checklist:mobile:native:runtime:android`

## Environment

The mobile scripts auto-load:

- `apps/mobile/.env.local`
- `apps/mobile/.env`

The shared wrapper also defaults `EXPO_NO_TELEMETRY=1` for local mobile commands so Expo config/export does not fail inside telemetry-only code paths.

Key variables:

- `EXPO_PUBLIC_KANGUR_API_URL`
- `EXPO_PUBLIC_KANGUR_AUTH_MODE`
- `KANGUR_IOS_BUNDLE_IDENTIFIER`
- `KANGUR_ANDROID_PACKAGE`
- `KANGUR_EXPO_OWNER`
- `KANGUR_EXPO_PROJECT_ID`
- `KANGUR_DEV_AUTO_SIGN_IN`
- `KANGUR_DEV_LEARNER_LOGIN`
- `KANGUR_DEV_LEARNER_PASSWORD`

To bootstrap a local env file:

```bash
npm run init:env --workspace @kangur/mobile
```

## Repair history

As of March 21, 2026, this branch had drift where:

- `apps/mobile/package.json` claimed the app was scaffold-only
- `apps/mobile/README.md` was scaffold-only
- `src/providers/KangurAppProviders.tsx` was a pass-through stub
- `app/index.tsx` was still a scaffold placeholder
- `packages/kangur-core/src/index.ts` and `packages/kangur-platform/src/index.ts` no longer re-exported the symbols the mobile app imports

Those are the first places to check again if the mobile workspace starts behaving like a scaffold in a future session.

The same branch also needed a second repair pass for dependency drift during Expo web export. The practical fixes were:

- make the Expo Router peer/runtime packages explicit in [package.json](./package.json)
- make the missing `react-native-web` and React Navigation runtime dependencies explicit in [package.json](./package.json)
- add the missing Babel build-time plugins required by Expo web export in [package.json](./package.json)
- remove deprecated `expo-router/babel` usage from [babel.config.js](./babel.config.js)
- disable Expo telemetry in the shared wrapper at [../../scripts/mobile/run-with-mobile-env.ts](../../scripts/mobile/run-with-mobile-env.ts)

If `npm run export:mobile:web` starts failing again with missing modules, check those two files first:

- [package.json](./package.json)
- [../../scripts/mobile/run-with-mobile-env.ts](../../scripts/mobile/run-with-mobile-env.ts)

The native iOS path also needed a follow-up dependency repair for Expo/React Native local launches. The practical fixes were:

- add the missing `marky` dependency explicitly in [package.json](./package.json) so Expo dev-middleware no longer fails through `lighthouse-logger`
- add the missing Babel preset plugins used by `@react-native/babel-preset` in [package.json](./package.json)
- add the missing React Native runtime subset used during native bundle/dev startup in [package.json](./package.json)
- add [../../scripts/mobile/check-kangur-mobile-native-deps.ts](../../scripts/mobile/check-kangur-mobile-native-deps.ts) and wire it into the checked native prepare flow
- harden [../../scripts/mobile/check-kangur-mobile-ios-toolchain.ts](../../scripts/mobile/check-kangur-mobile-ios-toolchain.ts) for transient CoreSimulatorService failures
- downgrade transient `simctl` CoreSimulatorService failures to a warning instead of a fake Xcode blocker, and reuse the resilient iOS collector from the native host/runtime checks
- add an iOS `simctl` warm-up to the checked `prepare:runtime:ios` script in [package.json](./package.json)

One more route-shell caveat from March 21, 2026:

- do not place test files under `apps/mobile/app/*`
- Expo Router treats that directory as route territory, and a misplaced `*.test.tsx` there can break `expo export --platform web`
- keep screen tests under `apps/mobile/src/**` instead

## Known repo-wide blocker

Full repo typecheck is still not a reliable mobile validation gate in this branch because of unrelated breakage under:

- `src/app/api/kangur/ai-tutor/chat/*`

For mobile work, prefer narrow workspace checks and route-level validation first.
