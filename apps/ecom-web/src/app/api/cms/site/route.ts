import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteSiteContent, getSiteCmsSnapshot, parseSiteContentUpdate, saveSiteContent } from '@/lib/cms';
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
    const snapshot = await getSiteCmsSnapshot(locale);
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
    const locale = req.nextUrl.searchParams.get('locale') ?? undefined;
    const snapshot = await saveSiteContent(content, session.id, locale);
    revalidateLocalizedPath('/', 'layout');
    return NextResponse.json({ ok: true, ...snapshot });
  } catch {
    return NextResponse.json({ error: 'Failed to save site CMS content' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  return deleteLocalizedCmsRouteContent({
    req,
    label: 'site',
    deleteContent: deleteSiteContent,
    revalidate: [{ path: '/', type: 'layout' }],
  });
}
