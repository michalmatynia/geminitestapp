---
owner: 'AI Paths Team'
last_reviewed: '2026-03-09'
status: 'active'
doc_type: 'reference'
scope: 'feature:ai-paths'
canonical: true
---

# AI Paths Playwright Node

## Purpose

`playwright` is a programmable AI Paths node for browser automation.  
It executes a user-authored Playwright script, can inherit fidelity defaults from a Playwright Persona, and emits structured outputs/artifacts back into the workflow graph.

## Central Docs + JSON Equivalent

- Human-readable node documentation: `docs/ai-paths/playwright-node.md`
- JSON semantic grammar spec: `docs/ai-paths/semantic-grammar/nodes/playwright.json`
- Tooltip catalog entries: `docs/ai-paths/tooltip-catalog.json`

## Runtime Model

1. Runtime handler enqueues a Playwright run via API.
2. Node waits for completion (`waitForResult=true`) or returns queued metadata immediately (`waitForResult=false`).
3. On completion, node emits:
   - `result`
   - `value`
   - `bundle`
   - `status`
   - `jobId`
4. `bundle.artifacts` contains artifact metadata and download URLs.

## Persona-Driven Fidelity

- `playwright.personaId` selects a saved Playwright Persona.
- Persona settings are merged with:
  - `playwright.settingsOverrides`
  - `playwright.launchOptionsJson`
  - `playwright.contextOptionsJson`
- Effective fidelity control includes headless mode, delays, timeouts, proxy, and device emulation.

## Script Contract

The script must export a default async function:

```ts
export default async function run({
  browser,
  context,
  page,
  input,
  emit,
  artifacts,
  log,
  helpers,
}) {
  // ...
}
```

Context API:

- `input`: merged node inputs (by port name)
- `emit(port, value)`: publishes output ports
- `artifacts.screenshot(name?)`: saves PNG, returns relative path
- `artifacts.html(name?)`: saves HTML, returns relative path
- `artifacts.json(name, value)`: saves JSON, returns relative path
- `artifacts.add(name, value)`: stores inline artifact metadata
- `log(...args)`: appends run logs
- `helpers.sleep(ms)`: async delay helper

## Built-In Script Templates

The Playwright node config UI includes a template picker with reusable script starters:

- `Title Extractor`
- `Link Crawler`
- `Form Fill + Submit`
- `Visual Audit`

Template source:

- `src/shared/lib/ai-paths/core/playwright/script-templates.ts`

## Config Surface

Primary config keys:

- `playwright.personaId`
- `playwright.script`
- `playwright.waitForResult`
- `playwright.timeoutMs`
- `playwright.browserEngine` (`chromium|firefox|webkit`)
- `playwright.startUrlTemplate`
- `playwright.launchOptionsJson` (must be a JSON object)
- `playwright.contextOptionsJson` (must be a JSON object)
- `playwright.settingsOverrides` (validated partial Persona settings)
- `playwright.capture.screenshot`
- `playwright.capture.html`
- `playwright.capture.video`
- `playwright.capture.trace`

For canonical defaults and config schema, see:

- `src/shared/lib/ai-paths/core/playwright/default-config.ts`
- `src/shared/contracts/ai-paths.ts`

## Artifact Access

Artifact files are served by secured AI Paths endpoints:

- Enqueue: `POST /api/ai-paths/playwright`
- Poll: `GET /api/ai-paths/playwright/:runId`
- Artifact: `GET /api/ai-paths/playwright/:runId/artifacts/:file`

Access controls:

- AI Paths access required
- action/poll/artifact rate limits
- run ownership enforcement (unless elevated/internal)
- filename/path sanitization and run-root confinement

## Security and Robustness Notes

- Outbound URL policy is enforced for browser requests.
- `startUrl` is policy-validated before navigation.
- Run state and artifacts are persisted per run under `tmp/ai-paths-playwright-runs/`.
- Artifact retrieval validates:
  - run existence
  - ownership
  - artifact membership in run state
  - resolved path containment within run directory
