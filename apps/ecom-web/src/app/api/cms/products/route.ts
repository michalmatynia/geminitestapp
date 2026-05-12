import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteProductsContent, getProductsCmsSnapshot, parseProductsContentUpdate, saveProductsContent } from '@/lib/cms';
import { deleteLocalizedCmsRouteContent } from '@/lib/cmsRouteHandlers';
import { revalidateLocalizedPath } from '@/lib/cmsRevalidation';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) return forbidden();

  try {
    const locale = req.nextUrl.searchParams.get('locale') ?? undefined;
    const snapshot = await getProductsCmsSnapshot(locale);
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: 'Failed to load products CMS content' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) return forbidden();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { content, errors } = parseProductsContentUpdate(body);
  if (!content) {
    return NextResponse.json({ error: 'Invalid products CMS content', errors }, { status: 400 });
  }

  try {
    const locale = req.nextUrl.searchParams.get('locale') ?? undefined;
    const snapshot = await saveProductsContent(content, session.id, locale);
    revalidateLocalizedPath('/products');
    revalidateLocalizedPath('/products/[slug]', 'page');
    revalidateLocalizedPath('/collections/[slug]', 'page');
    return NextResponse.json({ ok: true, ...snapshot });
  } catch {
    return NextResponse.json({ error: 'Failed to save products CMS content' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  return deleteLocalizedCmsRouteContent({
    req,
    label: 'products',
    deleteContent: deleteProductsContent,
    revalidate: [
      { path: '/products' },
      { path: '/products/[slug]', type: 'page' },
      { path: '/collections/[slug]', type: 'page' },
    ],
  });
}
