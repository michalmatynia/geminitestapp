import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { verifyKangurParentCaptcha } from '@/features/kangur/server/parent-account-captcha';
import {
  buildKangurParentAccountCreateDebugPayload,
  createKangurParentAccount,
} from '@/features/kangur/server/parent-email-auth';
import type { KangurParentAccountCreate } from '@/shared/contracts/kangur-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

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

  const captchaResult = await verifyKangurParentCaptcha({
    token: body.captchaToken,
    request: req,
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

  return NextResponse.json({
    ok: true,
    email: result.email,
    created: result.created,
    emailVerified: result.emailVerified,
    hasPassword: result.hasPassword,
    retryAfterMs: result.retryAfterMs,
    message: notificationSuppressed
      ? PARENT_VERIFICATION_NOTIFICATIONS_DISABLED_MESSAGE
      : result.created
        ? tutorContent.parentVerification.createSuccessMessage
        : tutorContent.parentVerification.createResentMessage,
    debug: buildKangurParentAccountCreateDebugPayload(result),
  });
}
