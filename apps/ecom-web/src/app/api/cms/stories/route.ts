import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllStories, saveStory, validateStory } from '@/lib/storiesCms';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function readStoryPayload(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
  const root = input as Record<string, unknown>;
  return root['story'] ?? root['content'] ?? input;
}

export async function GET(): Promise<NextResponse> {
  try {
    const stories = await getAllStories();
    return NextResponse.json({ stories });
  } catch {
    return NextResponse.json({ error: 'Failed to load stories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();

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
    await saveStory(story);
    revalidatePath('/stories');
    revalidatePath(`/stories/${story.slug}`);
    return NextResponse.json({ ok: true, story });
  } catch {
    return NextResponse.json({ error: 'Failed to save story' }, { status: 500 });
  }
}
