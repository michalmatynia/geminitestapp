import 'server-only';

import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import {
  DEFAULT_AUTH_SECURITY_POLICY,
  normalizeAuthSecurityPolicy,
  type AuthSecurityPolicy,
} from '@/features/auth/utils/auth-security';
import { type MongoSettingRecord } from '@/shared/contracts/base';
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
  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) return;
  indexesReady ??= (async (): Promise<void> => {
    const mongo = await getMongoDb();
    const collection = mongo.collection<AttemptRecord>(ATTEMPTS_COLLECTION);
    await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await collection.createIndex({ scope: 1, value: 1 });
  })();
  await indexesReady;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri !== 'string' || mongoUri.length === 0) return null;
  const mongo = await getMongoDb();
  const doc = await mongo.collection<MongoSettingRecord>('settings').findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

export const getAuthSecurityPolicy = async (): Promise<AuthSecurityPolicy> => {
  const stored = await readSettingValue(AUTH_SETTINGS_KEYS.securityPolicy);
  return stored !== null ? normalizeAuthSecurityPolicy(parseJsonSetting<AuthSecurityPolicy>(stored, DEFAULT_AUTH_SECURITY_POLICY)) : DEFAULT_AUTH_SECURITY_POLICY;
};

export const validatePasswordStrength = (password: string, policy: AuthSecurityPolicy): { ok: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (password.length < policy.minPasswordLength) {
    errors.push(`Password must be at least ${policy.minPasswordLength} characters.`);
  }

  if (policy.requireStrongPassword === true) {
    const checks = [
      { cond: policy.requireUppercase, regex: /[A-Z]/, msg: 'Password must include at least one uppercase letter.' },
      { cond: policy.requireLowercase, regex: /[a-z]/, msg: 'Password must include at least one lowercase letter.' },
      { cond: policy.requireNumber, regex: /[0-9]/, msg: 'Password must include at least one number.' },
      { cond: policy.requireSymbol, regex: /[^A-Za-z0-9]/, msg: 'Password must include at least one symbol.' },
    ];
    for (const check of checks) {
      if (check.cond === true && !check.regex.test(password)) {
        errors.push(check.msg);
      }
    }
  }
  return { ok: errors.length === 0, errors };
};

const normalizeKey = (value: string | null | undefined): string => (value ?? '').trim().toLowerCase();
const buildAttemptKey = (scope: 'email' | 'ip', value: string): string => `${scope}:${value}`;

const getAttempt = async (key: string): Promise<AttemptRecord | null> => {
  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri === 'string' && mongoUri.length > 0) {
    const mongo = await getMongoDb();
    return (await mongo.collection<AttemptRecord>(ATTEMPTS_COLLECTION).findOne({ _id: key })) ?? null;
  }
  return memoryAttempts.get(key) ?? null;
};

const saveAttempt = async (record: AttemptRecord): Promise<void> => {
  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri === 'string' && mongoUri.length > 0) {
    const mongo = await getMongoDb();
    await mongo.collection<AttemptRecord>(ATTEMPTS_COLLECTION).updateOne({ _id: record._id }, { $set: record }, { upsert: true });
  } else {
    memoryAttempts.set(record._id, record);
  }
};

const clearAttempt = async (key: string): Promise<void> => {
  requireAuthProvider(await getAuthDataProvider());
  const mongoUri = process.env['MONGODB_URI'];
  if (typeof mongoUri === 'string' && mongoUri.length > 0) {
    const mongo = await getMongoDb();
    await mongo.collection<AttemptRecord>(ATTEMPTS_COLLECTION).deleteOne({ _id: key });
  } else {
    memoryAttempts.delete(key);
  }
};

const readActiveAttempt = async (key: string, now: Date): Promise<AttemptRecord | null> => {
  const existing = await getAttempt(key);
  if (existing?.expiresAt && existing.expiresAt.getTime() <= now.getTime()) {
    await clearAttempt(key); return null;
  }
  return existing;
};

const resolveAttemptWindowState = (existing: AttemptRecord | null, now: Date, windowMs: number): { count: number; firstAttemptAt: Date } => {
  if (existing === null || (now.getTime() - existing.firstAttemptAt.getTime() > windowMs)) return { count: 1, firstAttemptAt: now };
  return { count: existing.count + 1, firstAttemptAt: existing.firstAttemptAt };
};

const buildAttemptRecord = (i: { key: string; scope: 'email' | 'ip'; value: string; count: number; firstAttemptAt: Date; lastAttemptAt: Date; windowMs: number; lockMs: number }): AttemptRecord => {
  const lockedUntil = i.count >= 1 && i.lockMs > 0 ? new Date(i.lastAttemptAt.getTime() + i.lockMs) : null;
  return { _id: i.key, scope: i.scope, value: i.value, count: i.count, firstAttemptAt: i.firstAttemptAt, lastAttemptAt: i.lastAttemptAt, lockedUntil, expiresAt: new Date(i.lastAttemptAt.getTime() + i.windowMs + i.lockMs) };
};

const readLockedAttemptStatus = async (i: { scope: 'email' | 'ip'; value: string; now: Date; reason: 'EMAIL_LOCKED' | 'IP_RATE_LIMIT' }): Promise<{ allowed: false; reason: 'EMAIL_LOCKED' | 'IP_RATE_LIMIT'; lockedUntil: Date | null } | null> => {
  const key = buildAttemptKey(i.scope, i.value);
  const attempt = await readActiveAttempt(key, i.now);
  const lockedUntil = attempt?.lockedUntil;
  if (attempt === null || lockedUntil === null || lockedUntil === undefined || lockedUntil.getTime() <= i.now.getTime()) return null;
  return { allowed: false, reason: i.reason, lockedUntil };
};

const bumpAttempt = async (options: {
  scope: 'email' | 'ip';
  value: string;
  max: number;
  winMin: number;
  lockMin: number;
}): Promise<{ lockedUntil: Date | null; count: number }> => {
  const { scope, value, max, winMin, lockMin } = options;
  await ensureAuthSecurityIndexes();
  const key = buildAttemptKey(scope, value);
  const now = new Date();
  const existing = await readActiveAttempt(key, now);
  if (existing?.lockedUntil && existing.lockedUntil.getTime() > now.getTime()) return { lockedUntil: existing.lockedUntil ?? null, count: existing.count };

  const winMs = winMin * 60 * 1000;
  const lockMs = lockMin * 60 * 1000;
  const { count: nextCount, firstAttemptAt } = resolveAttemptWindowState(existing, now, winMs);
  const lockedUntil = nextCount >= max ? new Date(now.getTime() + lockMs) : null;
  const record = buildAttemptRecord({ key, scope, value, count: nextCount, firstAttemptAt, lastAttemptAt: now, windowMs: winMs, lockMs: lockedUntil ? lockMs : 0 });
  record.lockedUntil = lockedUntil;
  await saveAttempt(record);
  return { lockedUntil, count: nextCount };
};

export const checkLoginAllowed = async (input: { email?: string | null; ip?: string | null }): Promise<{ allowed: boolean; reason: string | null; lockedUntil: Date | null }> => {
  await ensureAuthSecurityIndexes();
  const eKey = normalizeKey(input.email);
  const iKey = normalizeKey(input.ip);
  const now = new Date();
  if (eKey !== '') {
    const s = await readLockedAttemptStatus({ scope: 'email', value: eKey, now, reason: 'EMAIL_LOCKED' });
    if (s !== null) return s;
  }
  if (iKey !== '') {
    const s = await readLockedAttemptStatus({ scope: 'ip', value: iKey, now, reason: 'IP_RATE_LIMIT' });
    if (s !== null) return s;
  }
  return { allowed: true, reason: null, lockedUntil: null };
};

const recordLoginFailureForScope = async (options: {
  scope: 'email' | 'ip';
  value: string;
  max: number;
  winMin: number;
  lockMin: number;
  request?: Request;
}): Promise<void> => {
  const { scope, value, max, winMin, lockMin, request } = options;
  const r = await bumpAttempt({ scope, value, max, winMin, lockMin });
  const lockedUntil = r.lockedUntil;
  const isLocked = lockedUntil !== null;
  
  await logSystemEvent({
    level: isLocked ? 'warn' : 'info',
    message: isLocked ? `Auth ${scope} lockout triggered` : `Auth login failure (${scope})`,
    source: 'auth.security',
    context: {
      [scope]: value,
      attempts: r.count,
      ...(lockedUntil !== null ? { lockedUntil: lockedUntil.toISOString() } : {}),
    },
    ...(request ? { request } : {}),
  });
};

export const recordLoginFailure = async (input: { email?: string | null; ip?: string | null; request?: Request }): Promise<void> => {
  await ensureAuthSecurityIndexes();
  const p = await getAuthSecurityPolicy();
  const eKey = normalizeKey(input.email);
  const iKey = normalizeKey(input.ip);

  if (eKey !== '') {
    await recordLoginFailureForScope({
      scope: 'email',
      value: eKey,
      max: p.lockoutMaxAttempts,
      winMin: p.lockoutWindowMinutes,
      lockMin: p.lockoutDurationMinutes,
      request: input.request,
    });
  }
  if (iKey !== '') {
    await recordLoginFailureForScope({
      scope: 'ip',
      value: iKey,
      max: p.ipRateLimitMaxAttempts,
      winMin: p.ipRateLimitWindowMinutes,
      lockMin: p.ipRateLimitDurationMinutes,
      request: input.request,
    });
  }
};

export const recordLoginSuccess = async (input: { email?: string | null; ip?: string | null; request?: Request; userId?: string | null }): Promise<void> => {
  await ensureAuthSecurityIndexes();
  const eK = normalizeKey(input.email);
  const iK = normalizeKey(input.ip);
  if (eK !== '') await clearAttempt(buildAttemptKey('email', eK));
  if (iK !== '') await clearAttempt(buildAttemptKey('ip', iK));
  const context = {
    email: eK.length > 0 ? eK : null,
    ip: iK.length > 0 ? iK : null
  };
  await logSystemEvent({ level: 'info', message: 'User signed in successfully', source: 'auth.security', context, ...(input.request ? { request: input.request } : {}), userId: input.userId ?? null });
};

export const extractClientIp = (request?: Request | null): string | null => {
  if (request === null || request === undefined) return null;
  const candidates = ['cf-connecting-ip', 'x-vercel-forwarded-for', 'x-forwarded-for', 'x-real-ip', 'x-client-ip'];
  for (const h of candidates) {
    const v = request.headers.get(h);
    if (v === null || v === '') continue;
    const c = v.split(',')[0]?.trim();
    if (c === undefined || c === '') continue;
    if (c.startsWith('::ffff:')) return c.slice(7);
    if (c === '::1') return '127.0.0.1';
    return c;
  }
  return null;
};
