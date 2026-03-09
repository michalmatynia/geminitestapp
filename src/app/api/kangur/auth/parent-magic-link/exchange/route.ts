import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message:
          'Logowanie linkiem z emaila nie jest juz dostepne. Utworz konto albo zaloguj sie emailem i haslem.',
      },
    },
    { status: 410 }
  );
}
