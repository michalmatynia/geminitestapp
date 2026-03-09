import { NextRequest, NextResponse } from 'next/server';

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

  return NextResponse.json({
    ok: true,
    email: result.email,
    created: result.created,
    emailVerified: result.emailVerified,
    hasPassword: result.hasPassword,
    retryAfterMs: result.retryAfterMs,
    message: result.created
      ? 'Sprawdz email rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje sie po weryfikacji.'
      : 'To konto rodzica czeka na potwierdzenie emaila. Wyslalismy nowy email potwierdzajacy. Konto uaktywni sie po weryfikacji adresu.',
    debug: buildKangurParentAccountCreateDebugPayload(result),
  });
}
