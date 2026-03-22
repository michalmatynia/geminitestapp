---
owner: 'Platform Team'
last_reviewed: '2026-03-22'
status: 'active'
doc_type: 'runbook'
scope: 'repository'
canonical: true
---

# General improvement operations

This repository now exposes one repo-owned orchestration layer for broad improvement work.

## Purpose

Use these commands when the goal is not one narrow repair, but a structured improvement sweep across:
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
- `npm run improvements:products`

All commands are backed by:
- [run-general-improvement-operations.ts](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/scripts/db/run-general-improvement-operations.ts)
- [general-improvement-operations.ts](/Users/michalmatynia/Desktop/NPM/2026/Gemini%20new%20Pull/geminitestapp/scripts/db/general-improvement-operations.ts)

## Tracks

Current tracks:
- `products-parameter-integrity`
- `products-category-schema-normalization`
- `repo-quality-baseline`

Use `--track <id>` to scope a phase to one or more tracks.

Examples:

```bash
npm run improvements:audit -- --track products-parameter-integrity
npm run improvements:classify -- --track repo-quality-baseline
npm run improvements:plan -- --track products-parameter-integrity,repo-quality-baseline
npm run improvements:read-only
npm run improvements:products
```

## Batch entrypoints

`improvements:read-only`
- runs:
  - `audit`
  - `classify`
  - `plan`
- writes `artifacts/improvements/read-only-batch-report.json`

`improvements:products`
- runs the same read-only sequence
- scopes to:
  - `products-parameter-integrity`
  - `products-category-schema-normalization`
- this is the default broad entrypoint for product integrity and recovery planning work

## Phase semantics

`audit`
- executes read-only audits and baseline checks

`classify`
- executes read-only classification and summary steps

`plan`
- writes a plan report only
- does not execute package scripts

`dry-run`
- executes only safe automatic steps for the selected tracks
- manual review steps are recorded in the report

`apply`
- allows write-side steps only when the orchestration layer explicitly permits them
- current product recovery apply remains manual by design because it depends on curated override files

## Reports

Each phase writes a machine-readable report under:
- `artifacts/improvements/audit-report.json`
- `artifacts/improvements/classify-report.json`
- `artifacts/improvements/plan-report.json`
- `artifacts/improvements/dry-run-report.json`
- `artifacts/improvements/apply-report.json`

Each report records:
- selected tracks
- phase
- execution mode
- step statuses
- output paths
- manual instructions where automation intentionally stops

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
