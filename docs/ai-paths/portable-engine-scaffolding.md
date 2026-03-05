# AI-Paths Portable Engine Scaffolding (v1)

## Goal

Allow a workflow to be copied as JSON from one surface and executed in another surface without rebuilding nodes manually.

This scaffold introduces a portable package wrapper around semantic canvas JSON and a runtime-facing resolver/validator.

## Implemented Module

- `src/shared/lib/ai-paths/portable-engine/index.ts`
- `src/shared/lib/ai-paths/portable-engine/server.ts`

## Portable Package Contract

`specVersion`: `ai-paths.portable-engine.v1`

```json
{
  "specVersion": "ai-paths.portable-engine.v1",
  "kind": "path_package",
  "createdAt": "2026-03-05T00:00:00.000Z",
  "pathId": "path_abc123",
  "name": "My Path",
  "document": {
    "specVersion": "ai-paths.semantic-grammar.v1",
    "kind": "canvas"
  },
  "metadata": {}
}
```

Optional fingerprint:

```json
{
  "fingerprint": {
    "algorithm": "sha256",
    "value": "..."
  }
}
```

## Core APIs

### Build/Serialize

- `buildPortablePathPackage(pathConfig, options)`
- `serializePortablePathPackage(pathConfig, options)`

### Resolve/Import

- `resolvePortablePathInput(payload, options)`
- `resolvePortablePathInputAsync(payload, options)`
- `migratePortablePathInput(payload, options)`

Accepted payloads:

- Portable package (`ai-paths.portable-engine.v1`)
- Semantic canvas document (`ai-paths.semantic-grammar.v1`)
- Raw `PathConfig` JSON

Resolver behavior:

- Normalizes legacy edge aliases (`source`/`target`, `sourceHandle`/`targetHandle`)
- Repairs canonical node identities by default
- Applies payload safety guardrails (size, depth, key safety)
- Rejects circular/non-serializable object payloads before migration
- Applies graph limits (node/edge maximums)
- Enforces `maxPayloadBytes` for both JSON-string inputs and object inputs
- Emits a normalized semantic canvas document for downstream portability
- Emits migration warnings when legacy formats are upgraded to package `v1`
- Supports optional fingerprint verification on import:
  - `fingerprintVerificationMode: "warn"` emits import warnings and continues.
  - `fingerprintVerificationMode: "strict"` blocks import on missing/mismatched/unsupported fingerprints.
  - For `sha256` fingerprints in strict mode, use the async resolver path for runtime-backed verification.
- Uses a migration registry keyed by portable package spec version (currently `v1` + `v2` compatibility shim).

### Validate

- `validatePortablePathConfig(pathConfig)`
- `validatePortablePathInput(payload, options)`

Validation currently combines:

- Canonical identity checks
- Graph compile checks
- Optional strict run preflight checks (`mode: "strict"`)

### Run

- Client-safe: `runPortablePathClient(payload, options)`
- Server-only: `runPortablePathServer(payload, options)`

Both run methods support:

- `validateBeforeRun` (default `true`)
- `validationMode` (`standard` or `strict`)
- `repairIdentities` (default `true`)
- `reportAiPathsError`
- `limits` / `enforcePayloadLimits`
- `fingerprintVerificationMode` (`off` | `warn` | `strict`)

### Fingerprinting

- `computePortablePathFingerprint(payload)` (async)
- `addPortablePathPackageFingerprint(package)` (async)

These allow stable package integrity tagging across copy/paste surfaces.

### Schema Publishing

- API: `GET /api/ai-paths/portable-engine/schema`
- Optional query: `kind=all|portable_package|semantic_canvas|path_config` (default `all`)

Response includes canonical JSON Schema (Draft 2020-12) generated from runtime Zod contracts, suitable for external editor validation.

## Example Usage

```ts
import {
  buildPortablePathPackage,
  runPortablePathClient,
  resolvePortablePathInput,
} from '@/shared/lib/ai-paths/portable-engine';

const portable = buildPortablePathPackage(pathConfig, {
  workspace: 'products',
  exporterVersion: 'v1',
});

const parsed = resolvePortablePathInput(portable);
if (!parsed.ok) throw new Error(parsed.error);

const run = await runPortablePathClient(portable, {
  validateBeforeRun: true,
});
```

Server:

```ts
import { runPortablePathServer } from '@/shared/lib/ai-paths/portable-engine/server';
```

## Next Hardening Steps

1. Add schema endpoint caching headers / ETag for editor-side cache-friendly polling.
2. Add signed package envelope option for tamper-evident cross-surface sharing.
3. Add compatibility test matrix for custom registered migrators.
