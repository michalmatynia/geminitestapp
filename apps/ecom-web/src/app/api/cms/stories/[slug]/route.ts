import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { deleteStory, getStoryBySlug, saveStory, validateStory } from '@/lib/storiesCms';

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

export async function GET(_req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const { slug } = await params;

  try {
    const story = await getStoryBySlug(slug);
    if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    return NextResponse.json({ story });
  } catch {
    return NextResponse.json({ error: 'Failed to load story' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();
  const { slug } = await params;

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
    await saveStory(story);
    revalidatePath('/stories');
    revalidatePath(`/stories/${story.slug}`);
    return NextResponse.json({ ok: true, story });
  } catch {
    return NextResponse.json({ error: 'Failed to save story' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();
  const { slug } = await params;

  try {
    await deleteStory(slug);
    revalidatePath('/stories');
    revalidatePath(`/stories/${slug}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 });
  }
}
