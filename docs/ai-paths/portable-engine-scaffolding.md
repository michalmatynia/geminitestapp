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

## Core APIs

### Build/Serialize

- `buildPortablePathPackage(pathConfig, options)`
- `serializePortablePathPackage(pathConfig, options)`

### Resolve/Import

- `resolvePortablePathInput(payload, options)`

Accepted payloads:

- Portable package (`ai-paths.portable-engine.v1`)
- Semantic canvas document (`ai-paths.semantic-grammar.v1`)
- Raw `PathConfig` JSON

Resolver behavior:

- Normalizes legacy edge aliases (`source`/`target`, `sourceHandle`/`targetHandle`)
- Repairs canonical node identities by default
- Emits a normalized semantic canvas document for downstream portability

### Validate

- `validatePortablePathConfig(pathConfig)`
- `validatePortablePathInput(payload, options)`

Validation currently combines:

- Canonical identity checks
- Graph compile checks

### Run

- Client-safe: `runPortablePathClient(payload, options)`
- Server-only: `runPortablePathServer(payload, options)`

Both run methods support:

- `validateBeforeRun` (default `true`)
- `repairIdentities` (default `true`)
- `reportAiPathsError`

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

1. Add optional runtime preflight (`evaluateRunPreflight`) behind a strict mode flag.
2. Add JSON schema publish endpoint for external editors.
3. Add migration registry for future portable package versions (`v2+`).
