---
owner: 'Prompt Exploder Team'
last_reviewed: '2026-03-26'
status: 'active'
doc_type: 'runbook'
scope: 'feature:prompt-exploder'
canonical: true
---

# Prompt Exploder Operations Runbook

## Release Modes

- `internal`: use `runtime.ruleProfile = all`, learning enabled, benchmark tests required.
- `beta`: use `runtime.ruleProfile = pattern_pack` by default, enable learned templates progressively.
- `default`: use configured profile based on monitored benchmark stability.

## Runtime Controls

- Orchestrator runtime is controlled by Prompt Exploder settings (`runtime.orchestratorEnabled`).
- Rollout env overrides/canary toggles were removed in hard cutover.
- Validation stack resolution is strict:
  - unknown or unsupported stacks raise errors.
  - no runtime fallback recovery path is available.

Contract migration note:

- Stack IDs and bridge IDs are frozen to canonical hyphenated forms.
- Runtime no longer normalizes legacy snake_case/`studio` aliases.
- Legacy persistence migration path was retired after canonical cutover.

## Pre-Release Gates

1. Run:
   - `npx vitest run __tests__/features/prompt-exploder/parser.test.ts __tests__/features/prompt-exploder/benchmark.test.ts __tests__/features/prompt-exploder/settings.test.ts`
2. Ensure benchmark expected-type recall gate passes (>= 95%).
3. Run both `default` and `extended` benchmark suites before rollout; use `custom` suite for domain-specific prompts when needed.
4. Capture a Prompt Exploder pattern snapshot before rollout.

## Runtime Governance

- Keep learned templates in `candidate` until approved for `active`.
- Use `minApprovalsForMatching` and `autoActivateLearnedTemplates` to control activation.
- Review low-confidence benchmark suggestions and promote only validated rules to avoid overfitting.
- Use suggestion triage controls in the Benchmark panel to batch-apply validated suggestions and dismiss noisy ones before final rollout.
- For custom benchmark suite runs, ensure at least one valid custom case is defined before save/run.
- Prefer template quick-actions (`Use Default`, `Use Extended`, `Append Extended`) before manual JSON edits when bootstrapping custom suites.
- If regressions appear:
  1. Switch `runtime.ruleProfile` to `pattern_pack`.
  2. Restore previous snapshot.
  3. Demote suspicious templates to `disabled`.

## Runtime Health Monitoring

- Use `GET /api/prompt-runtime/health` for runtime status.
- Response includes:
  - `observability`: timings, counters, errors, SLO targets, health checks.
  - `parserCache`: keyed cache keys/stats and compile-circuit open scopes.
  - `selectionCache`: runtime selection cache size/keys and inflight prewarm count.
  - `load`: inflight runtime executions per scope.
- Response code:
  - `200`: runtime health is `ok` or `degraded`.
  - `503`: runtime health is `critical`.
- Use `GET /api/prompt-runtime/health?reset=true` only for incident recovery/testing.
  - This clears runtime observability state, parser cache, selection cache, and inflight load snapshot.

## SLO Targets

- `p95PipelineMs <= 120`
- `p95ExplodeMs <= 100`
- `p95CompileMs <= 40`
- `errorRate <= 0.5%`
- `fallbackRate <= 1%`
- Health status rules:
  - `ok`: zero failed checks.
  - `degraded`: one or two failed checks.
  - `critical`: three or more failed checks.

## Incident Playbooks

1. **Compile circuit opens repeatedly**

- Symptom: `runtime_circuit_break_open` counter increases, parser cache snapshot shows open scope.
- Actions:
  1. Check recently changed validator regex rules.
  2. Disable or fix unsafe/failing regex rules in active scope.
  3. Re-run health endpoint and verify circuit scope disappears after window.
  4. If needed, use `?reset=true` after rule correction to clear stale state.

2. **Backpressure drops increase**

- Symptom: `runtime_backpressure_drop` counter rises, users see “Runtime is busy for this scope.”
- Actions:
  1. Confirm inflight per scope in health `load` snapshot.
  2. Reduce trigger frequency (UI auto-reexplode loops, duplicate manual clicks).
  3. Temporarily disable `runtime.orchestratorEnabled` or switch profile to `pattern_pack`.

3. **Unexpected fallback signal**

- Symptom: `runtime_selection_fallback / runtime_selection_total` exceeds target.
- Actions:
  1. Confirm deployment includes strict stack resolver changes (fallback should remain at zero).
  2. Verify persisted settings/bridge payloads were migrated to canonical IDs.
  3. Inspect stale clients writing legacy values and force refresh/redeploy.

4. **Latency regression**

- Symptom: pipeline/explode/compile p95 above target.
- Actions:
  1. Confirm cache hit ratio (`runtime_cache_hit` vs `runtime_cache_miss`).
  2. Check recent pattern/rule churn causing invalidations.
  3. Temporarily disable `runtime.orchestratorEnabled` and/or switch profile to `pattern_pack`.
  4. Run benchmark suite before restoring rollout.

## Incident Recovery

1. Open Prompt Exploder admin page.
2. In `Pattern Snapshot Governance`, select last known stable snapshot.
3. Click `Restore`.
4. Re-run benchmark tests.
5. Re-enable runtime profile gradually.
6. Validate `/api/prompt-runtime/health` returns non-critical status before full rollout.
