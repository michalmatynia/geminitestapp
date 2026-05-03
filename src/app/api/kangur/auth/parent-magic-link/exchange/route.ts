
import { NextResponse } from 'next/server';

import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { readTolerantServerAuthSession } from '@/features/auth/server';

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
    source: 'kangur.auth.parent-magic-link.exchange.POST',
    requireCsrf: false,
    resolveSessionUser: false,
  }
);
