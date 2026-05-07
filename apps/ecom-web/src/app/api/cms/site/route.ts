import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getSiteCmsSnapshot, parseSiteContentUpdate, saveSiteContent } from '@/lib/cms';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();

  try {
    const snapshot = await getSiteCmsSnapshot();
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: 'Failed to load site CMS content' }, { status: 500 });
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

  const { content, errors } = parseSiteContentUpdate(body);
  if (!content) {
    return NextResponse.json({ error: 'Invalid site CMS content', errors }, { status: 400 });
  }

  try {
    const snapshot = await saveSiteContent(content, session.id);
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true, ...snapshot });
  } catch {
    return NextResponse.json({ error: 'Failed to save site CMS content' }, { status: 500 });
  }
}
