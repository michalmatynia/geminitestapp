import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { verifyKangurParentCaptcha } from '@/features/kangur/server/parent-account-captcha';
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

const PARENT_VERIFICATION_NOTIFICATIONS_DISABLED_MESSAGE =
  'Wysyłka e-maili potwierdzających jest obecnie wyłączona. Skontaktuj się z administratorem.';

export async function postKangurParentAccountCreateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await auth().catch(() => null);
  const body = ctx.body as KangurParentAccountCreate | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
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
        ? 'Potwierdź, że nie jesteś botem.'
        : 'Nie udało się zweryfikować Captcha. Spróbuj ponownie.'
    );
  }

  const result = await createKangurParentAccount({
    email: body.email,
    password: body.password,
    callbackUrl: body.callbackUrl,
    request: req,
  });
  const tutorContent = await getKangurAiTutorContent('pl');
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
      ? 'Konto rodzica jest gotowe. Zaloguj się e-mailem i hasłem.'
      : notificationSuppressed
        ? PARENT_VERIFICATION_NOTIFICATIONS_DISABLED_MESSAGE
        : result.created
          ? tutorContent.parentVerification.createSuccessMessage
          : tutorContent.parentVerification.createResentMessage,
    debug: buildKangurParentAccountCreateDebugPayload(result),
  });
}
