/**
 * Kangur Session Manager Service
 * 
 * Manages signed learner session cookies for the Kangur platform.
 */
import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

export type KangurLearnerSessionPayload = {
  learnerId: string;
  ownerUserId: string;
  exp: number;
};

export const COOKIE_NAME = 'kangur.learner-session';
const DEV_FALLBACK_SIGNING_KEY = 'kangur-dev-signing-key-change-me';

const resolveCookieDomain = (): string | undefined => {
  const value = process.env['KANGUR_COOKIE_DOMAIN'];
  if (value === undefined) {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const resolveSigningKey = (): string => {
  const authSecret = process.env['AUTH_SECRET']?.trim() ?? '';
  if (authSecret.length > 0) {
    return authSecret;
  }
  const nextAuthSecret = process.env['NEXTAUTH_SECRET']?.trim() ?? '';
  if (nextAuthSecret.length > 0) {
    return nextAuthSecret;
  }
  return process.env['NODE_ENV'] === 'development' ? DEV_FALLBACK_SIGNING_KEY : '';
};

const base64UrlEncode = (value: string): string => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

const signValue = (value: string): string =>
  createHmac('sha256', resolveSigningKey()).update(value).digest('base64url');

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

/**
 * Serializes and signs a session payload.
 */
export const serializePayload = (payload: KangurLearnerSessionPayload): string => {
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(body);
  return `${body}.${signature}`;
};

type SignedSessionParts = {
  body: string;
  signature: string;
};

const parseSignedSessionParts = (raw: string | undefined): SignedSessionParts | null => {
  if (raw === undefined || raw.length === 0) return null;
  const [body, signature] = raw.split('.');
  if (body === undefined || body.length === 0) return null;
  if (signature === undefined || signature.length === 0) return null;
  return { body, signature };
};

const areSignedSessionPartsValid = ({ body, signature }: SignedSessionParts): boolean =>
  safeEqual(signValue(body), signature);

const parseSessionPayloadBody = (body: string): KangurLearnerSessionPayload | null => {
  const parsed = JSON.parse(base64UrlDecode(body)) as Partial<KangurLearnerSessionPayload>;
  if (typeof parsed.learnerId !== 'string') return null;
  if (typeof parsed.ownerUserId !== 'string') return null;
  if (typeof parsed.exp !== 'number') return null;
  if (parsed.exp <= Date.now()) return null;
  return {
    learnerId: parsed.learnerId,
    ownerUserId: parsed.ownerUserId,
    exp: parsed.exp,
  };
};

/**
 * Parses and verifies a signed session cookie.
 */
export const parsePayload = (raw: string | undefined): KangurLearnerSessionPayload | null => {
  const parts = parseSignedSessionParts(raw);
  if (parts === null || !areSignedSessionPartsValid(parts)) return null;

  try {
    return parseSessionPayloadBody(parts.body);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

/**
 * Helper to build cookie options.
 */
export const buildCookieOptions = (
  maxAge: number
): {
  httpOnly: true;
  sameSite: 'lax';
  secure: boolean;
  path: '/';
  maxAge: number;
  domain: string | undefined;
} => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env['NODE_ENV'] === 'production',
  path: '/',
  maxAge,
  domain: resolveCookieDomain(),
});
