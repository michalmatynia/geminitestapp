import { type NextRequest } from 'next/server';

import { createServiceLogger } from '@/features/kangur/shared/utils/logger';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';

type TurnstileVerifyResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
};

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_TIMEOUT_MS = 5000;
const logger = createServiceLogger('kangur.captcha');

const readTrimmedEnv = (key: string): string => process.env[key]?.trim() ?? '';

const resolveKangurCaptchaConfig = (): { siteKey: string; secretKey: string } => ({
  siteKey: readTrimmedEnv('NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY'),
  secretKey: readTrimmedEnv('KANGUR_PARENT_CAPTCHA_SECRET_KEY'),
});

const resolveClientIp = (request: NextRequest): string | null => {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  return null;
};

export type KangurCaptchaVerificationResult = {
  ok: boolean;
  required: boolean;
  reason?: string;
};

export const verifyKangurParentCaptcha = async ({
  token,
  request,
  requireCaptcha,
}: {
  token: string | undefined;
  request: NextRequest;
  requireCaptcha?: boolean;
}): Promise<KangurCaptchaVerificationResult> => {
  const { siteKey, secretKey } = resolveKangurCaptchaConfig();
  const required = Boolean(siteKey && secretKey) && (requireCaptcha ?? true);

  if (!required) {
    return { ok: true, required: false };
  }

  if (!token) {
    return { ok: false, required: true, reason: 'missing-token' };
  }

  const form = new URLSearchParams({
    secret: secretKey,
    response: token,
  });
  const ip = resolveClientIp(request);
  if (ip) {
    form.set('remoteip', ip);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TURNSTILE_TIMEOUT_MS);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: form,
      signal: controller.signal,
    });
    const payload = (await response.json().catch((error) => {
      void ErrorSystem.captureException(error);
      return null;
    })) as TurnstileVerifyResponse | null;

    if (!response.ok || !payload?.success) {
      const errorCodes = payload?.['error-codes']?.filter(Boolean) ?? [];
      logger.warn('[kangur.captcha] verification failed', {
        statusCode: response.status,
        errorCodes,
      });
      return {
        ok: false,
        required: true,
        reason: errorCodes.length > 0 ? errorCodes.join(',') : 'verification_failed',
      };
    }

    return { ok: true, required: true };
  } catch (error) {
    void ErrorSystem.captureException(error);
    logger.error('[kangur.captcha] verification error', error);
    return { ok: false, required: true, reason: 'verification_error' };
  } finally {
    clearTimeout(timeout);
  }
};
