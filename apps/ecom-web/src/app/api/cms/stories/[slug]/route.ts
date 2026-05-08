import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteStory, getStoryBySlug, saveStory, validateStory } from '@/lib/storiesCms';
import { normalizeLocale } from '@/lib/locales';
import { revalidateLocalizedPath } from '@/lib/cmsRevalidation';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function readStoryPayload(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
  const root = input as Record<string, unknown>;
  return root['story'] ?? root['content'] ?? input;
}

export async function GET(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { slug } = await params;
  const locale = normalizeLocale(req.nextUrl.searchParams.get('locale'));

  try {
    const story = await getStoryBySlug(slug, locale);
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    return NextResponse.json({ story, locale });
  } catch {
    return NextResponse.json({ error: 'Failed to load story' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();
  const { slug } = await params;
  const locale = normalizeLocale(req.nextUrl.searchParams.get('locale'));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { story, errors } = validateStory(readStoryPayload(body));
  if (!story) {
    return NextResponse.json({ error: 'Invalid story content', errors }, { status: 400 });
  }
  if (story.slug !== slug) {
    return NextResponse.json({ error: 'Story slug cannot differ from route slug.' }, { status: 400 });
  }

  try {
    await saveStory(story, locale);
    revalidateLocalizedPath('/stories');
    revalidateLocalizedPath(`/stories/${story.slug}`);
    return NextResponse.json({ ok: true, story, locale });
  } catch {
    return NextResponse.json({ error: 'Failed to save story' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();
  const { slug } = await params;
  const locale = normalizeLocale(req.nextUrl.searchParams.get('locale'));

  try {
    await deleteStory(slug, locale);
    revalidateLocalizedPath('/stories');
    revalidateLocalizedPath(`/stories/${slug}`);
    return NextResponse.json({ ok: true, locale });
  } catch {
    return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 });
  }
}
