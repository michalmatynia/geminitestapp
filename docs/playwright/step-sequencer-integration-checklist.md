---
owner: 'Platform Team'
last_reviewed: '2026-04-17'
status: 'active'
doc_type: 'reference'
scope: 'feature:playwright'
canonical: true
related_components:
  - 'src/features/playwright'
  - 'src/app/api/playwright'
---

# Playwright Step Sequencer history and code-preview integration checklist

Use this checklist when reviewing or extending the Playwright Step Sequencer run-history and semantic-code-preview work.

## Data retention

- Action-run records are persisted in MongoDB under the Playwright action-runs collection.
- Step records are persisted separately so long/nested runs do not require rewriting the whole action document.
- Each run stores an action-level code snapshot when generated.
- Each step stores a per-step code snapshot when generated.
- Retained snapshots are treated as historical evidence and should not be regenerated from current selector registry values.
- Runtime recorder failures should not fail the Playwright run itself.

## List page

- The action-runs page is available under the admin Playwright Step Sequencer area.
- The page uses the master folder tree list pattern.
- Runs are grouped by execution date.
- Each run expands into nested step records.
- Selecting a run shows action metadata, result, artifacts, logs, input, output, and retained action code.
- Selecting a step shows step metadata, selector data, input/output/error payloads, child steps, and retained step code.

## Filtering

- Search supports run IDs, action IDs, runtime keys, names, start URLs, and status-like text.
- Status filter supports queued/running/succeeded/failed/cancelled style values.
- Date filters narrow the historical run window.
- Action ID and runtime key filters support direct investigation.
- Selector profile filter supports registry-specific investigations.
- Cursor pagination should preserve the active filter set.

## Step preview

- Every normal step row should expose a code-preview action.
- Step-set rows should expose composed step-set code.
- Runtime action blocks should expose semantic placeholder previews where exact step definitions are not available.
- Action constructor should expose full action-sequence preview.
- Preview dialogs should show semantic code, resolved code, dynamic bindings, unresolved bindings, and preview source.
- Copy actions should be available for semantic and resolved code.

## Selector modularity

- Selector fields must remain dynamic bindings, not separate step types.
- A step can switch between local literal selector, selector registry binding, disabled selector, runtime variable, or computed binding.
- Disconnecting from the registry should preserve a useful local fallback selector where possible.
- Connecting to the registry should store selector key/profile metadata.
- Saving from the step editor should update an existing registry key override, not silently create unknown registry keys.
- The selector registry page remains the authoritative surface for broader registry management.

## Server APIs

- `POST /api/playwright/step-snippet` normalizes a single step preview.
- `POST /api/playwright/action-snippet` normalizes a full action sequence preview.
- `GET /api/playwright/action-runs` lists retained history.
- `GET /api/playwright/action-runs/:runId` returns retained run and step details.
- Frontend local generation is acceptable as a fallback, but server responses are the canonical normalized preview.

## Failure visibility

- Failed runs should identify the first failed step.
- Failed step details should expose error payloads and logs.
- Missing selector registry keys should produce warnings rather than hidden empty selectors.
- Unresolved dynamic bindings should be explicitly listed in previews and retained history.
- Preview source should distinguish server-generated, locally generated, retained, loading, and failed states.

## Future extension points

- Add registry key creation flow as a dedicated selector-registry feature.
- Add export-to-spec generation for retained action snapshots.
- Add diffing between retained snapshot selectors and current registry selectors.
- Add retention policy controls if action-run volume grows.
- Add per-run replay from retained step definitions once replay safety boundaries are defined.
