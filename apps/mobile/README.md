# Kangur Mobile

Expo Router mobile workspace for the Kangur app.

## Current state

This workspace is no longer a scaffold. It contains a real mobile shell with:

- shared Kangur runtime and auth providers
- learner-session and development auth adapters
- persistent mobile development storage
- home, lessons, practice, profile, results, leaderboard, and daily-plan routes
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

## Local commands

Useful repo-root wrappers:

```bash
npm run dev:mobile
npm run dev:mobile:web
npm run typecheck:mobile
npm run config:mobile
npm run export:mobile:web
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
npm run config:mobile
npm run export:mobile:web
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
- the lessons screen shows visible loading skeleton copy during boot
- the profile screen no longer leaks raw `Failed to fetch`; it now shows a friendly localized API-connection message

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

## Known repo-wide blocker

Full repo typecheck is still not a reliable mobile validation gate in this branch because of unrelated breakage under:

- `src/app/api/kangur/ai-tutor/chat/*`

For mobile work, prefer narrow workspace checks and route-level validation first.
