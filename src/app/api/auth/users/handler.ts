import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { listAuthUsers } from '@/features/auth/server';
import { logAuthEvent } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError } from '@/shared/errors/app-error';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('auth.users.read');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
  await logAuthEvent({
    req,
    action: 'auth.users.list',
    stage: 'start',
    userId: session?.user?.id ?? null,
  });

  const users = await listAuthUsers(500);

  await logAuthEvent({
    req,
    action: 'auth.users.list',
    stage: 'success',
    userId: session?.user?.id ?? null,
    status: 200,
    extra: { count: users.length },
  });
  return NextResponse.json(
    { provider: 'mongodb', users },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
