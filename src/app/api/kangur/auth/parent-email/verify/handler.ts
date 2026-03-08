import { NextResponse } from 'next/server';
import { z } from 'zod';

import { verifyKangurParentEmail } from '@/features/kangur/server/parent-email-auth';
import { badRequestError } from '@/shared/errors/app-error';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

export const kangurParentEmailVerifySchema = z.object({
  token: z.string().trim().min(1),
});

export async function postKangurParentEmailVerifyHandler(
  _req: Request,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof kangurParentEmailVerifySchema> | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
  }

  const result = await verifyKangurParentEmail(body.token);

  return NextResponse.json({
    ok: true,
    email: result.email,
    callbackUrl: result.callbackUrl,
    emailVerified: result.emailVerified,
    message: 'Email zostal zweryfikowany. AI Tutor jest odblokowany.',
  });
}
