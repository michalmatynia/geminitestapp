# Playwright Action Run History

The Playwright Step Sequencer run-history surface is available at:

`/admin/playwright/step-sequencer/runs`

It reads retained run data from MongoDB and presents it with the shared Master Folder Tree UI. The tree groups runs by date, lists each action run, and expands the selected run into recorded or planned step nodes.

## Mongo Collections

`playwright_action_runs`

Stores one document per Playwright engine run. Records include run status, action identity, runtime key, selector profile, instance metadata, request summary, result payload, artifacts, logs, and timestamps.

`playwright_action_run_steps`

Stores the detailed step timeline for a run. Runtime result steps are preferred. If a run has no result steps yet, the recorder builds planned step rows from request payload fields such as `action`, `blocks`, `actionBlocks`, `stepSets`, and `steps`.

## API

`GET /api/playwright/action-runs`

Lists retained run summaries. Supported query parameters:

`status`, `actionId`, `runtimeKey`, `selectorProfile`, `instanceKind`, `query`, `limit`, `cursor`

`GET /api/playwright/action-runs/:runId`

Returns one retained run and its step records.

## Runtime Recording

The Playwright engine runner mirrors queue, update, completion, and failure state into Mongo. This is intentionally non-blocking: recorder failures are captured through the error system and do not fail the browser automation run.

Step timing comes from `StepTracker` when runtime steps are emitted. Planned rows are marked `pending` until runtime output supplies concrete status, timing, messages, and artifacts.
