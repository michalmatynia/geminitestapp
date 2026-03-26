---
owner: 'Platform Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'runbook'
scope: 'repository'
canonical: true
---

# Bazel remote cache with BuildBuddy

This repo already supports optional remote-cache injection through the Bazel wrapper in `tools/bazel/run-bazel.sh`.

The wrapper reads:

- `BAZEL_REMOTE_CACHE_URL`
- `BAZEL_REMOTE_CACHE_HEADER`
- `BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS`

Any workflow or local command that runs Bazel through `npm run bazel -- ...` inherits this wrapper behavior.

## Recommended BuildBuddy contract

Use BuildBuddy as the remote cache endpoint and pass the API key through a remote header.

Example values:

```bash
export BAZEL_REMOTE_CACHE_URL="grpcs://remote.buildbuddy.io"
export BAZEL_REMOTE_CACHE_HEADER="x-buildbuddy-api-key=YOUR_BUILDBUDDY_API_KEY"
export BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS=1
```

Then run Bazel through the repo wrapper:

```bash
npm run bazel -- run //:api_error_sources
```

## GitHub Actions secrets

Configure these repository secrets:

- `BAZEL_REMOTE_CACHE_URL`
- `BAZEL_REMOTE_CACHE_HEADER`

Recommended values:

- `BAZEL_REMOTE_CACHE_URL=grpcs://remote.buildbuddy.io`
- `BAZEL_REMOTE_CACHE_HEADER=x-buildbuddy-api-key=YOUR_BUILDBUDDY_API_KEY`

`BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS` does not need to be stored as a secret. The workflows can set it dynamically:

- pull requests: `0`
- pushes on `main`: `1`

That keeps PR jobs read-only against the remote cache and lets trusted branch builds publish results.

## Current GitHub Actions surfaces

The current repo-owned Bazel lanes that already consume this wrapper contract are:

- `.github/workflows/bazel-toolchain.yml`
- `.github/workflows/bazel-smoke.yml`
- `.github/workflows/bazel-quality.yml`
- `.github/workflows/bazel-regressions.yml`

The docs-focused Bazel workflows also use the same remote-cache env contract:

- `.github/workflows/docs-structure.yml`
- `.github/workflows/validator-docs.yml`

The dedicated repo-lane workflows set `BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS` to `1` only on pushes to `main`. The docs-specific Bazel workflows stay read-only on pull requests and writable on their `main` push runs.

## Local usage

Read-only local cache usage:

```bash
export BAZEL_REMOTE_CACHE_URL="grpcs://remote.buildbuddy.io"
export BAZEL_REMOTE_CACHE_HEADER="x-buildbuddy-api-key=YOUR_BUILDBUDDY_API_KEY"
export BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS=0
npm run bazel -- run //:api_error_sources
```

Writable local cache usage:

```bash
export BAZEL_REMOTE_CACHE_URL="grpcs://remote.buildbuddy.io"
export BAZEL_REMOTE_CACHE_HEADER="x-buildbuddy-api-key=YOUR_BUILDBUDDY_API_KEY"
export BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS=1
npm run bazel -- run //:typecheck
```

## Why this repo uses header-based auth

The repo wrapper injects remote-cache settings generically. Using a header string keeps the setup backend-agnostic and avoids hardcoding vendor-specific flags in every workflow.

## Verification

Use a lightweight target first:

```bash
npm run bazel -- query //:all
npm run bazel -- run //:api_error_sources
```

Then verify one canonical repo lane:

```bash
npm run bazel:toolchain
```

If those succeed with the remote cache env enabled, the wrapper wiring is correct.

## Failure modes

If remote-cache auth is wrong:

- Bazel still runs with local execution
- cache reads/writes fail or are skipped
- target correctness is unaffected

If you need to disable the remote cache quickly:

```bash
unset BAZEL_REMOTE_CACHE_URL
unset BAZEL_REMOTE_CACHE_HEADER
unset BAZEL_REMOTE_CACHE_UPLOAD_LOCAL_RESULTS
```
