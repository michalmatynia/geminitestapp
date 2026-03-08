import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, badRequestError, serviceUnavailableError } from '@/shared/errors/app-error';
import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
} from '@/shared/lib/api/query-schema';
import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  verifyPortablePathWebhookSignature,
} from '@/shared/lib/ai-paths/portable-engine';
import {
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment,
} from '@/shared/lib/ai-paths/portable-engine/server';

const DEFAULT_MAX_SKEW_SECONDS = 300;
const MAX_MAX_SKEW_SECONDS = 3600;

export const querySchema = z.object({
  channel: z.preprocess(
    (value: unknown) => normalizeOptionalQueryString(value)?.toLowerCase(),
    z.enum(['webhook', 'email']).optional()
  ),
  maxSkewSeconds: optionalIntegerQuerySchema(z.number().int().min(1).max(MAX_MAX_SKEW_SECONDS)),
});

const replayGuardStore = new Map<string, number>();

const pruneReplayGuardStore = (nowMs: number): void => {
  for (const [key, expiresAt] of replayGuardStore) {
    if (expiresAt <= nowMs) {
      replayGuardStore.delete(key);
    }
  }
};

export const resetPortablePathAutoRemediationWebhookReplayGuard = (): void => {
  replayGuardStore.clear();
};

const parseChannel = (value: string | null): 'webhook' | 'email' => {
  if (!value) return 'webhook';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'webhook' || normalized === 'email') return normalized;
  throw badRequestError('Portable remediation webhook "channel" must be one of: webhook, email.');
};

const parseMaxSkewSeconds = (value: string | null): number => {
  if (!value) return DEFAULT_MAX_SKEW_SECONDS;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw badRequestError('Portable remediation webhook "maxSkewSeconds" must be numeric.');
  }
  const normalized = Math.floor(numeric);
  if (normalized <= 0 || normalized > MAX_MAX_SKEW_SECONDS) {
    throw badRequestError(
      `Portable remediation webhook "maxSkewSeconds" must be between 1 and ${MAX_MAX_SKEW_SECONDS}.`
    );
  }
  return normalized;
};

const toParsedJsonPayload = (rawBody: string): unknown => {
  if (rawBody.trim().length === 0) return null;
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const channel = query.channel ?? 'webhook';
  const maxSkewSeconds = query.maxSkewSeconds ?? DEFAULT_MAX_SKEW_SECONDS;
  const now = new Date().toISOString();
  const secret =
    channel === 'email'
      ? resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment()
      : resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment();
  if (!secret) {
    throw serviceUnavailableError(
      `Portable remediation ${channel} webhook secret is not configured.`
    );
  }
  const rawBody = await req.text();
  const verification = await verifyPortablePathWebhookSignature({
    rawBody,
    signatureHeader: req.headers.get('x-ai-paths-signature'),
    timestampHeader: req.headers.get('x-ai-paths-signature-timestamp'),
    secret,
    now,
    maxSkewSeconds,
    replayGuard: {
      hasSeen: (key: string): boolean => {
        const nowMs = Date.now();
        pruneReplayGuardStore(nowMs);
        const expiresAt = replayGuardStore.get(key);
        if (!expiresAt) return false;
        if (expiresAt <= nowMs) {
          replayGuardStore.delete(key);
          return false;
        }
        return true;
      },
      markSeen: (key: string, ttlSeconds: number): void => {
        const nowMs = Date.now();
        pruneReplayGuardStore(nowMs);
        replayGuardStore.set(key, nowMs + Math.max(1, ttlSeconds) * 1000);
      },
    },
  });
  if (!verification.ok) {
    throw authError('Invalid portable remediation webhook signature.', {
      reason: verification.reason,
      skewSeconds: verification.skewSeconds,
      maxSkewSeconds: verification.maxSkewSeconds,
    });
  }

  return NextResponse.json({
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'portable_audit_sink_auto_remediation_webhook_receipt',
    accepted: true,
    channel,
    verifiedAt: now,
    replayKey: verification.replayKey,
    payload: toParsedJsonPayload(rawBody),
  });
}
