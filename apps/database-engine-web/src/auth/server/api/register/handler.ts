import { hash } from 'bcryptjs';
import { type NextRequest, NextResponse } from 'next/server';

import { registerPayloadSchema, type RegisterPayload } from '@/shared/contracts/auth';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, conflictError, forbiddenError } from '@/shared/errors/app-error';

import { getAuthUserPageSettings, normalizeAuthEmail } from '../../access';
import { createAuthUser, findAuthUserByEmail } from '../../user-repository';

export const registerSchema = registerPayloadSchema;

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const data = ctx.body as RegisterPayload | undefined;
  if (!data) throw badRequestError('Invalid payload');

  const pageSettings = await getAuthUserPageSettings();
  if (!pageSettings.allowSignup) {
    throw forbiddenError('Registration is disabled.');
  }

  if (process.env['MONGODB_URI'] === undefined) {
    throw badRequestError('MongoDB is not configured.');
  }

  const email = normalizeAuthEmail(data.email);
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    throw conflictError('User already exists.', { email });
  }

  const passwordHash = await hash(data.password, 12);
  const user = await createAuthUser({
    email,
    name: data.name ?? null,
    passwordHash,
    emailVerified: data.emailVerified ?? false,
  });

  return NextResponse.json(
    { id: user.id, email: user.email, name: user.name },
    { status: 201 }
  );
}
