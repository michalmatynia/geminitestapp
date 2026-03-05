# Portable Engine Receiver Runbook

## Scope

This runbook covers inbound auto-remediation webhooks emitted by the AI-Paths portable engine:

- Webhook channel (`PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_WEBHOOK_URL`)
- Email-relay webhook channel (`PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_EMAIL_WEBHOOK_URL`)

Use it when signatures fail, requests appear delayed, or replay protection blocks expected deliveries.

## Required Validation

Validate all of the following before accepting a request:

1. `x-ai-paths-signature` exists and starts with `v1=`.
2. `x-ai-paths-signature-timestamp` is parseable ISO-8601.
3. `x-ai-paths-signature-algorithm` is `hmac_sha256`.
4. Signature is recomputed from `${timestamp}.${rawBody}` and compared via constant-time equality.

Reject the request if any check fails.

Reusable helper:

- `verifyPortablePathWebhookSignature(...)` in `src/shared/lib/ai-paths/portable-engine/receiver-signature.ts`
- Automated skew/replay coverage: `src/shared/lib/ai-paths/portable-engine/__tests__/portable-engine-receiver-signature.test.ts`
- Receiver handler wiring coverage: `src/app/api/ai-paths/portable-engine/remediation-webhook/handler.test.ts`

## Timestamp Skew Guard

Apply a strict timestamp skew window to prevent delayed or captured payload reuse.

- Recommended: `maxSkewSeconds = 300` (5 minutes).
- Reject when `abs(now - signatureTimestamp) > maxSkewSeconds`.
- Emit structured logs with:
  - receiver clock (`now`)
  - received timestamp
  - skew seconds
  - signature key-id (if present)

If skew rejections spike, verify host NTP health before widening tolerance.

## Replay Protection

Prevent same-signature replay within the accepted skew window.

1. Build replay key: `sha256(signatureHeader + ":" + timestampHeader)`.
2. Store key in short-lived cache (Redis/in-memory distributed cache).
3. TTL should be at least `maxSkewSeconds`.
4. Reject if key already exists.

Do not trust payload ids alone for replay defense.

## AI-Paths Replay Policy Alignment

Portable-engine dead-letter replay policy should align with receiver protections:

- `PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_WINDOW_SECONDS`
  - keeps replays bounded to recent dead-letter entries.
- `PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ENDPOINT_ALLOWLIST`
  - blocks replay delivery to endpoints outside approved URLs.

Keep receiver endpoint URLs in the allowlist to avoid policy-driven skips.

## Incident Checklist

1. Confirm secret/key-id rotation state on sender and receiver.
2. Verify receiver host clock sync (NTP drift under 1s target).
3. Inspect rejected request logs for skew/signature/replay reasons.
4. Confirm replay endpoint appears in configured allowlist.
5. If retries are needed, trigger dead-letter replay with `dryRun: true` first.
6. Re-run replay with `dryRun: false` after policy/signature issues are resolved.
