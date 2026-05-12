import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  deleteLookbookEntry,
  getLookbookEntry,
  saveLookbookEntry,
  validateEditorial,
} from '@/lib/lookbookCms';
import { normalizeLocale } from '@/lib/locales';
import { revalidateLocalizedPath } from '@/lib/cmsRevalidation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function readEntryPayload(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
  const root = input as Record<string, unknown>;
  return root['entry'] ?? root['editorial'] ?? root['content'] ?? input;
}

export async function GET(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { id } = await params;
  const locale = normalizeLocale(req.nextUrl.searchParams.get('locale'));

  try {
    const entry = await getLookbookEntry(id, locale);
    if (!entry) return NextResponse.json({ error: 'Lookbook entry not found' }, { status: 404 });
    return NextResponse.json({ entry, locale });
  } catch {
    return NextResponse.json({ error: 'Failed to load lookbook entry' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) return forbidden();
  const { id } = await params;
  const locale = normalizeLocale(req.nextUrl.searchParams.get('locale'));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { editorial, errors } = validateEditorial(readEntryPayload(body));
  if (!editorial) {
    return NextResponse.json({ error: 'Invalid lookbook entry', errors }, { status: 400 });
  }
  if (editorial.id !== id) {
    return NextResponse.json({ error: 'Lookbook entry id cannot differ from route id.' }, { status: 400 });
  }

  try {
    await saveLookbookEntry(editorial, locale);
    revalidateLocalizedPath('/lookbook');
    return NextResponse.json({ ok: true, entry: editorial, locale });
  } catch {
    return NextResponse.json({ error: 'Failed to save lookbook entry' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) return forbidden();
  const { id } = await params;
  const locale = normalizeLocale(req.nextUrl.searchParams.get('locale'));

  try {
    await deleteLookbookEntry(id, locale);
    revalidateLocalizedPath('/lookbook');
    return NextResponse.json({ ok: true, locale });
  } catch {
    return NextResponse.json({ error: 'Failed to delete lookbook entry' }, { status: 500 });
  }
}
