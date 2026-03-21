# Kangur Mobile

Expo Router mobile workspace for the Kangur app.

## Current state

This workspace is no longer a scaffold. It contains a real mobile shell with:

- shared Kangur runtime and auth providers
- learner-session and development auth adapters
- persistent mobile development storage
- home, lessons, practice, profile, results, leaderboard, and daily-plan routes
- native/export tooling under `scripts/mobile`

## Source of truth

- Expo config: [app.config.ts](./app.config.ts)
- Expo config helpers: [mobileExpoConfig.ts](./mobileExpoConfig.ts)
- Route shell: [app/_layout.tsx](./app/_layout.tsx)
- App providers: [src/providers/KangurAppProviders.tsx](./src/providers/KangurAppProviders.tsx)

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

Run from the repo root:

```bash
npm run dev --workspace @kangur/mobile
npm run web --workspace @kangur/mobile
npm run ios --workspace @kangur/mobile
npm run android --workspace @kangur/mobile
npm run typecheck --workspace @kangur/mobile
```

Additional mobile tooling lives in `apps/mobile/package.json`, including:

- native local launch helpers
- runtime/backend/toolchain checks
- exported web preview and smoke scripts
- iOS native debug-proof tooling

## Environment

The mobile scripts auto-load:

- `apps/mobile/.env.local`
- `apps/mobile/.env`

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

## Current repair note

As of March 21, 2026, this branch had drift where:

- `apps/mobile/package.json` claimed the app was scaffold-only
- `apps/mobile/README.md` was scaffold-only
- `src/providers/KangurAppProviders.tsx` was a pass-through stub
- `app/index.tsx` was still a scaffold placeholder
- `packages/kangur-core/src/index.ts` and `packages/kangur-platform/src/index.ts` no longer re-exported the symbols the mobile app imports

Those are the first places to check again if the mobile workspace starts behaving like a scaffold in a future session.

## Known repo-wide blocker

Full repo typecheck is still not a reliable mobile validation gate in this branch because of unrelated breakage under:

- `src/app/api/kangur/ai-tutor/chat/*`

For mobile work, prefer narrow workspace checks and route-level validation first.
