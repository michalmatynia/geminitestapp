# Prompt Exploder Master Plan

Related docs:

- `docs/PROMPT_EXPLODER_FEATURE_DOCUMENTATION.md`
- `docs/PROMPT_EXPLODER_TOOLTIP_GUIDE.md`

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

17. Learning Threshold Controls

- Add explicit `templateMergeThreshold` learning setting with UI control and persisted schema value.
- Use configured merge threshold for both manual approvals and benchmark-suggestion template upserts.
- Status: Completed in current iteration.

18. Suggestion Learning Mode Controls

- Add explicit toggle to control whether benchmark suggestion apply should also upsert learned templates.
- Support rule-only suggestion apply mode while preserving immediate re-run feedback.
- Status: Completed in current iteration.

19. Rule Variant Preservation

- Preserve prior learned regex coverage by merging new approved/suggested regexes with existing rule patterns instead of destructive overwrite.
- Keep existing learned rule metadata (sequence/similar hints) stable on updates.
- Status: Completed in current iteration.

20. Regex Merge Normalization

- Move regex merge logic to dedicated Prompt Exploder utility with top-level alternation flattening and dedupe.
- Add targeted unit tests to protect escaped literal/class handling and variant normalization behavior.
- Status: Completed in current iteration.

21. Manual Merge Targeting Controls

- Add approval-time template merge mode controls (`auto`, `force new`, `selected target`) for operator-directed learning behavior.
- Expose one-click target selection directly from similar-template candidates.
- Status: Completed in current iteration.

22. Merge Target UX Guardrails

- Auto-heal merge-target selection when segment type or merge mode changes to avoid stale target IDs.
- Fall back to `auto` merge mode when no valid target exists for the selected type.
- Status: Completed in current iteration.

23. Learning Decision Unification

- Extract template-learning merge/upsert decisions into a shared Prompt Exploder utility and use it in both manual approval and benchmark suggestion flows.
- Add unit tests for merge modes (`auto`, `force new`, `selected target`) and similarity-driven upsert behavior.
- Status: Completed in current iteration.

24. Learned Rule Upsert Unification

- Extract regex learned-rule merge/upsert logic into a shared Prompt Exploder utility and use it in both manual approval and benchmark suggestion rule-apply paths.
- Add unit tests for pattern merge behavior and metadata preservation when updating existing learned rules.
- Status: Completed in current iteration.

25. Runtime Re-Explode Unification

- Extract post-learning runtime refresh/re-explode logic into shared Prompt Exploder utilities (rule selection, template selection, and segment re-selection strategy).
- Reuse the same runtime refresh path for manual approval and benchmark suggestion apply flows.
- Status: Completed in current iteration.

26. Learned Rule Draft Factory Unification

- Extract Prompt Exploder learned regex-rule draft construction into shared utilities and reuse them for both manual approval and benchmark suggestion flows.
- Add tests for draft defaults and numeric clamp behavior to keep generated validator rules consistent.
- Status: Completed in current iteration.

27. Benchmark Suggestion Intake Normalization

- Extract benchmark suggestion dedupe and regex-validity filtering into shared utilities for deterministic ingestion behavior.
- Add tests for duplicate handling and invalid-pattern filtering before rule-apply flow.
- Status: Completed in current iteration.

28. Benchmark Apply Engine Unification

- Extract benchmark suggestion apply loop (rule upsert, optional template upsert, and add/update accounting) into a shared Prompt Exploder utility.
- Add tests covering merged-rule updates and template-touch tracking in benchmark apply flow.
- Status: Completed in current iteration.

29. Custom Benchmark Case Utility Extraction

- Extract custom benchmark case parse/upsert/merge/default-id logic into shared Prompt Exploder utilities used by the admin page.
- Add tests for parse validation errors, min-segment clamping, and deterministic case-id/dedupe behavior.
- Status: Completed in current iteration.

30. Snapshot Governance Utility Extraction

- Extract pattern snapshot create/append/remove and snapshot-restore rule-merge normalization into shared Prompt Exploder utilities.
- Add tests for snapshot naming/retention behavior and restored-rule scope normalization.
- Status: Completed in current iteration.

31. Manual Binding Utility Extraction

- Extract manual binding normalization/validation/build logic (segment/subsection resolution and endpoint guardrails) into shared Prompt Exploder utilities.
- Add tests for binding-id resolution, subsection validity cleanup, same-endpoint protection, and successful binding construction.
- Status: Completed in current iteration.

32. Prompt Library Workflow Consolidation

- Extend Prompt Exploder prompt-library utilities to cover item build/upsert/remove, document hydration, and manual-binding extraction.
- Reuse these utilities in admin page save/load/delete handlers and expand prompt-library tests for those workflows.
- Status: Completed in current iteration.

## Quality Targets

- Benchmark expected-type recall >= 95%.
- No parser regressions across benchmark prompt families.
- Learned templates only affect runtime when governance conditions are met.
