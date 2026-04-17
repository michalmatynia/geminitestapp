---
owner: 'AI Paths Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'feature:ai-paths'
canonical: true
---

# AI Paths Folder Index

This directory holds the maintained AI Paths documentation hub plus deeper
feature references, generated artifacts, semantic grammar docs, manifests,
catalogs, and dated plans.

## Open This Hub When

- you need to decide which AI Paths doc is current and which dated file is just retained history
- you are changing path execution, portable-engine validation, queue behavior, or Playwright nodes
- you need the canonical validation and documentation regeneration commands
- you need to understand where AI Paths runtime code, UI code, and API surfaces live

## Canonical Entry Points

- High-level overview: [`./overview.md`](./overview.md)
- Extended reference: [`./reference.md`](./reference.md)
- Semantic grammar hub: [`./semantic-grammar/README.md`](./semantic-grammar/README.md)
- Resume vs handoff operator policy: [`../platform/ai-paths-resume-vs-handoff.md`](../platform/ai-paths-resume-vs-handoff.md)

## Which Doc To Use

| Question | Canonical doc |
| --- | --- |
| What is AI Paths and where is the code? | [`./overview.md`](./overview.md) |
| How should operators change, test, and roll out paths? | [`./reference.md`](./reference.md) |
| What is the node and port contract? | [`./semantic-grammar/README.md`](./semantic-grammar/README.md) |
| How do path runs behave under lease contention? | [`../platform/ai-paths-resume-vs-handoff.md`](../platform/ai-paths-resume-vs-handoff.md) |
| How does the Playwright node work? | [`./playwright-node.md`](./playwright-node.md) |
| How do parameter inference and portable engine flows work? | [`./parameter-inference-workflow.md`](./parameter-inference-workflow.md), [`./portable-engine-receiver-runbook.md`](./portable-engine-receiver-runbook.md) |

## Curated Deep Entry Points

Maintained operator/runtime references:

- Parameter inference workflow: [`./parameter-inference-workflow.md`](./parameter-inference-workflow.md)
- Portable engine receiver runbook: [`./portable-engine-receiver-runbook.md`](./portable-engine-receiver-runbook.md)
- Playwright node reference: [`./playwright-node.md`](./playwright-node.md)

Retained planning and transition baselines:

- Improvement plan baseline: [`./ai-paths-improvements-plan-2026-03-06.md`](./ai-paths-improvements-plan-2026-03-06.md)
- Modernization playbook: [`./ai-paths-modernization-playbook-2026-03-04.md`](./ai-paths-modernization-playbook-2026-03-04.md)
- Kernel transition plan: [`./kernel-engine-transition-plan-2026-03-05.md`](./kernel-engine-transition-plan-2026-03-05.md)

Retained sprint execution artifacts:

- Sprint 1 execution brief: [`./ai-paths-v1-sprint-1-execution-brief-2026-03-06.md`](./ai-paths-v1-sprint-1-execution-brief-2026-03-06.md)
- Sprint 1 implementation checklist: [`./ai-paths-v1-sprint-1-implementation-checklist-2026-03-06.md`](./ai-paths-v1-sprint-1-implementation-checklist-2026-03-06.md)
- Sprint 1 test plan: [`./ai-paths-v1-sprint-1-test-plan-2026-03-06.md`](./ai-paths-v1-sprint-1-test-plan-2026-03-06.md)

Treat those dated plan and sprint files as retained delivery history. Do not use
them as the default operator or implementation entrypoint when `overview.md`,
`reference.md`, or the semantic grammar hub already covers the current behavior.

## Node And Runtime References

- Node code objects v2 hub: [`./node-code-objects-v2/README.md`](./node-code-objects-v2/README.md)
- Node code objects v3 overview: [`./node-code-objects-v3.md`](./node-code-objects-v3.md)
- Node code objects v3 hub: [`./node-code-objects-v3/README.md`](./node-code-objects-v3/README.md)
- Node code objects v3 node sheets: [`./node-code-objects-v3/nodes/README.md`](./node-code-objects-v3/nodes/README.md)
- Node code objects v3 migration guide: [`./node-code-objects-v3/MIGRATION_GUIDE.md`](./node-code-objects-v3/MIGRATION_GUIDE.md)
- Playwright node reference: [`./playwright-node.md`](./playwright-node.md)
- Tooltip schema: [`./tooltip-schema-v1.md`](./tooltip-schema-v1.md)

## Active Validation And Generation Entry Points

- Canonical validation lane: `npm run ai-paths:check:canonical`
- Node docs verify lane: `npm run docs:ai-paths:node-docs:verify`
- Tooltip coverage check: `npm run docs:ai-paths:tooltip:check`
- Semantic grammar check: `npm run docs:ai-paths:semantic:check`

## Structural Rule

- `README.md`, `overview.md`, and `reference.md` are the maintained canonical
  hub docs for AI Paths.
- Prefer adding stable runtime guidance to those canonical docs before creating
  another dated AI Paths markdown file.
- Put feature-specific deep docs, plans, generated artifacts, and references in
  this folder rather than creating new root-level AI Paths docs.
- This hub is intentionally curated, not a full listing of every dated artifact
  in the folder. Add new stable entry points here when they become part of the
  active AI Paths documentation surface.
- When a dated design or sprint document is retained here, it should say so
  explicitly near the top and point back to `overview.md` and `reference.md`.
- Retained sprint plans, checklists, and execution briefs should be treated as
  delivery-history records, not as the current operator or QA entrypoint.
