---
owner: 'Platform Team'
last_reviewed: '2026-03-29'
status: 'active'
doc_type: 'runbook'
scope: 'cross-feature'
canonical: true
---

# Vercel Deployment Configuration

> **WARNING: DO NOT MODIFY** the settings documented here without explicit
> approval. This configuration was stabilised on 2026-03-29 after multiple
> failed deploy attempts (OOM and 45-minute timeout). Every value has a
> specific reason.

## Why This Configuration Exists

The codebase has 495 entry points (184 pages + 297 API routes + layouts) across
4 locales. Vercel's default build machine provides 8 GB RAM and enforces a
45-minute build timeout. Both turbopack and webpack hit these limits without
careful tuning:

- **Turbopack** cold builds exceed 45 minutes on this codebase size.
- **Webpack** OOMs if heap, cache, or worker settings are wrong.

## Working Configuration Summary

| Setting | Value | File |
|---------|-------|------|
| Bundler on Vercel | `webpack` | `scripts/build/run-next-build.cjs` |
| Bundler locally | `turbopack` (default) | `scripts/build/run-next-build.cjs` |
| Node heap on Vercel | `3584 MB` | `scripts/build/run-next-build.cjs` |
| Node heap locally | `8192 MB` | `scripts/build/run-next-build.cjs` |
| Webpack cache on Vercel | `false` | `next.config.mjs` webpack callback |
| `experimental.cpus` | `1` (webpack only) | `next.config.mjs` |
| `compiler.removeConsole` | `false` on Vercel | `next.config.mjs` |
| `serverExternalPackages` | 29 packages | `next.config.mjs` |
| `output: 'standalone'` | Disabled on Vercel | `next.config.mjs` |
| `typescript.ignoreBuildErrors` | `true` | `next.config.mjs` |
| Prebuild cleanup on Vercel | Minimal (lock, standalone, trace-build only) | `scripts/build/prebuild-cleanup.cjs` |

## Detailed Rationale

### Heap: 3584 MB (not higher)

Next.js spawns a worker process for static page generation. The worker inherits
`NODE_OPTIONS`, so the total memory is approximately `2 x heap`. At 3584 MB,
that's ~7.2 GB, leaving ~800 MB for the OS. Setting the heap to 6144 MB caused
OOM because main + worker = 12.3 GB on an 8 GB machine.

### Bundler: webpack on Vercel

Turbopack is the default in Next.js 16 and is used locally. However, turbopack
cold builds on this codebase exceed Vercel's 45-minute timeout. Webpack
completes within the limit with the other optimisations in place. The build
script (`run-next-build.cjs`) defaults to webpack when `process.env.VERCEL` is
set and no explicit `NEXT_BUILD_BUNDLER` override is provided.

### Webpack cache: disabled on Vercel

Webpack's filesystem cache serialization phase causes a memory spike that
pushes the build into OOM on 8 GB machines. Disabling the cache
(`config.cache = false`) prevents this spike. The trade-off is that every
Vercel build is a cold webpack compilation, but this is acceptable given the
current build times.

### `compiler.removeConsole`: disabled on Vercel

The SWC `removeConsole` transform runs an extra pass over every file in the
compilation graph. Disabling it on Vercel saves build time. Console output in
serverless function logs is harmless.

### `experimental.cpus: 1` for webpack

Webpack page-data workers fan out aggressively and cause OOM on constrained
builders. Capping at 1 worker prevents this. Turbopack handles its own
parallelism in Rust and uses the default CPU count.

### 29 Externalized Server Packages

Each externalized package is removed from the webpack compilation graph,
reducing both build time and peak memory. All 29 are server-only (Node.js
runtime). The full list is in `next.config.mjs` under `serverExternalPackages`.

Do NOT remove packages from this list. Adding new server-only packages is safe.

### Prebuild cleanup: minimal on Vercel

`prebuild-cleanup.cjs` detects the Vercel environment and only removes safe
stale artifacts: `.next/lock`, `.next/standalone`, `.next/trace-build`. It does
**NOT** remove `.next/server`, `.next/static`, or `.next/cache` on Vercel,
because Vercel preserves the `.next` directory between builds for caching.
Destroying these would force a cold rebuild every time.

## Files Involved

| File | Role |
|------|------|
| `vercel.json` | Vercel project config: install + build commands |
| `next.config.mjs` | Next.js config: externals, compiler, experimental, webpack |
| `scripts/build/run-next-build.cjs` | Build orchestrator: bundler selection, heap, retry logic |
| `scripts/build/prebuild-cleanup.cjs` | Pre-build stale artifact cleanup |
| `scripts/build/check-vercel-build-contract.cjs` | Validates vercel.json matches expected contract |
| `scripts/build/check-vercel-production-alias-sync.mjs` | Validates `studiqpl.vercel.app` matches the canonical production alias and can repair drift |

## Production Domain Sync Guardrail

StudiQ serves production traffic from `studiqpl.vercel.app`, but the canonical
project production alias remains
`geminitestapp-michalmatynias-projects.vercel.app`. If those two aliases point
at different deployments, production can drift onto a stale build even when the
latest production deploy is healthy.

Check the alias contract after any production release:

```bash
npm run check:vercel:production:sync
```

The command uses the active `vercel login` session when available. In CI,
provide `VERCEL_TOKEN` instead.

If the check reports drift, repair the custom domain by reassigning it to the
canonical production deployment:

```bash
npm run repair:vercel:production:sync
```

Preferred release flow:

1. Promote the intended production deployment with `vercel promote <deployment>`.
2. Run `npm run check:vercel:production:sync`.
3. Run `npm run check:github:branch-protection`.
4. If Kangur lesson content changed, also run `npm run verify:kangur:content -- --strict`.

GitHub Actions also exposes `.github/workflows/vercel-production-sync.yml` for
PR-time verification, scheduled drift detection, and manual recovery. Use
`mode=repair` only when the scheduled or local check has already confirmed
alias drift.

GitHub Actions also exposes `.github/workflows/github-main-branch-protection.yml`
for scheduled drift detection and manual `mode=repair` recovery of the minimum
`main` branch protection baseline.

Only use `repair:vercel:production:sync` when the custom domain has drifted
away from the canonical production alias. It is a recovery command, not the
normal release path.

## Troubleshooting

### Build OOMs on Vercel

1. Check that heap is `3584` (not higher) in `run-next-build.cjs`
2. Check that `config.cache = false` is set for Vercel in the webpack callback
3. Check that `experimental.cpus` is `1` for webpack builds
4. Check that all 29 packages are still in `serverExternalPackages`
5. If the codebase has grown significantly, consider externalizing more
   server-only packages

### Build exceeds 45-minute timeout

1. This typically means turbopack is running instead of webpack — check that
   `run-next-build.cjs` defaults to webpack on Vercel
2. If webpack itself takes too long, check that `compiler.removeConsole` is
   disabled on Vercel and that `typescript.ignoreBuildErrors` is `true`

### Emergency: deploy from local machine

If Vercel builds are completely blocked, build locally and deploy prebuilt:

```bash
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

Your local machine has no timeout and more RAM.

### Production domain serves an older build

1. Run `npm run check:vercel:production:sync`.
2. If drift is reported, run `npm run repair:vercel:production:sync`.
3. Run `npm run check:github:branch-protection` to confirm the required
   `production-sync` branch gate is still enforced on `main`.
4. Re-check the affected public route or API after the alias converges.
