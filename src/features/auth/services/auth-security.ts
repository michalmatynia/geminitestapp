import 'server-only';

import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import {
  DEFAULT_AUTH_SECURITY_POLICY,
  normalizeAuthSecurityPolicy,
  type AuthSecurityPolicy,
} from '@/features/auth/utils/auth-security';
import { MongoSettingRecord } from '@/shared/contracts/base';
import { getAuthDataProvider, requireAuthProvider } from '@/shared/lib/auth/services/auth-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { parseJsonSetting } from '@/shared/utils/settings-json';

type AttemptRecord = {
  _id: string;
  scope: 'email' | 'ip';
  value: string;
  count: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  lockedUntil?: Date | null;
  expiresAt?: Date | null;
};

const ATTEMPTS_COLLECTION = 'auth_security_attempts';

const memoryAttempts = new Map<string, AttemptRecord>();
let indexesReady: Promise<void> | null = null;

const ensureAuthSecurityIndexes = async (): Promise<void> => {
  const provider = requireAuthProvider(await getAuthDataProvider());
  if (provider !== 'mongodb') return;
  if (!process.env['MONGODB_URI']) return;
  if (!indexesReady) {
    indexesReady = (async (): Promise<void> => {
      const mongo = await getMongoDb();
      const collection = mongo.collection<AttemptRecord>(ATTEMPTS_COLLECTION);
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      await collection.createIndex({ scope: 1, value: 1 });
    })();
  }
  await indexesReady;
};

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  requireAuthProvider(await getAuthDataProvider());
  return readMongoSetting(key);
};

export const getAuthSecurityPolicy = async (): Promise<AuthSecurityPolicy> => {
  const storedPolicyValue = await readSettingValue(AUTH_SETTINGS_KEYS.securityPolicy);
  if (storedPolicyValue) {
    const parsed = parseJsonSetting<AuthSecurityPolicy>(
      storedPolicyValue,
      DEFAULT_AUTH_SECURITY_POLICY
    );
    return normalizeAuthSecurityPolicy(parsed);
  }

  return DEFAULT_AUTH_SECURITY_POLICY;
};

export const validatePasswordStrength = (
  password: string,
  policy: AuthSecurityPolicy
): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < policy.minPasswordLength) {
    errors.push(`Password must be at least ${policy.minPasswordLength} characters.`);
  }

  if (policy.requireStrongPassword) {
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must include at least one uppercase letter.');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must include at least one lowercase letter.');
    }
    if (policy.requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must include at least one number.');
    }
    if (policy.requireSymbol && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must include at least one symbol.');
    }
  }

  return { ok: errors.length === 0, errors };
};

const normalizeKey = (value: string | null | undefined): string =>
  value?.trim().toLowerCase() ?? '';

const buildAttemptKey = (scope: 'email' | 'ip', value: string): string => `${scope}:${value}`;

const getMemoryAttempt = (key: string): AttemptRecord | null => {
  const record = memoryAttempts.get(key);
  if (!record) return null;
  return record;
};

const setMemoryAttempt = (key: string, record: AttemptRecord): void => {
  memoryAttempts.set(key, record);
};

const clearMemoryAttempt = (key: string): void => {
  memoryAttempts.delete(key);
};

const getMongoAttempt = async (key: string): Promise<AttemptRecord | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo.collection<AttemptRecord>(ATTEMPTS_COLLECTION).findOne({ _id: key });
  return doc ?? null;
};

const setMongoAttempt = async (record: AttemptRecord): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const mongo = await getMongoDb();
  await mongo
    .collection<AttemptRecord>(ATTEMPTS_COLLECTION)
    .updateOne({ _id: record._id }, { $set: record }, { upsert: true });
};

const clearMongoAttempt = async (key: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const mongo = await getMongoDb();
  await mongo.collection<AttemptRecord>(ATTEMPTS_COLLECTION).deleteOne({ _id: key });
};

const getAttempt = async (key: string): Promise<AttemptRecord | null> => {
  requireAuthProvider(await getAuthDataProvider());
  if (process.env['MONGODB_URI']) {
    return await getMongoAttempt(key);
  }
  return getMemoryAttempt(key);
};

const saveAttempt = async (record: AttemptRecord): Promise<void> => {
  requireAuthProvider(await getAuthDataProvider());
  if (process.env['MONGODB_URI']) {
    await setMongoAttempt(record);
    return;
  }
  setMemoryAttempt(record._id, record);
};

const clearAttempt = async (key: string): Promise<void> => {
  requireAuthProvider(await getAuthDataProvider());
  if (process.env['MONGODB_URI']) {
    await clearMongoAttempt(key);
    return;
  }
  clearMemoryAttempt(key);
};

const isLocked = (record: AttemptRecord, now: Date): boolean =>
  record.lockedUntil ? record.lockedUntil.getTime() > now.getTime() : false;

const bumpAttempt = async (
  scope: 'email' | 'ip',
  value: string,
  maxAttempts: number,
  windowMinutes: number,
  lockDurationMinutes: number
): Promise<{ lockedUntil: Date | null; count: number }> => {
  await ensureAuthSecurityIndexes();
  const key = buildAttemptKey(scope, value);
  const now = new Date();
  const existing = await getAttempt(key);
  if (existing?.expiresAt && existing.expiresAt.getTime() <= now.getTime()) {
    await clearAttempt(key);
  }
  if (existing && isLocked(existing, now)) {
    return { lockedUntil: existing.lockedUntil ?? null, count: existing.count };
  }

  const windowMs = windowMinutes * 60 * 1000;
  const lockMs = lockDurationMinutes * 60 * 1000;

  let nextCount = 1;
  let firstAttemptAt = now;
  if (existing) {
    const elapsed = now.getTime() - existing.firstAttemptAt.getTime();
    if (elapsed <= windowMs) {
      nextCount = existing.count + 1;
      firstAttemptAt = existing.firstAttemptAt;
    }
  }

  const lockedUntil = nextCount >= maxAttempts ? new Date(now.getTime() + lockMs) : null;
  const expiresAt = new Date(now.getTime() + (windowMs + lockMs));

  const record: AttemptRecord = {
    _id: key,
    scope,
    value,
    count: nextCount,
    firstAttemptAt,
    lastAttemptAt: now,
    lockedUntil,
    expiresAt,
  };

  await saveAttempt(record);
  return { lockedUntil, count: nextCount };
};

const resetAttempt = async (scope: 'email' | 'ip', value: string): Promise<void> => {
  const key = buildAttemptKey(scope, value);
  await clearAttempt(key);
};

export const checkLoginAllowed = async (input: {
  email?: string | null;
  ip?: string | null;
}): Promise<{ allowed: boolean; reason: string | null; lockedUntil: Date | null }> => {
  await ensureAuthSecurityIndexes();
  const emailKey = normalizeKey(input.email);
  const ipKey = normalizeKey(input.ip);
  const now = new Date();

  if (emailKey) {
    const emailAttempt = await getAttempt(buildAttemptKey('email', emailKey));
    if (emailAttempt?.expiresAt && emailAttempt.expiresAt.getTime() <= now.getTime()) {
      await clearAttempt(buildAttemptKey('email', emailKey));
    } else if (emailAttempt && isLocked(emailAttempt, now)) {
      return {
        allowed: false,
        reason: 'EMAIL_LOCKED',
        lockedUntil: emailAttempt.lockedUntil ?? null,
      };
    }
  }

  if (ipKey) {
    const ipAttempt = await getAttempt(buildAttemptKey('ip', ipKey));
    if (ipAttempt?.expiresAt && ipAttempt.expiresAt.getTime() <= now.getTime()) {
      await clearAttempt(buildAttemptKey('ip', ipKey));
    } else if (ipAttempt && isLocked(ipAttempt, now)) {
      return {
        allowed: false,
        reason: 'IP_RATE_LIMIT',
        lockedUntil: ipAttempt.lockedUntil ?? null,
      };
    }
  }

  return { allowed: true, reason: null, lockedUntil: null };
};

export const recordLoginFailure = async (input: {
  email?: string | null;
  ip?: string | null;
  request?: Request;
}): Promise<void> => {
  await ensureAuthSecurityIndexes();
  const policy = await getAuthSecurityPolicy();
  const emailKey = normalizeKey(input.email);
  const ipKey = normalizeKey(input.ip);

  if (emailKey) {
    const result = await bumpAttempt(
      'email',
      emailKey,
      policy.lockoutMaxAttempts,
      policy.lockoutWindowMinutes,
      policy.lockoutDurationMinutes
    );
    if (result.lockedUntil) {
      await logSystemEvent({
        level: 'warn',
        message: 'Auth email lockout triggered',
        source: 'auth.security',
        context: {
          email: emailKey,
          lockedUntil: result.lockedUntil.toISOString(),
          attempts: result.count,
        },
        ...(input.request ? { request: input.request } : {}),
      });
    }
  }

  if (ipKey) {
    const result = await bumpAttempt(
      'ip',
      ipKey,
      policy.ipRateLimitMaxAttempts,
      policy.ipRateLimitWindowMinutes,
      policy.ipRateLimitDurationMinutes
    );
    if (result.lockedUntil) {
      await logSystemEvent({
        level: 'warn',
        message: 'Auth IP rate limit triggered',
        source: 'auth.security',
        context: {
          ip: ipKey,
          lockedUntil: result.lockedUntil.toISOString(),
          attempts: result.count,
        },
        ...(input.request ? { request: input.request } : {}),
      });
    }
  }
};

export const recordLoginSuccess = async (input: {
  email?: string | null;
  ip?: string | null;
  request?: Request;
  userId?: string | null;
}): Promise<void> => {
  await ensureAuthSecurityIndexes();
  const emailKey = normalizeKey(input.email);
  const ipKey = normalizeKey(input.ip);
  if (emailKey) await resetAttempt('email', emailKey);
  if (ipKey) await resetAttempt('ip', ipKey);

  await logSystemEvent({
    level: 'info',
    message: 'User signed in successfully',
    source: 'auth.security',
    context: {
      email: emailKey || null,
      ip: ipKey || null,
    },
    ...(input.request ? { request: input.request } : {}),
    userId: input.userId ?? null,
  });
};

export const extractClientIp = (request?: Request | null): string | null => {
  if (!request) return null;

  const headerCandidates = [
    'cf-connecting-ip',
    'x-vercel-forwarded-for',
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
  ];

  for (const headerName of headerCandidates) {
    const value = request.headers.get(headerName);
    if (!value) continue;
    const candidate = value.split(',')[0]?.trim();
    if (candidate) return normalizeClientIp(candidate);
  }

  return null;
};

const normalizeClientIp = (ip: string): string => {
  if (ip.startsWith('::ffff:')) return ip.slice(7);
  if (ip === '::1') return '127.0.0.1';
  return ip;
};
