# Starter Workflow Authoring

Shipped AI Paths starter workflows must be authored as semantic canvas assets and registered through starter metadata.

Rules:

- Add new shipped workflows as `.canvas.json` semantic assets in `assets/`.
- Register metadata in `registry.ts`:
  - template identity and display fields
  - optional `seedPolicy`
  - optional `upgradePolicy`
  - optional trigger button presets
  - starter lineage metadata
- If a workflow belongs in the shipped canonical starter set, give it a canonical `defaultPathId`
  plus `seedPolicy.includeInCanonicalSeed: true`.
- If a workflow ships a trigger button preset plus a canonical `defaultPathId`, it should also
  use `seedPolicy.autoSeed: true` so the default path and button materialize together on fresh
  settings stores.
- Use `upgradePolicy` metadata for starter-specific overlay and replacement behavior. Do not branch
  on starter keys directly in upgrade code.
- Use the shared semantic materializer path. Do not build workflow graphs in TypeScript.
- Do not add workflow-specific server seed modules (`settings-store-<workflow>.ts`).
- Do not add workflow-specific runtime sanitizers or upgrader hooks keyed by workflow id/name.

Forward-only policy:

- Do not add starter workflow migration logic for historical graph/id/name shapes.
- Persisted starter configs must already use canonical shapes or fail validation paths that consume them.
