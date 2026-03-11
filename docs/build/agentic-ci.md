# Agentic preflight CI lane

The repository now exposes a dedicated preflight workflow in `.github/workflows/agentic-preflight.yml`.

## Purpose

This lane converts pull request file changes into a machine-readable work order before broader validation runs.

It does three things:
- resolves changed files from the pull request diff
- runs `//:agentic_preflight`
- uploads `artifacts/agent-work-order.json`
- builds `artifacts/agent-bundle-plan.json`
- fans out per-bundle validation jobs when the work order recommends impacted bundles

## Bazel target

The workflow uses the repo-owned Bazel target:
- `//:agentic_preflight`

That target executes `scripts/agentic/preflight.ts` through the same Bazel/tooling path used elsewhere in the repository.

## Why this lane exists

This keeps the change-routing logic out of workflow-local shell heuristics.

The workflow computes the diff, but the domain routing itself stays in repo code:
- `config/agentic/domains/*.json`
- `scripts/agentic/domain-manifests.ts`
- `scripts/agentic/preflight.ts`

## Output contract

The uploaded artifact is:
- `artifacts/agent-work-order.json`

That artifact is the intended handoff for later automation phases such as:
- running required docs generators automatically
- running domain scanners automatically
- selecting validation lanes by impact

## Execution phase

The workflow now also runs `npm run agentic:execute` after preflight.

That means the lane no longer stops at routing. It now automatically:
- executes required doc generators
- executes required scanner targets
- emits `artifacts/agent-execution-report.json`

## Generated output staging

After executing the work order, the workflow now stages required generated artifacts with `npm run agentic:collect-artifacts`.

Uploaded outputs now include:
- `artifacts/agent-work-order.json`
- `artifacts/agent-execution-report.json`
- `artifacts/agent-bundle-plan.json`
- `artifacts/generated-outputs-manifest.json`
- `artifacts/generated-outputs/**`

## Bundle validation fanout

The preflight workflow now derives bundle execution from `artifacts/agent-bundle-plan.json`.

After the main preflight job finishes, the workflow fans out `agentic-bundle-validation` jobs using the ordered bundle list from the work order:
- each matrix job runs `npm run agentic:run-bundle -- --bundle <bundle>`
- each job uploads `artifacts/agent-bundle-reports/<bundle>.json`

This keeps bundle selection in repo code rather than workflow-local target lists.

The PR preflight lane now also builds `artifacts/agent-bundle-selection.json`.

When a base-branch `agent-history` snapshot exists, that selection step suppresses bundles whose:
- priority is unchanged
- recommended validation targets are unchanged

That means PR bundle fanout now focuses on bundles with actual recommendation or risk drift instead of replaying the full unchanged bundle set every time.

The preflight job also renders the bundle-selection result into the Actions summary so reviewers can see:
- which bundles were selected for validation
- which bundles were intentionally suppressed as unchanged
- which unchanged high-risk bundles were retained instead of being suppressed

## History snapshot

After the bundle matrix finishes, the workflow now builds a repo-owned history snapshot:
- `artifacts/agent-history/latest.json`

That snapshot merges:
- the work order
- the execution report
- the bundle plan
- the bundle selection state
- all uploaded per-bundle execution reports

This gives later automation one stable artifact for diffing bundle recommendations versus actual bundle outcomes.

On pull requests, the preflight lane also tries to download the latest `agent-history` artifact from the base branch and compute:
- `artifacts/agent-history/diff.json`

If the base branch does not yet have a usable snapshot, the PR lane skips the diff cleanly.

## Finalize lane

The repository now also exposes `.github/workflows/agentic-finalize.yml`.

This lane is the heavier agentic path. It:
- builds a full-repo work order with `//:agentic_preflight`
- runs `npm run agentic:finalize`
- uploads the final report and staged generated outputs

Use this lane for post-merge or controlled automation where the work order should execute its validation targets instead of stopping at generator and scanner execution.

The finalize lane now also emits the same history artifact contract as preflight:
- `artifacts/agent-history/latest.json`

On push-triggered finalize runs, the workflow also tries to download the previous `agent-history` artifact from the same branch and compute:
- `artifacts/agent-history/diff.json`

If no prior branch snapshot exists yet, the finalize lane simply skips the diff step.

Both preflight and finalize now also render the diff into the Actions summary, with explicit emphasis on:
- attempted suppression prevented for high-risk bundles
- newly introduced high-risk bundles
- risk escalations in existing bundles
- bundle-set changes
- validation decision drift

## Manual force-validation override

`agentic-finalize.yml` now exposes a `force_validation` workflow-dispatch input.

Use it only when a low-risk work order still needs explicit validation execution. Push-triggered finalize runs continue to use the normal medium-risk policy gate.

## History diff tooling

The repo now also provides a local diff entrypoint for comparing two agentic history snapshots:
- `npm run agentic:history:diff -- --current <path> --previous <path> --output <path>`
- `npm run agentic:history:summary -- --input <diff-path>`

That diff summarizes:
- added or removed bundles
- recommendation target changes per bundle
- execution status changes per bundle
- bundle selection changes per bundle
- validation decision changes
