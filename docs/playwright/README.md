---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'index'
scope: 'feature:playwright'
canonical: true
---

# Playwright Docs

This directory holds feature-specific documentation for the Playwright admin
automation surfaces, especially the Step Sequencer run-history and code-preview
work.

## Current Docs

- [`action-run-history.md`](./action-run-history.md) — run-history surface,
  API, and runtime recording behavior
- [`action-run-history-schema.md`](./action-run-history-schema.md) — retained
  MongoDB data model and snapshot fields
- [`step-code-modularity.md`](./step-code-modularity.md) — code-preview,
  selector-registry, and dynamic-binding contract
- [`step-sequencer-integration-checklist.md`](./step-sequencer-integration-checklist.md) —
  extension/review checklist for the Step Sequencer surface

## Documentation Shape

This feature surface is intentionally split into:

- behavior and operator-facing runtime docs
- schema/reference docs
- implementation guardrails for code previews and selector modularity
- a review checklist for changes that span history, registry bindings, and
  preview generation

## Placement Rule

- Put Playwright feature docs here instead of adding new markdown files at the
  root `docs/` level.
- Cross-feature build or toolchain docs still belong under
  [`docs/build/`](../build/README.md).
- Repo-wide operational runbooks belong under [`docs/runbooks/`](../runbooks/README.md).

## Related Docs

- Repo docs index: [`../README.md`](../README.md)
- Build and toolchain hub: [`../build/README.md`](../build/README.md)
- AI Paths Playwright node reference: [`../ai-paths/playwright-node.md`](../ai-paths/playwright-node.md)
