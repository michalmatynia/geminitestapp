---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'architecture'
scope: 'feature:playwright'
canonical: true
related_components:
  - 'src/features/playwright'
  - 'src/app/api/playwright/step-snippet'
  - 'src/app/api/playwright/action-snippet'
---

# Playwright step code previews and selector modularity

This document defines the intended contract for Playwright Step Sequencer code previews, modular dynamic fields, and selector registry connectivity.

## Goals

1. Every sequencer step can expose an onclick code preview.
2. The preview shows semantic Playwright code that is understandable before runtime values are resolved.
3. The preview also shows resolved Playwright code when values can be resolved from local literals, selector registry bindings, or fallbacks.
4. Dynamic step fields remain modular and can be connected to or disconnected from the selector registry without changing the step type.
5. Retained action-run history stores the code snapshot that was available at execution time, so old runs remain auditable even if registry values change later.

## Core model

Each step has three layers:

| Layer | Purpose | Example |
| --- | --- | --- |
| Step definition | Stable user-authored intent | `click checkout button` |
| Input bindings | Dynamic connection metadata | `selector -> selectorRegistry:checkout.submitButton` |
| Code snapshot | Generated Playwright representation | `await page.locator(selectors.checkout.submitButton).click();` |

The step remains modular because the action type and dynamic fields are separate. A `click` step does not become a different step when its selector is connected to the registry. Only the `inputBindings.selector` value changes.

## Binding modes

Supported binding modes:

| Mode | Meaning | Runtime behavior |
| --- | --- | --- |
| `literal` | Use the local step field directly | Emits concrete code such as `page.locator("#submit")` |
| `selectorRegistry` | Use a selector key/profile from registry | Emits semantic code such as `selectors.checkout.submitButton` and resolved fallback when available |
| `runtimeVariable` | Value is supplied by runtime input/context | Emits a variable reference and marks unresolved if no value is supplied |
| `computed` | Value is computed by orchestration logic | Emits a named computed expression where possible |
| `disabled` | Field is intentionally disconnected | Emits no selector/value access and records the disconnected state |

For selectors, the key fields are:

| Field | Purpose |
| --- | --- |
| `selector` | Local fallback or literal selector |
| `selectorKey` | Registry key, for example `checkout.submitButton` |
| `selectorProfile` | Registry profile, for example `default` or marketplace-specific profile |
| `inputBindings.selector` | Explicit connection/disconnection metadata |

## Code preview behavior

Single-step previews are generated from the shared step code preview utility and can be displayed in:

| Surface | Behavior |
| --- | --- |
| Step list table | Clicking the code action opens a single-step semantic preview |
| Step set row | Clicking code opens composed code for the step set |
| Action constructor | Clicking preview opens full action-sequence code |
| Action-run history | Stored snapshots show the exact semantic/resolved code retained at execution time |

Each preview should show:

1. Semantic code.
2. Resolved code when possible.
3. Dynamic bindings.
4. Unresolved bindings.
5. Selector registry connection status.
6. Copy actions for semantic and resolved code.

## Selector registry connect/disconnect UX

The step editor should expose selector connection as a reversible setting:

| Action | Expected result |
| --- | --- |
| Connect to registry | Sets `inputBindings.selector.mode = "selectorRegistry"` and stores key/profile metadata |
| Disconnect to local selector | Sets mode back to `literal` and keeps the last known selector as local fallback |
| Disable selector | Sets mode to `disabled` and prevents accidental selector resolution |
| Save fallback override | Updates the selector registry value for an existing seeded key |
| Use registry preview as fallback | Copies current registry selector into the local selector field |

The registry service currently supports saving overrides for existing seeded keys. Arbitrary new selector keys should be handled as a separate registry-management capability rather than silently created from the step editor.

## Action-run history retention

Action runs are retained in MongoDB with:

| Record | Retained code data |
| --- | --- |
| Action run | Full action-level semantic and resolved code snapshot |
| Action run step | Per-step semantic and resolved code snapshot |

History should prefer retained snapshots over live regeneration. This avoids rewriting history when selector registry entries are updated later.

If a retained snapshot has unresolved bindings, the history UI should show them explicitly so an operator can tell whether a run used a fallback, missed a selector registry value, or intentionally disconnected a field.

## Server/API boundary

The frontend can generate local previews for responsiveness, but server APIs should remain the canonical normalization point:

| API | Purpose |
| --- | --- |
| `POST /api/playwright/step-snippet` | Normalize one step and return a code snapshot plus warnings |
| `POST /api/playwright/action-snippet` | Normalize a full action sequence and return composed action code plus warnings |
| `GET /api/playwright/action-runs` | List retained action-run history |
| `GET /api/playwright/action-runs/:runId` | Return retained action and step snapshots |

The UI can fall back to local preview generation if snippet APIs fail, but it should label the preview source clearly.

## Implementation guardrails

1. Keep step execution logic separate from code-preview rendering.
2. Treat selector registry bindings as metadata, not as a new step type.
3. Store retained snapshots at execution time.
4. Do not mutate historical snapshots when live selector registry values change.
5. Surface unresolved bindings instead of hiding them.
6. Keep registry key creation separate from registry override saving.
7. Prefer shared code generation helpers over duplicating snippet templates in components.
