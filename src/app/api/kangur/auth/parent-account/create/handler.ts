import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import {
  buildKangurParentAccountCreateDebugPayload,
  createKangurParentAccount,
} from '@/features/kangur/server/parent-email-auth';
import type { KangurParentAccountCreate } from '@/shared/contracts/kangur-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function postKangurParentAccountCreateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await auth().catch(() => null);
  const body = ctx.body as KangurParentAccountCreate | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
  }

  const result = await createKangurParentAccount({
    email: body.email,
    password: body.password,
    callbackUrl: body.callbackUrl,
    request: req,
  });
  const tutorContent = await getKangurAiTutorContent('pl');

  return NextResponse.json({
    ok: true,
    email: result.email,
    created: result.created,
    emailVerified: result.emailVerified,
    hasPassword: result.hasPassword,
    retryAfterMs: result.retryAfterMs,
    message: result.created
      ? tutorContent.parentVerification.createSuccessMessage
      : tutorContent.parentVerification.createResentMessage,
    debug: buildKangurParentAccountCreateDebugPayload(result),
  });
}
