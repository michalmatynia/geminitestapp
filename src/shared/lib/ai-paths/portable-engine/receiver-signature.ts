import { createHash, createHmac, timingSafeEqual } from 'crypto';

const DEFAULT_MAX_SKEW_SECONDS = 300;

export type PortablePathWebhookSignatureVerificationFailureReason =
  | 'signature_header_missing'
  | 'timestamp_header_missing'
  | 'signature_format_invalid'
  | 'timestamp_invalid'
  | 'secret_missing'
  | 'clock_skew_exceeded'
  | 'signature_mismatch'
  | 'replay_detected';

export type PortablePathWebhookSignatureReplayGuard = {
  hasSeen: (key: string) => Promise<boolean> | boolean;
  markSeen?: (key: string, ttlSeconds: number) => Promise<void> | void;
};

export type VerifyPortablePathWebhookSignatureInput = {
  rawBody: string;
  signatureHeader: string | null | undefined;
  timestampHeader: string | null | undefined;
  secret: string | null | undefined;
  now?: string | Date;
  maxSkewSeconds?: number;
  replayGuard?: PortablePathWebhookSignatureReplayGuard | null;
};

export type VerifyPortablePathWebhookSignatureResult =
  | {
      ok: true;
      replayKey: string | null;
      skewSeconds: number;
      maxSkewSeconds: number;
    }
  | {
      ok: false;
      reason: PortablePathWebhookSignatureVerificationFailureReason;
      replayKey: string | null;
      skewSeconds: number | null;
      maxSkewSeconds: number;
    };

const toNowDate = (value: string | Date | undefined): Date => {
  const candidate =
    value instanceof Date ? value : typeof value === 'string' ? new Date(value) : new Date();
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
};

const normalizeMaxSkewSeconds = (value: number | undefined): number => {
  if (!Number.isFinite(value)) return DEFAULT_MAX_SKEW_SECONDS;
  const normalized = Math.floor(Number(value));
  if (normalized <= 0) return DEFAULT_MAX_SKEW_SECONDS;
  return Math.min(normalized, 3600);
};

export const verifyPortablePathWebhookSignature = async (
  input: VerifyPortablePathWebhookSignatureInput
): Promise<VerifyPortablePathWebhookSignatureResult> => {
  const maxSkewSeconds = normalizeMaxSkewSeconds(input.maxSkewSeconds);
  const nowDate = toNowDate(input.now);
  const signatureHeader = input.signatureHeader?.trim() ?? '';
  const timestampHeader = input.timestampHeader?.trim() ?? '';
  const secret = input.secret?.trim() ?? '';
  if (signatureHeader.length === 0) {
    return {
      ok: false,
      reason: 'signature_header_missing',
      replayKey: null,
      skewSeconds: null,
      maxSkewSeconds,
    };
  }
  if (timestampHeader.length === 0) {
    return {
      ok: false,
      reason: 'timestamp_header_missing',
      replayKey: null,
      skewSeconds: null,
      maxSkewSeconds,
    };
  }
  if (secret.length === 0) {
    return {
      ok: false,
      reason: 'secret_missing',
      replayKey: null,
      skewSeconds: null,
      maxSkewSeconds,
    };
  }

  const [version, providedDigest] = signatureHeader.split('=');
  if (version !== 'v1' || !providedDigest || providedDigest.trim().length === 0) {
    return {
      ok: false,
      reason: 'signature_format_invalid',
      replayKey: null,
      skewSeconds: null,
      maxSkewSeconds,
    };
  }

  const timestampMs = Date.parse(timestampHeader);
  if (!Number.isFinite(timestampMs)) {
    return {
      ok: false,
      reason: 'timestamp_invalid',
      replayKey: null,
      skewSeconds: null,
      maxSkewSeconds,
    };
  }
  const skewSeconds = Math.abs(nowDate.getTime() - timestampMs) / 1000;
  if (skewSeconds > maxSkewSeconds) {
    return {
      ok: false,
      reason: 'clock_skew_exceeded',
      replayKey: null,
      skewSeconds,
      maxSkewSeconds,
    };
  }

  const expectedDigest = createHmac('sha256', secret)
    .update(`${timestampHeader}.${input.rawBody}`)
    .digest('hex');
  const providedBuffer = Buffer.from(providedDigest, 'hex');
  const expectedBuffer = Buffer.from(expectedDigest, 'hex');
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return {
      ok: false,
      reason: 'signature_mismatch',
      replayKey: null,
      skewSeconds,
      maxSkewSeconds,
    };
  }

  const replayKey = createHash('sha256')
    .update(`${timestampHeader}:${signatureHeader}`)
    .digest('hex');
  if (input.replayGuard) {
    const seen = await input.replayGuard.hasSeen(replayKey);
    if (seen) {
      return {
        ok: false,
        reason: 'replay_detected',
        replayKey,
        skewSeconds,
        maxSkewSeconds,
      };
    }
    if (input.replayGuard.markSeen) {
      await input.replayGuard.markSeen(replayKey, maxSkewSeconds);
    }
  }

  return {
    ok: true,
    replayKey: input.replayGuard ? replayKey : null,
    skewSeconds,
    maxSkewSeconds,
  };
};
