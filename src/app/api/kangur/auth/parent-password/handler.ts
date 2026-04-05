import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/server';
import { setKangurParentPassword } from '@/features/kangur/server/parent-email-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';
import { getSiteTranslator } from '@/shared/lib/i18n/server-translator';


export const kangurParentPasswordSchema = z.object({
  password: z.string().min(1),
});

export async function postKangurParentPasswordHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const { locale, t } = await getSiteTranslator({ request: req });
  const body = ctx.body as z.infer<typeof kangurParentPasswordSchema> | undefined;
  if (!body) {
    throw badRequestError(t('KangurAuthApi.invalidPayload'));
  }

  const actor = await resolveKangurActor(req);
  if (!actor.canManageLearners) {
    throw forbiddenError(t('KangurAuthApi.onlyParentCanSetPassword'));
  }

  const result = await setKangurParentPassword({
    userId: actor.ownerUserId,
    password: body.password,
    locale,
  });

  return NextResponse.json({
    ok: true,
    email: result.email,
    hasPassword: result.hasPassword,
    message: t('KangurAuthApi.parentPasswordSet'),
  });
}
