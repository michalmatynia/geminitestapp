import { NextRequest, NextResponse } from 'next/server';

import {
  buildKangurParentAccountCreateDebugPayload,
  resendKangurParentVerificationEmail,
} from '@/features/kangur/server/parent-email-auth';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { KangurParentAccountResend } from '@/shared/contracts/kangur-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { readTolerantServerAuthSession } from '@/features/auth/server';
import { getSiteTranslator } from '@/shared/lib/i18n/server-translator';

export async function postKangurParentAccountResendHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const { locale, t } = await getSiteTranslator({ request: req });
  await readTolerantServerAuthSession({
    onError: (error) => ErrorSystem.captureException(error),
  });
  const body = ctx.body as KangurParentAccountResend | undefined;
  if (!body) {
    throw badRequestError(t('KangurAuthApi.invalidPayload'));
  }

  const result = await resendKangurParentVerificationEmail({
    email: body.email,
    callbackUrl: body.callbackUrl,
    request: req,
    locale,
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
      ? t('KangurAuthApi.notificationsDisabled')
      : t('KangurAuthApi.parentVerificationResent'),
    debug: buildKangurParentAccountCreateDebugPayload(result),
  });
}
