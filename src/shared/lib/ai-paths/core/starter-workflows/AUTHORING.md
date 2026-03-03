# Starter Workflow Authoring

Shipped AI Paths starter workflows must be authored as semantic canvas assets and registered through starter metadata.

Rules:

- Add new shipped workflows as `.canvas.json` semantic assets in `assets/`.
- Register metadata in `registry.ts`:
  - template identity and display fields
  - optional `seedPolicy`
  - optional trigger button presets
  - starter lineage metadata
- Use the shared semantic materializer path. Do not build workflow graphs in TypeScript.
- Do not add workflow-specific server seed modules (`settings-store-<workflow>.ts`).
- Do not add workflow-specific runtime sanitizers or upgrader hooks keyed by workflow id/name.

Compatibility policy:

- Legacy shipped workflow upgrades must be implemented in generic starter migration logic.
- Deprecated maintenance action ids may be accepted as aliases temporarily, but maintenance reports must emit generic action ids only.
