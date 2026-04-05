import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { authError } from '@/shared/errors/app-error';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const session = await auth();
  const hasAccess =
    session?.user?.isElevated || session?.user?.permissions?.includes('settings.manage');
  if (!hasAccess) {
    throw authError('Unauthorized.');
  }
  void req;
  return NextResponse.json(
    {
      success: false,
      error:
        'Database sync is no longer supported. MongoDB is the only active database provider.',
    },
    { status: 400 }
  );
}
