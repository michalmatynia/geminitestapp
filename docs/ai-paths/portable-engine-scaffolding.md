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

Optional signed envelope:

```json
{
  "specVersion": "ai-paths.portable-engine.v1",
  "kind": "path_package_envelope",
  "signedAt": "2026-03-05T00:00:00.000Z",
  "package": {
    "specVersion": "ai-paths.portable-engine.v1",
    "kind": "path_package"
  },
  "signature": {
    "algorithm": "hmac_sha256",
    "value": "...",
    "keyId": "prod-key-1"
  }
}
```

## Core APIs

### Build/Serialize

- `buildPortablePathPackage(pathConfig, options)`
- `serializePortablePathPackage(pathConfig, options)`
- `buildPortablePathPackageEnvelope(packagePayload, options)` (async)
- `serializePortablePathPackageEnvelope(packagePayload, options)` (async)

### Resolve/Import

- `resolvePortablePathInput(payload, options)`
- `resolvePortablePathInputAsync(payload, options)`
- `migratePortablePathInput(payload, options)`

Accepted payloads:

- Portable package (`ai-paths.portable-engine.v1`)
- Signed portable package envelope (`kind: "path_package_envelope"`)
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
- Supports optional envelope signature verification on import:
  - `envelopeSignatureVerificationMode: "warn"` emits signature warnings and continues.
  - `envelopeSignatureVerificationMode: "strict"` blocks import on missing/mismatched/unsupported signatures.
  - For `hmac_sha256` envelope signatures in strict mode, use the async resolver path and pass `envelopeSignatureSecret`.
  - Key-id routing and rotation are supported via `envelopeSignatureSecretsByKeyId`, `envelopeSignatureFallbackSecrets`, and `envelopeSignatureKeyResolver`.
  - `signingPolicyProfile` defaults verification by surface profile:
    - `dev`: fingerprint `off`, envelope `off`
    - `staging`: fingerprint `warn`, envelope `warn`
    - `prod`: fingerprint `strict`, envelope `strict`
  - Explicit mode options still override profile defaults for controlled rollouts.
- Exposes signing policy usage observability APIs:
  - `getPortablePathSigningPolicyUsageSnapshot()`
  - `resetPortablePathSigningPolicyUsageSnapshot()`
  - `registerPortablePathSigningPolicyUsageHook(hook)` (returns unsubscribe)
  - Snapshot includes per-profile and per-surface (`canvas`/`product`/`api`) usage counters.
- Uses a migration registry keyed by portable package spec version (currently `v1` + `v2` compatibility shim).
- Exposes custom migration registry APIs:
  - `registerPortablePathPackageMigrator(specVersion, migrator)`
  - `unregisterPortablePathPackageMigrator(specVersion)` (built-ins protected)
  - `listPortablePathPackageMigratorVersions()`
- Exposes migrator observability APIs:
  - `getPortablePathMigratorObservabilitySnapshot()`
  - `resetPortablePathMigratorObservabilitySnapshot()`
  - `registerPortablePathMigratorObservabilityHook(hook)` (returns unsubscribe)
  - Snapshot includes version-level attempts/success/failure counts, source-path counts, and recent failure telemetry.
- Exposes envelope verification observability APIs:
  - `getPortablePathEnvelopeVerificationObservabilitySnapshot()`
  - `resetPortablePathEnvelopeVerificationObservabilitySnapshot()`
  - `registerPortablePathEnvelopeVerificationObservabilityHook(hook)` (returns unsubscribe)
  - Snapshot includes by-key-id verification status counts and recent outcome events to support rotation cutovers.
- Exposes envelope verification persistent sink adapter APIs:
  - `registerPortablePathEnvelopeVerificationAuditSink({ id, write })`
  - `unregisterPortablePathEnvelopeVerificationAuditSink(id)`
  - `listPortablePathEnvelopeVerificationAuditSinkIds()`
  - `getPortablePathEnvelopeVerificationAuditSinkSnapshot()`
  - `resetPortablePathEnvelopeVerificationAuditSinkSnapshot({ clearRegisteredSinks })`
  - Sink writes are failure-isolated and do not block path import/verification flow.
  - One-call bootstrap helpers:
    - `resolvePortablePathEnvelopeVerificationAuditSinkProfileFromEnvironment(nodeEnv?)`
    - `bootstrapPortablePathEnvelopeVerificationAuditSinks({ profile?, ... })`
    - `bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks({ profile?, healthChecks?, ... })`
    - `bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment({ env?, emitSystemLog? })`
  - Boot-time health diagnostics:
    - `runStartupHealthChecks({ policy: "off" | "warn" | "error", timeoutMs?, emitSystemLog? })`
    - Per-sink diagnostics include `healthy` / `failed` / `skipped` with duration and error.
    - `policy: "warn"` reports degraded startup without blocking; `policy: "error"` fails fast and rolls back sink registration.
  - Environment bootstrap controls:
    - `PORTABLE_PATH_AUDIT_SINK_BOOTSTRAP_ENABLED` (`true`/`false`)
    - `PORTABLE_PATH_AUDIT_SINK_PROFILE` (`dev`/`staging`/`prod`)
    - `PORTABLE_PATH_AUDIT_SINK_HEALTH_POLICY` (`off`/`warn`/`error`)
    - `PORTABLE_PATH_AUDIT_SINK_HEALTH_TIMEOUT_MS` (milliseconds)
  - Signing-policy + sink-health trend reporters:
    - `createPortablePathSigningPolicyTrendReporter({ ... })`
    - `bootstrapPortablePathSigningPolicyTrendReporterFromEnvironment({ startupHealthSummary? })`
    - Reporter logs trend snapshots and emits alerts for:
      - unexpected signing profile/surface drift
      - increasing envelope verification sink write failures
      - degraded/failed sink startup health summaries
  - Trend reporter environment controls:
    - `PORTABLE_PATH_SIGNING_POLICY_TREND_REPORTER_ENABLED` (`true`/`false`)
    - `PORTABLE_PATH_SIGNING_POLICY_TREND_REPORT_EVERY_USES` (minimum usage delta before report)
    - `PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_ENABLED` (`true`/`false`)
    - `PORTABLE_PATH_SIGNING_POLICY_TREND_PERSISTENCE_MAX_SNAPSHOTS` (capped retained history)
    - `PORTABLE_PATH_SIGNING_POLICY_DRIFT_ALERT_LEVEL` (`off`/`warn`/`error`)
    - `PORTABLE_PATH_AUDIT_SINK_FAILURE_ALERT_LEVEL` (`off`/`warn`/`error`)
    - `PORTABLE_PATH_SIGNING_POLICY_ALLOWED_PROFILES_BY_SURFACE` (JSON map for per-surface profile allowlist)
  - Snapshot persistence APIs:
    - `loadPortablePathSigningPolicyTrendSnapshots({ maxSnapshots? })`
    - `appendPortablePathSigningPolicyTrendSnapshot(snapshot, { maxSnapshots? })`
    - Snapshots are stored in `settings` under key `ai_paths_portable_signing_policy_trend_history_v1`.
  - Startup health auto-remediation APIs:
    - `loadPortablePathAuditSinkStartupHealthState()`
    - `savePortablePathAuditSinkStartupHealthState(state)`
    - `runPortablePathAuditSinkAutoRemediation(summary, { ... })`
    - Repeated `degraded`/`failed` startup health outcomes can trigger `unregister_all` remediation.
  - Auto-remediation environment controls:
    - `PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_ENABLED` (`true`/`false`)
    - `PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_THRESHOLD` (consecutive degraded/failed startups before remediation)
    - `PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_STRATEGY` (`none` | `unregister_all` | `degrade_to_log_only`)
  - Built-in server sink factories:
    - `createPortablePathEnvelopeVerificationLogForwardingSink(...)`
    - `createPortablePathEnvelopeVerificationPrismaSink(...)`
    - `createPortablePathEnvelopeVerificationMongoSink(...)`

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
- `signingPolicyProfile` (`dev` | `staging` | `prod`)
- `limits` / `enforcePayloadLimits`
- `fingerprintVerificationMode` (`off` | `warn` | `strict`)
- `envelopeSignatureVerificationMode` (`off` | `warn` | `strict`)
- `envelopeSignatureSecret` (base secret for strict `hmac_sha256` envelope verification)
- `envelopeSignatureSecretsByKeyId` (key-id to secret map for routed verification)
- `envelopeSignatureFallbackSecrets` (ordered fallback secrets for key rotation overlap)
- `envelopeSignatureKeyResolver` (custom resolver callback for dynamic key lookup)

### Fingerprinting

- `computePortablePathFingerprint(payload)` (async)
- `addPortablePathPackageFingerprint(package)` (async)

These allow stable package integrity tagging across copy/paste surfaces.

### Schema Publishing

- API: `GET /api/ai-paths/portable-engine/schema`
- Optional query: `kind=all|portable_envelope|portable_package|semantic_canvas|path_config` (default `all`)
- Diff API: `GET /api/ai-paths/portable-engine/schema/diff`
- Diff query: `kind=all|portable_envelope|portable_package|semantic_canvas|path_config` (default `all`)
- Trend snapshot API: `GET /api/ai-paths/portable-engine/trend-snapshots`
- Trend snapshot query:
  - `limit=1..500` (default `50`)
  - `trigger=manual|threshold` (optional)
  - `from=<ISO timestamp>` (optional)
  - `to=<ISO timestamp>` (optional)
- Trend snapshot response includes:
  - persisted signing-policy trend snapshots
  - aggregate drift/sink-failure summary
  - applied filter metadata + matched snapshot count
  - auto-remediation runtime config + persisted remediation state
- Cache support: deterministic `ETag` + `If-None-Match` (`304 Not Modified`) with private SWR cache headers.
- CI guardrail: `npm run ai-paths:check:portable-schema-diff -- --strict`
  - Uses `scripts/ai-paths/portable-schema-diff-allowlist.json`.
  - Unallowlisted schema hash changes are treated as breaking until reviewed.
  - Strict mode requires governance metadata on active allowlist entries:
    - `governance.owner`
    - `governance.ticket`
    - `governance.approvedAt` (ISO date)
  - Placeholder governance values (for example `TODO:*`) are treated as missing in strict mode.
- Pre-commit helper: `npm run ai-paths:check:portable-schema-diff:suggest`
  - Prints auto-generated allowlist entry suggestions for unexpected schema hash changes.
  - Suggestions include governance scaffolding placeholders that must be replaced before strict CI passes.
  - Suggestions default to `breakRisk: "breaking"` and require explicit human review before merge.

Response includes canonical JSON Schema (Draft 2020-12) generated from runtime Zod contracts, suitable for external editor validation.
Diff response includes per-kind deterministic schema hashes (`current` vs `vnext_preview`) to support tooling upgrade checks.

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

Server sink registration example:

```ts
import {
  createPortablePathEnvelopeVerificationPrismaSink,
  registerPortablePathEnvelopeVerificationAuditSink,
} from '@/shared/lib/ai-paths/portable-engine/server';

registerPortablePathEnvelopeVerificationAuditSink(
  createPortablePathEnvelopeVerificationPrismaSink()
);
```

Server sink bootstrap example:

```ts
import {
  bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks,
} from '@/shared/lib/ai-paths/portable-engine/server';

await bootstrapPortablePathEnvelopeVerificationAuditSinksWithStartupHealthChecks({
  // defaults from NODE_ENV when omitted
  profile: 'staging',
  healthChecks: {
    policy: 'error',
  },
});
```

Server sink environment bootstrap example:

```ts
import {
  bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment,
} from '@/shared/lib/ai-paths/portable-engine/server';

await bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment();
```

Server trend reporter bootstrap example:

```ts
import {
  bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment,
  bootstrapPortablePathSigningPolicyTrendReporterFromEnvironment,
} from '@/shared/lib/ai-paths/portable-engine/server';

const sinkBootstrap = await bootstrapPortablePathEnvelopeVerificationAuditSinksFromEnvironment();
await bootstrapPortablePathSigningPolicyTrendReporterFromEnvironment({
  startupHealthSummary: sinkBootstrap.startupHealthSummary,
});
```

## Next Hardening Steps

1. Add alert fan-out integrations (webhook/email) for auto-remediation trigger events.
2. Add per-strategy cooldown/rate limiting to prevent repeated remediation flapping during unstable startups.
3. Add trend snapshot cursor pagination for large historical windows beyond single-request cap.
