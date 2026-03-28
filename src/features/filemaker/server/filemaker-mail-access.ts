import 'server-only';

import { forbiddenError } from '@/shared/errors/app-error';
import { isElevatedSession } from '@/shared/lib/auth/elevated-session-user';
import { readOptionalServerAuthSession } from '@/features/auth/server';

export async function requireFilemakerMailAdminSession(): Promise<void> {
  const session = await readOptionalServerAuthSession();
  if (!isElevatedSession(session)) {
    throw forbiddenError('Admin access is required for Filemaker mail.');
  }
}

