import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildKangurParentMagicLinkDebugPayload,
  requestKangurParentMagicLink,
} from '@/features/kangur/server/parent-email-auth';
import { badRequestError } from '@/shared/errors/app-error';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

export const kangurParentMagicLinkRequestSchema = z.object({
  email: z.string().trim().email(),
  callbackUrl: z.string().trim().min(1).optional(),
});

export async function postKangurParentMagicLinkRequestHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof kangurParentMagicLinkRequestSchema> | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
  }

  const result = await requestKangurParentMagicLink({
    email: body.email,
    callbackUrl: body.callbackUrl,
    request: req,
  });

  return NextResponse.json({
    ok: true,
    email: result.email,
    created: result.created,
    emailVerified: result.emailVerified,
    hasPassword: result.hasPassword,
    message:
      'Wyslalismy link do logowania. Jesli email nie jest jeszcze zweryfikowany, w tej samej wiadomosci znajdziesz tez link do weryfikacji.',
    debug: buildKangurParentMagicLinkDebugPayload(result),
  });
}
