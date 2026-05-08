import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteHomeContent, getHomeCmsSnapshot, parseHomeContentUpdate, saveHomeContent } from '@/lib/cms';
import { deleteLocalizedCmsRouteContent } from '@/lib/cmsRouteHandlers';
import { revalidateLocalizedPath } from '@/lib/cmsRevalidation';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();

  try {
    const locale = req.nextUrl.searchParams.get('locale') ?? undefined;
    const snapshot = await getHomeCmsSnapshot(locale);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: 'Failed to load CMS content' }, { status: 500 });
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

  const { content, errors } = parseHomeContentUpdate(body);
  if (!content) {
    return NextResponse.json({ error: 'Invalid CMS content', errors }, { status: 400 });
  }

  try {
    const locale = req.nextUrl.searchParams.get('locale') ?? undefined;
    const snapshot = await saveHomeContent(content, session.id, locale);
    revalidateLocalizedPath('/');
    return NextResponse.json({ ok: true, ...snapshot });
  } catch {
    return NextResponse.json({ error: 'Failed to save CMS content' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  return deleteLocalizedCmsRouteContent({
    req,
    label: 'homepage',
    deleteContent: deleteHomeContent,
    revalidate: [{ path: '/' }],
  });
}
