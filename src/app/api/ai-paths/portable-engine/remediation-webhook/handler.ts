import { NextRequest, NextResponse } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { authError, badRequestError, serviceUnavailableError } from '@/shared/errors/app-error';
import { getQueryParams } from '@/shared/lib/api/api-handler';
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
  const searchParams = getQueryParams(req);
  const channel = parseChannel(searchParams.get('channel'));
  const maxSkewSeconds = parseMaxSkewSeconds(searchParams.get('maxSkewSeconds'));
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
