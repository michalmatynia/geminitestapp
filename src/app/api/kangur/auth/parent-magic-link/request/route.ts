export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { readTolerantServerAuthSession } from '@/shared/lib/auth/optional-server-auth';

export const POST = apiHandler(
  async () => {
    await readTolerantServerAuthSession({
      onError: (error) => ErrorSystem.captureException(error),
    });
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
