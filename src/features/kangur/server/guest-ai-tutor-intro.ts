import 'server-only';

import { createHash } from 'crypto';

import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type KangurGuestAiTutorIntroDoc = {
  fingerprintHash: string;
  createdAt: Date;
  updatedAt: Date;
  ipHash?: string;
  userAgentHash?: string;
};

type KangurGuestAiTutorIntroCheckResult = {
  shouldShow: boolean;
  reason: 'first_visit' | 'seen_before' | 'fingerprint_unavailable';
};

const COLLECTION_NAME = 'kangur_ai_tutor_guest_intro';

let indexesEnsured: Promise<void> | null = null;
const inMemoryFingerprints = new Set<string>();

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\s+/g, ' ');
};

const createStableHash = (value: string): string => {
  const salt =
    process.env['KANGUR_AI_TUTOR_GUEST_INTRO_SALT'] ??
    process.env['ANALYTICS_IP_SALT'] ??
    process.env['NEXTAUTH_SECRET'] ??
    process.env['AUTH_SECRET'] ??
    'kangur-ai-tutor-guest-intro';

  return createHash('sha256').update(`${salt}:${value}`).digest('hex');
};

const buildFingerprintHash = (input: {
  ip: string | null;
  userAgent: string | null;
}): string | null => {
  const normalizedIp = normalizeOptionalString(input.ip);
  const normalizedUserAgent = normalizeOptionalString(input.userAgent);

  if (!normalizedIp && !normalizedUserAgent) {
    return null;
  }

  return createStableHash(
    JSON.stringify({
      ip: normalizedIp,
      userAgent: normalizedUserAgent?.toLowerCase() ?? null,
    })
  );
};

const ensureIndexes = async (): Promise<void> => {
  if (!process.env['MONGODB_URI']) {
    return;
  }

  if (indexesEnsured) {
    return indexesEnsured;
  }

  indexesEnsured = (async () => {
    const db = await getMongoDb();
    const collection = db.collection<KangurGuestAiTutorIntroDoc>(COLLECTION_NAME);
    await Promise.all([
      collection.createIndex({ fingerprintHash: 1 }, { unique: true }),
      collection.createIndex({ createdAt: -1 }),
    ]);
  })();

  return indexesEnsured;
};

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

const registerInMemoryAppearance = (fingerprintHash: string): KangurGuestAiTutorIntroCheckResult => {
  if (inMemoryFingerprints.has(fingerprintHash)) {
    return {
      shouldShow: false,
      reason: 'seen_before',
    };
  }

  inMemoryFingerprints.add(fingerprintHash);
  return {
    shouldShow: true,
    reason: 'first_visit',
  };
};

export async function registerKangurGuestAiTutorIntroAppearance(input: {
  ip: string | null;
  userAgent: string | null;
}): Promise<KangurGuestAiTutorIntroCheckResult> {
  const fingerprintHash = buildFingerprintHash(input);
  if (!fingerprintHash) {
    return {
      shouldShow: true,
      reason: 'fingerprint_unavailable',
    };
  }

  if (!process.env['MONGODB_URI']) {
    return registerInMemoryAppearance(fingerprintHash);
  }

  const normalizedIp = normalizeOptionalString(input.ip);
  const normalizedUserAgent = normalizeOptionalString(input.userAgent);

  try {
    await ensureIndexes();
    const db = await getMongoDb();
    const collection = db.collection<KangurGuestAiTutorIntroDoc>(COLLECTION_NAME);
    const now = new Date();

    await collection.insertOne({
      fingerprintHash,
      createdAt: now,
      updatedAt: now,
      ...(normalizedIp ? { ipHash: createStableHash(`ip:${normalizedIp}`) } : {}),
      ...(normalizedUserAgent
        ? { userAgentHash: createStableHash(`ua:${normalizedUserAgent.toLowerCase()}`) }
        : {}),
    });

    return {
      shouldShow: true,
      reason: 'first_visit',
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (isDuplicateKeyError(error)) {
      return {
        shouldShow: false,
        reason: 'seen_before',
      };
    }

    return registerInMemoryAppearance(fingerprintHash);
  }
}
