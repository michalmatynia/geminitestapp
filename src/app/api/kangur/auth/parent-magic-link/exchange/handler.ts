import { NextResponse } from 'next/server';
import { z } from 'zod';

import { exchangeKangurParentMagicLink } from '@/features/kangur/server/parent-email-auth';
import { badRequestError } from '@/shared/errors/app-error';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

export const kangurParentMagicLinkExchangeSchema = z.object({
  token: z.string().trim().min(1),
});

export async function postKangurParentMagicLinkExchangeHandler(
  _req: Request,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof kangurParentMagicLinkExchangeSchema> | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
  }

  const result = await exchangeKangurParentMagicLink(body.token);

  return NextResponse.json({
    ok: true,
    email: result.email,
    challengeId: result.challengeId,
    callbackUrl: result.callbackUrl,
    emailVerified: result.emailVerified,
    hasPassword: result.hasPassword,
  });
}
