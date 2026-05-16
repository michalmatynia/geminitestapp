import 'server-only';

import { findAuthUserById } from '@/server/auth';
import { readOptionalServerAuthSession } from '@/features/auth/server';
import { authError } from '@/shared/errors/app-error';

import type { NextRequest } from 'next/server';

export type SocialPublishingActor = {
  actorId: string;
  role: 'admin' | 'user';
  email: string | null;
  name: string | null;
};

const ELEVATED_ROLES = new Set(['admin', 'super_admin', 'superuser']);

const mapRole = (role: unknown): SocialPublishingActor['role'] =>
  typeof role === 'string' && ELEVATED_ROLES.has(role) ? 'admin' : 'user';

export const resolveSocialPublishingActor = async (
  _request?: NextRequest
): Promise<SocialPublishingActor> => {
  const session = await readOptionalServerAuthSession();
  const sessionUser = session?.user;
  const userId = sessionUser?.id;

  if (!userId) {
    throw authError('Authentication required.');
  }

  const user = await findAuthUserById(userId);
  const sessionEmail = typeof sessionUser.email === 'string' ? sessionUser.email : null;
  const sessionName = typeof sessionUser.name === 'string' ? sessionUser.name.trim() : null;

  return {
    actorId: userId,
    role: mapRole((sessionUser as { role?: unknown }).role),
    email: user?.email ?? sessionEmail,
    name: user?.name ?? sessionName,
  };
};
