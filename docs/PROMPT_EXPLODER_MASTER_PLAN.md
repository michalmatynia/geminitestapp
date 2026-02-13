# Prompt Exploder Master Plan

## Scope
Unify Prompt Exploder recognition, learning, governance, and operational quality into a single UI-driven workflow.

## Phases

1. Foundations (spec + benchmarks)
- Define benchmark prompt families and expected segment coverage.
- Add test gate for expected segment-type recall.
- Status: Completed.

2. Pattern System Governance
- Add pattern snapshot capture/restore in Prompt Exploder runtime UI.
- Provide rollback path for prompt-exploder-managed validator rules.
- Status: Completed.

3. Recognition Accuracy
- Improve heading detection and segment typing for markdown/bracket/module/numbered prompts.
- Keep explicit parser-locked sections stable while allowing hint-driven classification elsewhere.
- Status: Completed in current iteration.

4. Learning Lifecycle
- Add learned-template states: draft, candidate, active, disabled.
- Use approval thresholds + activation policy to control runtime participation.
- Status: Completed.

5. Authoring Operability
- Add matched-rule inspector and approval draft controls before committing learned rules.
- Status: Completed in current iteration.

6. Studio Integration
- Keep apply/reload bridge with Image Studio as single reassembly path.
- Status: Existing and active.

7. Observability + Quality Gates
- Surface segmentation metrics in UI.
- Add benchmark regression tests to protect recognition quality.
- Status: Completed.

8. Rollout Governance
- Add operational runbook and release gates based on benchmark stability.
- Status: Completed.

9. Robustness Expansion (Complex Prompt Families)
- Expand parser coverage for module-governed flows (`VALIDATION_MODULE`, `DRY_RUN_BEHAVIOR`) and operational headings (`DATA MODEL`, `LOGGING AND AUDIT`, `ERROR HANDLING`, `SECURITY NOTES`).
- Expand benchmark set using complex prompt families (automation modules, relight markdown variants, compositing prompts).
- Status: Completed in current iteration.

10. Pattern Intelligence Boost
- Extend Prompt Exploder pattern pack with explicit operational governance recognizers for `LOGGING_AND_AUDIT`, `ERROR_HANDLING`, and `SECURITY_NOTES`.
- Add regression + benchmark coverage for operations/audit/security prompt families.
- Status: Completed in current iteration.

11. Benchmark Operability and Auto-Suggestions
- Add benchmark suite controls (`default`, `extended`, `custom JSON`) in Prompt Exploder UI with persisted runtime settings.
- Add benchmark low-confidence suggestion pipeline that proposes validator regex rules and supports one-click pattern creation from benchmark findings.
- Status: Completed in current iteration.

12. Suggestion Triage Ergonomics
- Add operational controls for suggestion triage (`Add All Visible`, `Dismiss Visible`, per-item `Dismiss`, `Reset Dismissed`) to support high-volume benchmark runs.
- Ensure applied benchmark suggestions are persisted to validator learned-rules in batch with add/update accounting.
- Status: Completed in current iteration.

13. Custom Suite Authoring Flow
- Add one-click custom benchmark case creation from the current source prompt and inferred segment types.
- Enforce custom-suite validity at run/save time (custom suite cannot execute with zero cases).
- Status: Completed in current iteration.

14. Custom Suite Template Utilities
- Add quick actions in Prompt Exploder UI to load/append default and extended benchmark templates into custom suite JSON.
- Harden custom JSON parsing with duplicate ID detection and bounded `minSegments` validation.
- Status: Completed in current iteration.

15. Adaptive Learning Consolidation
- On manual approval, merge into an existing similar learned template (same segment type) instead of creating duplicate templates for near-identical headings.
- Aggregate anchor tokens + sample text when merging to improve fuzzy recognition coverage over time.
- Status: Completed in current iteration.

16. Fuzzy Learning Operability
- When applying benchmark suggestions, upsert learned templates in addition to learned regex rules.
- Re-run Prompt Exploder immediately after benchmark-suggestion apply to reflect new recognition behavior.
- Add “Similar Learned Templates” inspector in segment panel, including merge-threshold visibility.
- Status: Completed in current iteration.

## Quality Targets
- Benchmark expected-type recall >= 95%.
- No parser regressions across benchmark prompt families.
- Learned templates only affect runtime when governance conditions are met.
