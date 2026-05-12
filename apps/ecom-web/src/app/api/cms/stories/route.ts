import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllStories, saveStory, validateStory } from '@/lib/storiesCms';
import { normalizeLocale } from '@/lib/locales';
import { revalidateLocalizedPath } from '@/lib/cmsRevalidation';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function readStoryPayload(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
  const root = input as Record<string, unknown>;
  return root['story'] ?? root['content'] ?? input;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const locale = normalizeLocale(req.nextUrl.searchParams.get('locale'));
  try {
    const stories = await getAllStories(locale);
    return NextResponse.json({ stories, locale });
  } catch {
    return NextResponse.json({ error: 'Failed to load stories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) return forbidden();
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

  try {
    await saveStory(story, locale);
    revalidateLocalizedPath('/stories');
    revalidateLocalizedPath(`/stories/${story.slug}`);
    return NextResponse.json({ ok: true, story, locale });
  } catch {
    return NextResponse.json({ error: 'Failed to save story' }, { status: 500 });
  }
}
