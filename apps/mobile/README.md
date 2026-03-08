# Kangur Mobile

This is the first React Native shell for Kangur inside the monorepo.

## What exists now

- Expo Router app entry
- shared package references for contracts, core logic, platform types, and API client
- React Query provider
- mobile runtime context with API base URL resolution
- learner-session auth path
- persistent browser and native-file-backed development storage
- mobile home, leaderboard, lessons, practice, profile, results, and daily-plan routes

## What is still deferred

- real iOS/Android runtime validation
- drawing and other canvas-heavy game ports

## What is already validated

- Expo web static export succeeds and produces `/`, `/plan`, `/lessons`, `/profile`, `/results`, `/practice`, and `/leaderboard`
- learner-session auth works against the local backend in Expo web
- synced practice results refresh home, profile, results, leaderboard, and daily plan
- iOS simulator now reaches authenticated learner-session state in Expo Go after the native CSRF bootstrap fix
- mobile config regression tests pass
- native build-env preflight works for both local and preview profiles

## Session handoff

As of March 20, 2026, the repo-side native validation tooling is in good shape and the
iOS simulator path is past host setup. The current remaining work is app-level validation,
not missing scripts or missing Xcode wiring.

Current verified repo state:

- `npm run test:mobile:tooling` passes
- `npm run typecheck --workspace @kangur/mobile` passes
- target-specific backend checks print the full command chain:
  - `check:mobile:runtime:backend:*`
  - `prepare:mobile:runtime:*`
  - `dev:mobile:*:local`
  - `checklist:mobile:native:runtime:*`
- scoped native-runtime checks print the same chain once a target is otherwise launchable
- exported mobile-web learner-session validation is already automated and passing
- iOS host selection and license gates are now cleared:
  - `xcode-select -p` points at `/Applications/Xcode.app/Contents/Developer`
  - `xcodebuild -version` works
  - `xcrun --find simctl` works
- `npm run check:mobile:ios:toolchain` now passes
- the native local launcher now defaults `EXPO_OFFLINE=1` unless you set it explicitly
- the checked iOS local path now gets through:
  - `check:mobile:ios:toolchain`
  - `check:mobile:native:runtime:ios`
  - `prepare:mobile:runtime:ios`
  - `expo start --ios`
  - and opens `exp://192.168.0.33:8082` on the booted `iPhone 17 Pro` simulator
  - with Metro bundling the app successfully
  - and without the previous Expo account / `Proceed anonymously` prompt
  - a direct simulator screenshot confirms the Kangur home screen is rendered on the simulator
- native learner-session auto-sign-in is now wired for debug validation through:
  - `KANGUR_DEV_AUTO_SIGN_IN=1`
  - `KANGUR_DEV_LEARNER_LOGIN=...`
  - `KANGUR_DEV_LEARNER_PASSWORD=...`
- the native learner-session blocker was identified and fixed:
  - failure mode on iOS simulator was `Invalid CSRF token.`
  - fix was to mirror the bootstrap CSRF token in the API response header
  - persist that token in the mobile runtime
  - replay it on native requests via `x-csrf-token`
- direct simulator screenshots now confirm:
  - home route shows `Developer auth diagnostics` with `Auto sign-in: authenticated`
  - `/plan` loads authenticated learner data (`Super Admin`)
  - `/profile` loads authenticated learner data (`Profil ucznia`, `Statystyki ucznia: Super Admin`)
  - `/results` loads authenticated learner data (`Ostatnie sesje mobilne`, `Sesje 11`, `Czas 2`, `Logika 9`)
- native file-backed storage is now confirmed on the simulator:
  - `development-storage.json` exists under the Expo Go experience data directory
  - it contains `kangur.mobile.csrfToken`, `kangur.mobile.auth.status=authenticated`, and `kangur.activeLearnerId`
- native cold-start restore is now partially confirmed:
  - after killing Expo Go and relaunching the app without `KANGUR_DEV_AUTO_SIGN_IN`, home restores to `Status: authenticated`
  - the persisted storage file still contains the learner auth and CSRF state
- a dev-only native practice diagnostic path now exists:
  - `/practice?operation=clock&debugAutoComplete=perfect`
  - it is gated to Expo dev mode
  - it completes one perfect run automatically, uses the real mobile sync path, and is intended only for native validation/debugging
- a second dev-only native practice diagnostic path now exists for downstream navigation checks:
  - `/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=results`
  - supported redirect targets are `home`, `results`, `leaderboard`, `plan`, and `profile`
- the practice screen now has a dev-only downstream proof card after synced runs:
  - it uses the same mobile data sources as results, profile, daily plan, and leaderboard
  - it is intended only for simulator/device validation
- the home screen now also has a dev-only top-of-screen proof card when opened with `debugProofOperation=...`:
  - it confirms that home recent-results and training-focus hooks both picked up the synced operation
  - it is intended only for simulator/device validation
- a repeatable native iOS debug-proof command now exists:
  - `npm run proof:mobile:native:ios:debug -- --dry-run`
  - `npm run proof:mobile:native:ios:debug -- --output-dir /tmp/kangur-mobile-ios-debug-proof`
  - `npm run proof:mobile:native:ios:debug -- --step home --output-dir /tmp/kangur-mobile-ios-debug-proof`
  - it drives the already-running iOS Expo session through summary, results, leaderboard, profile, plan, and home
  - it captures one screenshot per step into the chosen output directory
  - `--step summary|results|leaderboard|profile|plan|home` limits the run to one route and is the preferred fallback when the full sweep hits transient `CoreSimulatorService` instability
  - `--dry-run` now also prints the exact direct `xcrun simctl openurl` / `sleep` / `xcrun simctl io screenshot` chain for each step
- a native learner-session restore race was identified and fixed on practice sync:
  - failure mode was a quick run falling into `local-only` before auth restore settled
  - the practice screen now enters an `awaiting-auth` retry state and automatically retries score sync once learner-session auth finishes restoring
- that debug practice path now proves:
  - native practice summary shows `Wynik zapisano w API Kangura`
  - the same summary can now show a green `Developer sync proof` card with downstream-ready states
  - local native progress persistence updates `sprycio_progress`
  - the storage snapshot records `gamesPlayed: 1`, `totalXp: 50`, `operationsPlayed: ["clock"]`, and lesson mastery for `clock`
  - the backend now contains a real native-created `clock` score row for learner `ef236581-60dc-4998-8479-dfbf2329b2bf`
  - the local lessons screen now shows `Nauka zegara -> Opanowane 100%`

Current iOS status on this machine:

- the iOS host/toolchain blocker is cleared
- Simulator devices are installed and `xcrun simctl list devices` shows `iPhone 17 Pro` as `Booted`
- the checked iOS local path now reaches a real simulator launch instead of failing in host setup
- learner-session auth itself is now working on the simulator
- persisted native learner-session storage is now working on the simulator
- `/home`, `/plan`, `/profile`, and `/results` are now verified with authenticated learner state on iOS
- one native practice completion has now been re-verified through the dev-only debug route after the auth-restore retry fix
- the synced practice summary now reaches the green API-synced state instead of the old `local-only` fallback
- the dev-only proof card now reports downstream readiness from the same practice summary screen
- `/profile` has now been rechecked natively after the synced debug run and still shows the learner stats dashboard (`Profil ucznia`, `Mysliciel`, `Srednia skutecznosc 88%`)
- `/plan` has now been rechecked natively after the synced debug run and still shows the shared training-focus view (`Wzorce i ciagi` weakest, `Zegar` strongest)
- `/leaderboard` has now been rechecked natively after the synced debug run and shows `Super Admin` rows marked `Ty` for `Zegar`
- `/results` has now been rechecked natively after the synced debug run and shows the updated `Czas` session count
- `/home` now has a direct top-of-screen native proof too:
  - `debugRedirectTo=home` now lands on `/` with `Developer home sync proof`
  - that card confirms `Recent results: ready` and `Training focus: ready` for `Zegar`
- the ordinary non-debug routes have now also been rechecked through direct one-off `simctl openurl` commands after a fresh synced run:
  - `/results` lands on `Ostatnie sesje mobilne` and now shows `Sesje 23`, `Czas 14`, `Logika 9`
  - `/profile` lands on `Profil ucznia` and still shows the learner stats dashboard
  - `/plan` lands on `Jedno miejsce na dzis` and still shows `Wzorce i ciagi` weakest plus `Zegar` strongest
  - `/leaderboard` lands on `Leaderboard` and still shows `Super Admin` rows marked `Ty` for `Zegar`
- a plain Expo Go relaunch to `exp://127.0.0.1:8081` now also lands on the ordinary authenticated home shell without any debug redirect parameters
- after that plain Expo Go relaunch, ordinary authenticated restore is now rechecked directly on:
  - `/results`, still showing `Sesje 23`, `Czas 14`, `Logika 9`
  - `/profile`, still showing `Profil ucznia`, `Liczmistrz`, `23/3`, and `5/9`
- backend score creation for the latest native runs is now directly verified through `/api/kangur/scores`:
  - latest confirmed `clock` rows were created at `2026-03-20T20:21:58.779Z`, `2026-03-20T20:18:00.250Z`, and `2026-03-20T20:17:31.937Z`
- the new native iOS debug-proof command is validated in dry-run mode and tooling tests
- on this machine, the live command can still hit a transient CoreSimulatorService `Connection invalid` failure from `simctl` before the first route opens
- the command now retries that condition automatically and, if it still fails, exits with:
  - `CoreSimulatorService stayed unavailable across the retry budget. Run "xcrun simctl list devices" once, confirm the simulator is still booted, and then rerun the proof command.`
- if the full sweep is still flaky, rerun the same command with `--step home`, `--step results`, or another single target so only one `openurl` + screenshot pair runs at a time
- on this machine, even single-step mode can still hit the same host-side CoreSimulatorService failure before the first `openurl`; that keeps the blocker on Simulator stability rather than on the Kangur route sequence itself
- however, direct one-off `simctl` commands from a normal shell are more stable here and were re-verified successfully for:
  - `home` via `debugRedirectTo=home`, landing on `Developer home sync proof`
  - `results` via `debugRedirectTo=results`, landing on `Historia wynikow / Ostatnie sesje mobilne`
- the remaining blocker is no longer auth, storage, or sync plumbing; it is fully hands-free normal in-app validation because Expo Go deep links are inconsistent after full restarts and Codex does not currently have macOS assistive access to dismiss or tap through Expo Go UI directly
- the remaining iOS work is app-level validation on the simulator after manually dismissing the Expo Go overlay:
  - one normal manual synced practice run without the dev-only debug route
  - one ordinary home re-check after that manual run, to confirm the new synced score through the normal dashboard path rather than the dev-only proof helpers

Next-session shortcut for iOS:

- most of the native path is already proven; do not spend time re-proving auth, CSRF, storage, or the downstream ordinary routes unless something regressed
- the minimal next-session path is:
  - `npm run dev:mobile:ios:local`
  - manually dismiss the Expo Go `Continue` overlay if it appears
  - complete one normal non-debug practice run in the simulator
  - re-check ordinary home once after that run
- if that manual run is blocked again, fall back to `npm run checklist:mobile:native:runtime:ios` and the direct `simctl` commands below instead of rebuilding more tooling first

Next iOS commands for the next session:

```bash
npm run check:mobile:ios:toolchain
npm run check:mobile:native:runtime:ios
npm run check:mobile:runtime:backend:ios
npm run prepare:mobile:runtime:ios
npm run dev:mobile:ios:local
npm run checklist:mobile:native:runtime:ios
```

Next iOS validation goal:

- manually tap `Continue` on the Expo Go help/tools overlay if it appears
- run the learner-session checklist on the now-working simulator runtime
- the iOS checklist command now prints the remaining ordinary-route manual proof steps and the verified direct `simctl` fallback commands:
  - `npm run checklist:mobile:native:runtime:ios`
- optionally use `npm run proof:mobile:native:ios:debug -- --dry-run` to print the scripted debug-proof route chain
- if the full scripted sweep flakes, use one-step proof mode instead:
  - `npm run proof:mobile:native:ios:debug -- --dry-run --step home --output-dir /tmp/kangur-mobile-ios-debug-proof`
  - `npm run proof:mobile:native:ios:debug -- --step summary --output-dir /tmp/kangur-mobile-ios-debug-proof`
  - `npm run proof:mobile:native:ios:debug -- --step results --output-dir /tmp/kangur-mobile-ios-debug-proof`
  - `npm run proof:mobile:native:ios:debug -- --step home --output-dir /tmp/kangur-mobile-ios-debug-proof`
- if scripted mode still flakes, use the direct shell fallback that `--dry-run` prints:
  - `xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=home'`
  - `sleep 8`
  - `xcrun simctl io booted screenshot /tmp/kangur-mobile-ios-debug-proof/06-home.png`
- if you want the ordinary non-debug route checks directly, the same one-off fallback works for:
  - `xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/results'`
  - `xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/profile'`
  - `xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/plan'`
  - `xcrun simctl openurl booted 'exp://127.0.0.1:8081/--/leaderboard'`
  - `xcrun simctl terminate booted host.exp.Exponent && xcrun simctl openurl booted 'exp://127.0.0.1:8081'`
- complete one normal manual synced practice run and confirm the native path behaves like the already-validated mobile web/exported flow
- after that run, re-check `/home` natively through the ordinary route flow for the new synced score
- if UI tapping is still blocked, the dev-only fallback proof path is:
  - `exp://192.168.0.33:8082/--/practice?operation=clock&debugAutoComplete=perfect`
  - or `exp://192.168.0.33:8082/--/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=home`
  - or `exp://192.168.0.33:8082/--/practice?operation=clock&debugAutoComplete=perfect&debugRedirectTo=results`

Current Android blocker on this machine:

- `npm run check:mobile:android:toolchain` still reports missing Android SDK / emulator tooling

Next Android commands after the SDK is installed and configured:

```bash
npm run check:mobile:android:toolchain
npm run check:mobile:native:runtime:android
npm run check:mobile:runtime:backend:android
npm run prepare:mobile:runtime:android
npm run dev:mobile:android:local
npm run checklist:mobile:native:runtime:android
```

Notes for the next session:

- use `apps/mobile/.env.local` as the source of truth for mobile local env
- full repo typecheck is still intentionally skipped because of unrelated breakage in `src/app/api/kangur/ai-tutor/chat/*`
- if the backend is running on the same machine, iOS simulator uses `http://localhost:3000`
- Android emulator auto-normalizes `localhost` to `http://10.0.2.2:3000`
- physical-device local launch auto-normalizes `localhost` or `10.0.2.2` to the detected LAN IP when possible
- the backend probe still shows `skipped` inside the Codex sandbox because `CODEX_SANDBOX_NETWORK_DISABLED=1`; rerun the backend and checklist commands in a normal shell for the live native validation pass
- the local native launcher now defaults `EXPO_OFFLINE=1`, so Expo prints offline-mode warnings like `Offline and no cached development certificate found, unable to sign manifest`; that is expected for this local launcher path and avoids the Expo account prompt
- if the Expo Go help/tools sheet appears on the simulator, dismiss it manually with `Continue`; Codex could not click it directly because `osascript` lacks macOS assistive access in this environment
- after a full Expo Go termination, `xcrun simctl launch ... exp://...` can land on the Expo Go home screen instead of the target route; in that case, manually tap the `Kangur Mobile` server card or use another `openurl` while Expo Go is already active
- if `npm run proof:mobile:native:ios:debug` fails immediately with `CoreSimulatorService connection became invalid`, rerun `xcrun simctl list devices` once and then rerun the proof command; on this machine that failure appears transient and host-side rather than app-specific
- if the full sweep is flaky, prefer `npm run proof:mobile:native:ios:debug -- --step home --output-dir /tmp/kangur-mobile-ios-debug-proof` or another single `--step ...` target first; if that still fails with the same CoreSimulatorService error, treat it as a host-side Simulator issue rather than an app-route failure

## Local setup

1. Install the workspace dependencies:

```bash
npm install --workspace @kangur/mobile
```

2. Optionally set a custom API origin:

```bash
EXPO_PUBLIC_KANGUR_API_URL=http://localhost:3000
```

Or start from the mobile env template:

```bash
cp apps/mobile/.env.example apps/mobile/.env.local
```

Or use the helper command:

```bash
npm run init:mobile:env
```

The main mobile commands now auto-load `apps/mobile/.env.local` or `apps/mobile/.env`
when those files exist. That includes `config`, `dev`, `web`, `export:web`, and the EAS build scripts.
If you override that with `KANGUR_MOBILE_ENV_FILE`, relative paths are accepted from either
the repo root or the `apps/mobile` workspace.

Optional Expo/EAS identifiers:

```bash
KANGUR_IOS_BUNDLE_IDENTIFIER=com.example.kangur.mobile
KANGUR_ANDROID_PACKAGE=com.example.kangur.mobile
KANGUR_EXPO_OWNER=your-expo-account
KANGUR_EXPO_PROJECT_ID=your-eas-project-id
```

If you run Expo web against a separate Kangur API origin, allow that web origin on the
backend too:

```bash
KANGUR_MOBILE_WEB_CORS_ORIGINS=http://localhost:8081,https://mobile-preview.example.com
```

3. Start the app:

```bash
npm run dev --workspace @kangur/mobile
```

For native local validation with the runtime checks bundled in front, use:

```bash
npm run native:local:ios --workspace @kangur/mobile
npm run native:local:android --workspace @kangur/mobile
npm run native:local:device --workspace @kangur/mobile
```

Root wrappers also exist:

```bash
npm run dev:mobile:ios:local
npm run dev:mobile:android:local
npm run dev:mobile:device:local
```

Those commands run the target-specific runtime prepare path first, verify that the
configured Kangur backend is reachable, and only then start Expo for that target.
Add `-- --dry-run` if you only want to inspect the planned target/env path without
launching Expo.

The local native launcher now defaults `EXPO_OFFLINE=1` unless you set it explicitly.
That makes Expo use anonymous manifest signatures and skip the interactive Expo
account prompt that can otherwise block `expo start --ios` / `expo start --android`
in this workflow. This does not change the app's own `EXPO_PUBLIC_*` backend config.

For `npm run dev:mobile:android:local`, the launcher now auto-normalizes
`EXPO_PUBLIC_KANGUR_API_URL=http://localhost:3000` to `http://10.0.2.2:3000`
for the standard Android emulator case, so the common local setup works without
an extra shell override.

For `npm run dev:mobile:device:local`, the launcher now auto-normalizes
`EXPO_PUBLIC_KANGUR_API_URL=http://localhost:3000` or `http://10.0.2.2:3000`
to the detected LAN IP when one is available, so the physical-device path can
reuse the same default env file on a typical local network.

The native local launcher and its `--dry-run` output now also point at the
matching `checklist:mobile:native:runtime:*` command, so the post-launch
learner-session proof flow stays target-specific.
The real launch path prints the same checklist hint immediately before Expo
starts, so the target-specific validation steps are visible in the terminal
without rerunning a separate dry run first.

For the scripted iOS simulator screenshot sweep after a dev-only synced run, use:

```bash
npm run proof:mobile:native:ios:debug -- --dry-run
npm run proof:mobile:native:ios:debug -- --output-dir /tmp/kangur-mobile-ios-debug-proof
npm run proof:mobile:native:ios:debug -- --step home --output-dir /tmp/kangur-mobile-ios-debug-proof
```

That command assumes:

- the iOS simulator is already booted
- the local Expo iOS session is already running on `exp://127.0.0.1:8081`
- the dev-only practice proof routes are available in the current bundle

4. Start Expo web:

```bash
npm run web --workspace @kangur/mobile
```

5. Export a static web build:

```bash
npm run export:web --workspace @kangur/mobile
```

The exported files are written to `apps/mobile/dist`.

To preview the exported build locally with clean Expo routes like `/profile` or `/plan`:

```bash
npm run preview:web --workspace @kangur/mobile
```

Or from the repo root:

```bash
npm run preview:mobile:web
```

This preview server maps clean routes to the exported `*.html` files, so direct reload
checks work locally in a way that `python -m http.server` does not.

To run the exported learner-session reload smoke check after starting the backend and
the local preview server:

```bash
KANGUR_MOBILE_SMOKE_LOGIN=your-learner-login \
KANGUR_MOBILE_SMOKE_PASSWORD=your-learner-password \
npm run smoke:exported:web --workspace @kangur/mobile
```

Or from the repo root:

```bash
KANGUR_MOBILE_SMOKE_LOGIN=your-learner-login \
KANGUR_MOBILE_SMOKE_PASSWORD=your-learner-password \
npm run smoke:mobile:web
```

The smoke check signs in through the exported home screen and verifies clean-route
reload behavior for `/`, `/profile`, `/plan`, `/results`, and `/leaderboard`.

To run the full local exported-web validation in one command, including export and the
clean-route preview server:

```bash
KANGUR_MOBILE_SMOKE_LOGIN=your-learner-login \
KANGUR_MOBILE_SMOKE_PASSWORD=your-learner-password \
npm run smoke:mobile:web:local
```

That command exports `apps/mobile/dist`, starts the local preview server on `8081`,
runs the learner-session smoke, and stops the preview server automatically.

It also forces `EXPO_PUBLIC_KANGUR_AUTH_MODE=learner-session` for that export and
defaults `EXPO_PUBLIC_KANGUR_API_URL` to `http://localhost:3000` when you do not
set it explicitly, so the local smoke flow is reproducible by default.

6. Inspect the resolved Expo config:

```bash
npm run config --workspace @kangur/mobile
```

7. Run the config regression test:

```bash
npm run test:config --workspace @kangur/mobile
```

8. Run the native build-env preflight:

```bash
npm run check:build-env --workspace @kangur/mobile -- --profile preview
```

The build-env preflight uses the same env-loading path, so you do not need to export
each variable manually for local checks.

9. Run the native runtime env preflight for the target you want to validate:

```bash
npm run check:runtime:ios --workspace @kangur/mobile
npm run check:runtime:android --workspace @kangur/mobile
npm run check:runtime:device --workspace @kangur/mobile
```

Root wrappers also exist:

```bash
npm run check:mobile:runtime:ios
npm run check:mobile:runtime:android
npm run check:mobile:runtime:device
npm run check:mobile:runtime:backend
npm run check:mobile:runtime:backend:ios
npm run check:mobile:runtime:backend:android
npm run check:mobile:runtime:backend:device
```

The target-specific backend checks now also print the next target command chain:

- `prepare:mobile:runtime:*`
- `dev:mobile:*:local`
- `checklist:mobile:native:runtime:*`

If you want one command that runs the tooling tests, mobile typecheck, and the
target-specific runtime preflight together, use:

```bash
npm run prepare:mobile:runtime:ios
npm run prepare:mobile:runtime:android
npm run prepare:mobile:runtime:device
```

Those prepare commands now run the scoped native-runtime doctor for their target,
so they include host-toolchain status, target-specific runtime env validation,
and backend probe status in one pass.

For iOS simulator work, there is also a dedicated Xcode toolchain preflight:

```bash
npm run check:mobile:ios:toolchain
```

It fails early when `xcode-select` still points at Command Line Tools instead of the
full Xcode app, when the Xcode license is not accepted, or when `simctl` exists but
no iOS Simulator devices are currently available.

For Android emulator work, there is a symmetric Android toolchain preflight:

```bash
npm run check:mobile:android:toolchain
```

It fails early when `adb` or `emulator` are unavailable, and it warns when
`ANDROID_SDK_ROOT` / `ANDROID_HOME` are missing or inconsistent.

If you want one combined host summary for both native platforms, use:

```bash
npm run check:mobile:native:host
```

That prints a single report with separate iOS and Android readiness sections, which is
useful before deciding which native runtime path to fix first. It also prints
the concrete next commands to run after you install or configure the missing host tools.

If you want one combined local-native readiness report that includes:

- iOS and Android host toolchains
- iOS simulator, Android emulator, and physical-device runtime env checks
- backend reachability or sandbox skip status

use:

```bash
npm run check:mobile:native:runtime
```

That is the highest-signal single command before local native validation, because it
shows the current blockers for every target in one pass and prints the concrete next
commands to run.

If you want the same report but scoped to one target only, use:

```bash
npm run check:mobile:native:runtime:ios
npm run check:mobile:native:runtime:android
npm run check:mobile:native:runtime:device
```

That is useful when iOS is ready but Android is not, or when you only want the
physical-device path without failing on simulator/emulator blockers.

When a scoped target is otherwise launchable, the report now also prints the
matching target sequence:

- `check:mobile:runtime:backend:*`
- `prepare:mobile:runtime:*`
- `dev:mobile:*:local`
- `checklist:mobile:native:runtime:*`

That keeps the post-launch learner-session validation flow explicit, not just the
pre-launch readiness steps.

These scoped native-runtime checks now reflect the same local-launch URL normalization
as the launcher commands:

- Android emulator checks normalize `localhost` to `10.0.2.2`
- physical-device checks normalize `localhost` or `10.0.2.2` to the detected LAN IP when available

These checks catch the most common local validation mistake:

- `localhost:3000` is fine for iOS simulator
- `localhost:3000` is wrong for Android emulator; use `http://10.0.2.2:3000`
- `localhost:3000` and `10.0.2.2` are wrong for a physical device; use a reachable LAN IP or tunnel URL

## Vercel mobile-web setup

Use a separate Vercel project with the root directory set to `apps/mobile`.

- build config lives in [vercel.json](./vercel.json)
- build command: `npm run export:web`
- output directory: `dist`

This keeps the existing Next.js app as the main backend/web project while the Expo app can be deployed as a static mobile-web surface from the same monorepo.

## Native builds with EAS

The native iOS/Android path is intentionally separate from Vercel.

- EAS config lives in [eas.json](./eas.json)
- preview/internal builds:

```bash
npm run eas:build:preview --workspace @kangur/mobile
```

These preview scripts now run the native build-env preflight automatically before
calling EAS, so placeholder identifiers or missing Expo owner/project wiring fail
early.

- production builds:

```bash
npm run eas:build:production --workspace @kangur/mobile
```

Platform-specific production builds are also available:

```bash
npm run eas:build:ios:production --workspace @kangur/mobile
npm run eas:build:android:production --workspace @kangur/mobile
```

Convenience scripts also exist at the repo root:

```bash
npm run config:mobile
npm run init:mobile:env
npm run test:mobile:config
npm run test:mobile:tooling
npm run check:mobile:build-env -- --profile preview
npm run prepare:mobile:preview
npm run prepare:mobile:production
npm run prepare:mobile:ios:preview
npm run prepare:mobile:android:preview
npm run prepare:mobile:ios:production
npm run prepare:mobile:android:production
npm run export:mobile:web
npm run build:mobile:preview
npm run build:mobile:ios:preview
npm run build:mobile:android:preview
npm run build:mobile:production
npm run build:mobile:ios:production
npm run build:mobile:android:production
```

Before real store builds, you still need:

- final iOS bundle identifier and Android package name
- Expo owner / EAS project ID
- signing credentials and store metadata

## Preview build checklist

1. Set real native identifiers and Expo/EAS values:

```bash
export KANGUR_IOS_BUNDLE_IDENTIFIER=com.yourorg.kangur
export KANGUR_ANDROID_PACKAGE=com.yourorg.kangur
export KANGUR_EXPO_OWNER=your-expo-account
export KANGUR_EXPO_PROJECT_ID=your-eas-project-id
```

2. Verify the resolved config:

```bash
npm run config:mobile
```

3. Run the config and build-env checks:

```bash
npm run test:mobile:config
npm run check:mobile:build-env -- --profile preview
```

Or use the combined preview-readiness command:

```bash
npm run prepare:mobile:preview
```

Platform-specific preview checks are also available:

```bash
npm run prepare:mobile:ios:preview
npm run prepare:mobile:android:preview
```

For production env validation, use:

```bash
npm run prepare:mobile:production
```

Platform-specific production checks are also available:

```bash
npm run prepare:mobile:ios:production
npm run prepare:mobile:android:production
```

4. Build the first preview binary:

```bash
npm run build:mobile:preview
```

## Native runtime validation checklist

You can print the checklist directly from the repo:

```bash
npm run checklist:mobile:native:runtime
npm run checklist:mobile:native:runtime:ios
npm run checklist:mobile:native:runtime:android
npm run checklist:mobile:native:runtime:device
```

After the first preview build or Expo device run is available, validate:

- learner-session sign-in
- one synced practice run
- refresh of home, profile, results, leaderboard, and daily plan
- cold-start persistence after fully closing and reopening the app

Treat failures in auth transport, storage persistence, or synced score refresh as blockers before adding more mobile features.

Before that runtime pass, run the target-specific runtime env check above so the API
origin is correct for simulator, emulator, or physical-device networking.

## Vercel mobile-web checklist

For the static mobile-web deployment path:

1. Set `KANGUR_MOBILE_WEB_CORS_ORIGINS` on the Kangur backend if web and API origins differ.
2. Run `npm run export:mobile:web`.
3. Configure a separate Vercel project rooted at `apps/mobile`.
4. Use `npm run export:web` as the build command and `dist` as the output directory.
