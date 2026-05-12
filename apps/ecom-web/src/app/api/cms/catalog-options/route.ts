import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getMentiosCategories, getMentiosThemeNames } from '@/lib/mentios';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) return forbidden();

  try {
    const locale = req.nextUrl.searchParams.get('locale') ?? undefined;
    const [categories, themes] = await Promise.all([
      getMentiosCategories(locale),
      getMentiosThemeNames(locale),
    ]);
    return NextResponse.json({ categories, themes });
  } catch {
    return NextResponse.json({ error: 'Failed to load catalog options' }, { status: 500 });
  }
}
