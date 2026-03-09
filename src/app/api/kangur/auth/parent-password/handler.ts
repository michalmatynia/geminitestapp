import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveKangurActor } from '@/features/kangur/server';
import { setKangurParentPassword } from '@/features/kangur/server/parent-email-auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, forbiddenError } from '@/shared/errors/app-error';


export const kangurParentPasswordSchema = z.object({
  password: z.string().min(1),
});

export async function postKangurParentPasswordHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  const body = ctx.body as z.infer<typeof kangurParentPasswordSchema> | undefined;
  if (!body) {
    throw badRequestError('Invalid payload.');
  }

  const actor = await resolveKangurActor(req);
  if (!actor.canManageLearners) {
    throw forbiddenError('Only parent accounts can set a parent password.');
  }

  const result = await setKangurParentPassword({
    userId: actor.ownerUserId,
    password: body.password,
  });

  return NextResponse.json({
    ok: true,
    email: result.email,
    hasPassword: result.hasPassword,
    message: 'Haslo rodzica zostalo ustawione. Od teraz mozesz logowac sie emailem i haslem.',
  });
}
