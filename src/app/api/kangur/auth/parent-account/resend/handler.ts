import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import {
  buildKangurParentAccountCreateDebugPayload,
  resendKangurParentVerificationEmail,
} from '@/features/kangur/server/parent-email-auth';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { KangurParentAccountResend } from '@/shared/contracts/kangur-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const PARENT_VERIFICATION_NOTIFICATIONS_DISABLED_MESSAGE =
  'Wysyłka e-maili potwierdzających jest obecnie wyłączona. Skontaktuj się z administratorem.';

export async function postKangurParentAccountResendHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await auth().catch((error) => {
    void ErrorSystem.captureException(error);
    return null;
  });
  const body = ctx.body as KangurParentAccountResend | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
  }

  const result = await resendKangurParentVerificationEmail({
    email: body.email,
    callbackUrl: body.callbackUrl,
    request: req,
  });
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
      : 'Wysłaliśmy nowy email potwierdzający. Konto rodzica uaktywni się po weryfikacji adresu.',
    debug: buildKangurParentAccountCreateDebugPayload(result),
  });
}
