---
owner: 'Platform Team'
last_reviewed: '2026-04-10'
status: 'active'
doc_type: 'runbook'
scope: 'repository'
canonical: true
---

# General improvement operations

This repository now exposes one repo-owned orchestration layer for broad improvement work.

## Purpose

Use these commands when the goal is not one narrow repair, but a structured improvement sweep across:
- UI consolidation
- application performance baselines
- testing-system health
- product data integrity
- repo quality baselines
- recovery planning
- guarded apply steps

The initial orchestration is intentionally conservative:
- read-only phases execute automatically
- write-side phases stay gated or manual unless the command explicitly allows writes

## Repo-owned commands

- `npm run improvements:audit`
- `npm run improvements:classify`
- `npm run improvements:plan`
- `npm run improvements:dry-run`
- `npm run improvements:apply`
- `npm run improvements:read-only`
- `npm run improvements:application`
- `npm run improvements:products`
- `npm run improvements:refresh-docs`

All commands are backed by:
- [run-general-improvement-operations.ts](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/scripts/db/run-general-improvement-operations.ts)
- [run-general-improvement-batch.ts](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/scripts/db/run-general-improvement-batch.ts)
- [general-improvement-operations.ts](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/scripts/db/general-improvement-operations.ts)

## Tracks

Current tracks:
- `ui-consolidation`
- `application-performance`
- `testing-quality-baseline`
- `products-parameter-integrity`
- `products-category-schema-normalization`
- `repo-quality-baseline`

Use `--track <id>` to scope a phase to one or more tracks.

If `--track` is omitted, the runner uses the full default track set from the manifest.

Examples:

```bash
npm run improvements:audit -- --track products-parameter-integrity
npm run improvements:classify -- --track repo-quality-baseline
npm run improvements:plan -- --track products-parameter-integrity,repo-quality-baseline
npm run improvements:read-only
npm run improvements:application
npm run improvements:products
```

## Batch entrypoints

`improvements:read-only`
- runs:
  - `audit`
  - `classify`
  - `plan`
- defaults to the manifest-selected broad portfolio:
  - `ui-consolidation`
  - `application-performance`
  - `products-parameter-integrity`
  - `products-category-schema-normalization`
  - `repo-quality-baseline`
- writes `artifacts/improvements/read-only-batch-report.json`
- continues through all read-only phases even if an earlier phase fails, then
  exits non-cleanly after writing the full batch report

`improvements:application`
- runs the same read-only sequence
- scopes to:
  - `ui-consolidation`
  - `application-performance`
  - `testing-quality-baseline`
  - `repo-quality-baseline`
- this is the default non-data application operations bundle
- like `improvements:read-only`, it keeps collecting later read-only phases even
  when audit or classify surfaces failures

`improvements:products`
- runs the same read-only sequence
- scopes to:
  - `products-parameter-integrity`
  - `products-category-schema-normalization`
- this is the product integrity and recovery planning bundle

The batch entrypoints accept `--report <path>` if you need to write the batch
summary somewhere other than `artifacts/improvements/read-only-batch-report.json`.

## Phase semantics

`audit`
- executes read-only audits and baseline checks

`classify`
- executes read-only classification and summary steps

`plan`
- writes a plan report only
- does not execute package scripts
- keeps `executionMode` as `planned`

`dry-run`
- executes only safe automatic steps for the selected tracks
- manual review steps are recorded in the report

`apply`
- allows write-side steps only when the orchestration layer explicitly permits them
- current product recovery apply remains manual by design because it depends on curated override files

If a step would write and `--allow-write` is not present, the runner records it as `blocked-by-write-policy` and exits non-cleanly instead of silently skipping it.

## Reports

Each phase writes a machine-readable report under:
- `artifacts/improvements/audit-report.json`
- `artifacts/improvements/classify-report.json`
- `artifacts/improvements/plan-report.json`
- `artifacts/improvements/dry-run-report.json`
- `artifacts/improvements/apply-report.json`

The runners also refresh the canonical docs hub under:
- [`docs/build/improvements/README.md`](./improvements/README.md)
- [`docs/build/improvements/scan-latest.md`](./improvements/scan-latest.md)

Each report records:
- selected tracks
- phase
- execution mode
- allow-write policy
- step statuses
- output paths
- manual instructions where automation intentionally stops

Status values today are:
- `planned`
- `passed`
- `failed`
- `manual`
- `blocked-by-write-policy`

## Improvement docs hub

The improvement portfolio now has the same stable instruction-plus-scan shape as
`docs/ui-consolidation`, but in a canonical shared location:

- top-level hub:
  [`docs/build/improvements/README.md`](./improvements/README.md)
- generated portfolio scan:
  [`docs/build/improvements/scan-latest.md`](./improvements/scan-latest.md)
- per-track instruction and scan directories under:
  [`docs/build/improvements/`](./improvements/README.md)

Use `npm run improvements:refresh-docs` if you need to regenerate the hub from
the latest improvement reports without running a new phase.

## UI and application tracks

`ui-consolidation` adds the existing cross-feature UI convergence guardrail to
the shared improvement manifest. Its authoritative scan surface stays under
[`docs/ui-consolidation/README.md`](../ui-consolidation/README.md) while the
improvement hub mirrors the latest track-level view.

`application-performance` adds the app performance operations lane so broad
improvement passes include:
- fast regression gates
- baseline performance snapshots
- route hotspot follow-up surfaces

`testing-quality-baseline` is available as an application-focused optional track
when you want the same portfolio workflow to include testing inventory and
quality drift.

## Current product-integrity flow

`products-parameter-integrity` currently automates:
- missing-parameter audit
- recovery classification
- source-recovery reporting
- source-recovery summaries
- template generation
- batch splitting
- family mapping index generation
- checklist rendering

It intentionally stops before blind writes. Curated override application stays explicit because category/schema decisions are sometimes still required.

## Current category/schema normalization flow

`products-category-schema-normalization` exists for the unresolved recovery remainder that still cannot be repaired safely by inference.

It currently:
- refreshes unresolved source-recovery reporting
- emits a manual-remediation report
- records category/schema decisions as explicit manual plan/apply steps
- can build a ready curated-override bundle from any family mapping packs that already have final parameter ids

This track is intentionally decision-first:
- category assignment
- parameter-schema choice
- curated override construction
- then controlled apply

It does not perform blind category or schema writes automatically.

## Repo quality baseline track

`repo-quality-baseline` is the repo-wide read-only lane in the current improvement manifest.

It currently covers:
- API error source coverage
- canonical-sitewide validation
- lint baseline
- typecheck baseline

Its planning step is intentionally conservative: review the baseline outputs first, then escalate to broader Bazel lanes such as `npm run bazel:smoke` or `npm run bazel:ci` only if the baseline indicates wider instability.

## Curated family-mapping bridge

Once `suggestedFinalParameterId` values are filled in the latest
`/tmp/product-parameter-source-recovery-batches/*-mapping-pack.json` files, the
improvement runner can bridge that curation into an apply-ready bundle.

Key outputs:
- `/tmp/product-parameter-curated-build-latest.json`
- `/tmp/product-parameter-curated-overrides-latest.json`

The category/schema normalization track now supports:
- `dry-run`
  - builds the latest ready curated override bundle
  - previews the resulting apply set without writes
- `apply`
  - rebuilds the latest curated override bundle
  - applies only that merged latest file

This remains conservative:
- incomplete family packs stay `pending`
- only fully mapped packs are included in the ready bundle
