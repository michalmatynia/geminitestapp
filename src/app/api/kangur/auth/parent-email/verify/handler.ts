import { NextResponse } from 'next/server';

import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { verifyKangurParentEmail } from '@/features/kangur/server/parent-email-auth';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import type { KangurParentEmailVerify } from '@/shared/contracts/kangur-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { readTolerantServerAuthSession } from '@/features/auth/server';
import { getSiteTranslator } from '@/shared/lib/i18n/server-translator';

export async function postKangurParentEmailVerifyHandler(
  req: Request,
  ctx: ApiHandlerContext
): Promise<Response> {
  const { locale, t } = await getSiteTranslator({ request: req });
  await readTolerantServerAuthSession({
    onError: (error) => ErrorSystem.captureException(error),
  });
  const body = ctx.body as KangurParentEmailVerify | undefined;
  if (!body) {
    throw badRequestError(t('KangurAuthApi.invalidPayload'));
  }

  const result = await verifyKangurParentEmail(body.token, { locale });
  const tutorContent = await getKangurAiTutorContent(locale);

  return NextResponse.json({
    ok: true,
    email: result.email,
    callbackUrl: result.callbackUrl,
    emailVerified: result.emailVerified,
    message: tutorContent.parentVerification.verifySuccessMessage,
  });
}
