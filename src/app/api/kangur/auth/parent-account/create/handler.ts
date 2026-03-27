import { NextRequest, NextResponse } from 'next/server';

import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { verifyKangurParentCaptcha } from '@/features/kangur/server/parent-account-captcha';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import {
  buildKangurParentAccountCreateDebugPayload,
  createKangurParentAccount,
} from '@/features/kangur/server/parent-email-auth';
import {
  KANGUR_PARENT_VERIFICATION_SETTINGS_KEY,
  parseKangurParentVerificationEmailSettings,
} from '@/features/kangur/settings';
import type { KangurParentAccountCreate } from '@/shared/contracts/kangur-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { readTolerantServerAuthSession } from '@/shared/lib/auth/optional-server-auth';
import { getSiteTranslator } from '@/shared/lib/i18n/server-translator';

export async function postKangurParentAccountCreateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const { locale, t } = await getSiteTranslator({ request: req });
  await readTolerantServerAuthSession({
    onError: (error) => ErrorSystem.captureException(error),
  });
  const body = ctx.body as KangurParentAccountCreate | undefined;
  if (!body) {
    throw badRequestError(t('KangurAuthApi.invalidPayload'));
  }

  const rawParentVerificationSettings = await readStoredSettingValue(
    KANGUR_PARENT_VERIFICATION_SETTINGS_KEY
  );
  const parentVerificationSettings = parseKangurParentVerificationEmailSettings(
    rawParentVerificationSettings
  );
  const captchaResult = await verifyKangurParentCaptcha({
    token: body.captchaToken,
    request: req,
    requireCaptcha: parentVerificationSettings.requireCaptcha,
  });
  if (captchaResult.required && !captchaResult.ok) {
    throw badRequestError(
      captchaResult.reason === 'missing-token'
        ? t('KangurAuthApi.captchaMissing')
        : t('KangurAuthApi.captchaVerificationFailed')
    );
  }

  const result = await createKangurParentAccount({
    email: body.email,
    password: body.password,
    callbackUrl: body.callbackUrl,
    request: req,
    locale,
  });
  const tutorContent = await getKangurAiTutorContent(locale);
  const notificationSuppressed = result.notificationSuppressed === true;
  const verificationSkipped = result.emailVerified === true;

  return NextResponse.json({
    ok: true,
    email: result.email,
    created: result.created,
    emailVerified: result.emailVerified,
    hasPassword: result.hasPassword,
    retryAfterMs: result.retryAfterMs,
    message: verificationSkipped
      ? t('KangurAuthApi.parentAccountReady')
      : notificationSuppressed
        ? t('KangurAuthApi.notificationsDisabled')
        : result.created
          ? tutorContent.parentVerification.createSuccessMessage
          : tutorContent.parentVerification.createResentMessage,
    debug: buildKangurParentAccountCreateDebugPayload(result),
  });
}
