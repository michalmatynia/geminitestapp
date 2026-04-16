import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { portablePathRemediationWebhookQuerySchema } from '@/shared/contracts/ai-paths-portable-engine';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError, serviceUnavailableError } from '@/shared/errors/app-error';
import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  verifyPortablePathWebhookSignature,
} from '@/shared/lib/ai-paths/portable-engine';
import {
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment,
} from '@/shared/lib/ai-paths/portable-engine/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const DEFAULT_MAX_SKEW_SECONDS = 300;
export const querySchema = portablePathRemediationWebhookQuerySchema;

const resolveRemediationWebhookQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
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

const toParsedJsonPayload = (rawBody: string): unknown => {
  if (rawBody.trim().length === 0) return null;
  try {
    return JSON.parse(rawBody);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse(resolveRemediationWebhookQueryInput(req, _ctx));
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
  const payload = toParsedJsonPayload(rawBody);
  z.unknown().parse(payload);
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
    payload,
  });
}
