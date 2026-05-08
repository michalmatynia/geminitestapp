import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getLookbookPageCmsSnapshot,
  parseLookbookPageContentUpdate,
  saveLookbookPageContent,
} from '@/lib/cms';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const locale = req.nextUrl.searchParams.get('locale') ?? undefined;
    const snapshot = await getLookbookPageCmsSnapshot(locale);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: 'Failed to load lookbook page CMS content' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { content, errors } = parseLookbookPageContentUpdate(body);
  if (!content) {
    return NextResponse.json({ error: 'Invalid lookbook page CMS content', errors }, { status: 400 });
  }

  try {
    const locale = req.nextUrl.searchParams.get('locale') ?? undefined;
    const snapshot = await saveLookbookPageContent(content, session.id, locale);
    revalidatePath('/lookbook');
    return NextResponse.json({ ok: true, ...snapshot });
  } catch {
    return NextResponse.json({ error: 'Failed to save lookbook page CMS content' }, { status: 500 });
  }
}
