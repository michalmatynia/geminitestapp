---
owner: 'Platform Team'
last_reviewed: '2026-03-22'
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
- protected branch pushes: `1`

That keeps PR jobs read-only against the remote cache and lets trusted branch builds publish results.

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
