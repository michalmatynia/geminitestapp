---
owner: 'Prompt Exploder Team'
last_reviewed: '2026-03-09'
status: 'superseded'
doc_type: 'plan'
scope: 'feature:prompt-exploder'
superseded_by: 'docs/prompt-exploder/master-plan.md'
---

# Deprecated Location

The canonical Prompt Exploder master plan moved to:

- `docs/prompt-exploder/master-plan.md`

Please update references to the new path.

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

33. Contract Freeze + Legacy Baseline Telemetry

- Freeze canonical Prompt Exploder stack/bridge identifiers and publish migration mapping.
- Add runtime counters for legacy stack alias usage, fallback usage, bridge alias normalization, and strict-mode retry fallback path.
- Status: Completed in current iteration.

34. Persistence Contract Migration Utility + Script

- Add Prompt Exploder persisted-settings migration utility for stack/scope/bridge canonicalization.
- Add provider-aware DB script with dry-run/apply modes and per-key migration reporting.
- Status: Completed in current iteration.

## Quality Targets

- Benchmark expected-type recall >= 95%.
- No parser regressions across benchmark prompt families.
- Learned templates only affect runtime when governance conditions are met.
