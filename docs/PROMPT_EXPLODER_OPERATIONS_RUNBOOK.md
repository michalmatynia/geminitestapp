# Prompt Exploder Operations Runbook

## Release Modes
- `internal`: use `runtime.ruleProfile = all`, learning enabled, benchmark tests required.
- `beta`: use `runtime.ruleProfile = pattern_pack` by default, enable learned templates progressively.
- `default`: use configured profile based on monitored benchmark stability.

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

## Incident Recovery
1. Open Prompt Exploder admin page.
2. In `Pattern Snapshot Governance`, select last known stable snapshot.
3. Click `Restore`.
4. Re-run benchmark tests.
5. Re-enable runtime profile gradually.
