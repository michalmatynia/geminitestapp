export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { auth } from '@/features/auth/server';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(
  async () => {
    await auth().catch(() => null);
    return NextResponse.json(
      {
        ok: false,
        error: {
          message:
            'Logowanie linkiem z e-maila nie jest już dostępne. Utwórz konto albo zaloguj się e-mailem i hasłem.',
        },
      },
      { status: 410 }
    );
  },
  {
    source: 'kangur.auth.parent-magic-link.request.POST',
    requireCsrf: false,
    resolveSessionUser: false,
  }
);
