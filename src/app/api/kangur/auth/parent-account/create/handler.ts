import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildKangurParentAccountCreateDebugPayload,
  createKangurParentAccount,
} from '@/features/kangur/server/parent-email-auth';
import { badRequestError } from '@/shared/errors/app-error';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

export const kangurParentAccountCreateSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  callbackUrl: z.string().trim().min(1).optional(),
});

export async function postKangurParentAccountCreateHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof kangurParentAccountCreateSchema> | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
  }

  const result = await createKangurParentAccount({
    email: body.email,
    password: body.password,
    callbackUrl: body.callbackUrl,
    request: req,
  });

  return NextResponse.json({
    ok: true,
    email: result.email,
    created: result.created,
    emailVerified: result.emailVerified,
    hasPassword: result.hasPassword,
    message: result.created
      ? 'Konto rodzica zostalo utworzone. Wyslalismy email potwierdzajacy. Zalogujesz sie po weryfikacji emaila, a AI Tutor odblokuje sie po potwierdzeniu adresu.'
      : 'To konto rodzica czeka na potwierdzenie emaila. Wyslalismy nowy email potwierdzajacy. Zalogujesz sie po weryfikacji emaila.',
    debug: buildKangurParentAccountCreateDebugPayload(result),
  });
}
