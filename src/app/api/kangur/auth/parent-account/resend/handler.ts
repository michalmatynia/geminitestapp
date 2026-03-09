import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildKangurParentAccountCreateDebugPayload,
  resendKangurParentVerificationEmail,
} from '@/features/kangur/server/parent-email-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export const kangurParentAccountResendSchema = z.object({
  email: z.string().trim().email(),
  callbackUrl: z.string().trim().min(1).optional(),
});

export async function postKangurParentAccountResendHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof kangurParentAccountResendSchema> | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
  }

  const result = await resendKangurParentVerificationEmail({
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
    retryAfterMs: result.retryAfterMs,
    message:
      'Wyslalismy nowy email potwierdzajacy. Konto rodzica uaktywni sie po weryfikacji adresu.',
    debug: buildKangurParentAccountCreateDebugPayload(result),
  });
}
