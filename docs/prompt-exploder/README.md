---
owner: 'Prompt Exploder Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'feature:prompt-exploder'
canonical: true
---

# Prompt Exploder Documentation

This folder is the maintained documentation home for Prompt Exploder.

## Open This Hub When

- you are changing Prompt Exploder behavior, operations, or tooltip-backed documentation
- another feature hands prompt payloads into Prompt Exploder and you need the owning docs
- you need to know which Prompt Exploder file is current operator guidance versus retained planning history

## Canonical entry points

- Overview: [`./overview.md`](./overview.md)
- Operations runbook: [`./operations-runbook.md`](./operations-runbook.md)
- Tooltip system guide: [`./tooltip-guide.md`](./tooltip-guide.md)

## Which Doc To Use

| Question | Canonical doc |
| --- | --- |
| What is Prompt Exploder and what does it own? | [`overview.md`](./overview.md) |
| How should operators run or troubleshoot it? | [`operations-runbook.md`](./operations-runbook.md) |
| How do tooltip and documentation-backed text surfaces work? | [`tooltip-guide.md`](./tooltip-guide.md) |

## Supporting historical records

These files are useful context but are not the primary runtime truth:

- [`./master-plan.md`](./master-plan.md)
- [`./migration-plan-2026-03-04.md`](./migration-plan-2026-03-04.md)

Treat those plan docs as retained design history. Do not use them as the
default runtime or operator entrypoint when the overview or runbook already
covers the current behavior.

## Documentation rule

- Add maintained Prompt Exploder docs in this folder.
- Link other repo docs here instead of creating duplicate Prompt Exploder hubs elsewhere.
- Treat the overview and runbook in this folder as the live operator reference, and treat the plan docs as historical design records.
