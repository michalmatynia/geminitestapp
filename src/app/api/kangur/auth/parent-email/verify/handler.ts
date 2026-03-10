import { NextResponse } from 'next/server';

import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { verifyKangurParentEmail } from '@/features/kangur/server/parent-email-auth';
import type { KangurParentEmailVerify } from '@/shared/contracts/kangur-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function postKangurParentEmailVerifyHandler(
  _req: Request,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as KangurParentEmailVerify | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
  }

  const result = await verifyKangurParentEmail(body.token);
  const tutorContent = await getKangurAiTutorContent('pl');

  return NextResponse.json({
    ok: true,
    email: result.email,
    callbackUrl: result.callbackUrl,
    emailVerified: result.emailVerified,
    message: tutorContent.parentVerification.verifySuccessMessage,
  });
}
