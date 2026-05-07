import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getStoriesPageCmsSnapshot,
  parseStoriesPageContentUpdate,
  saveStoriesPageContent,
} from '@/lib/cms';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(): Promise<NextResponse> {
  try {
    const snapshot = await getStoriesPageCmsSnapshot();
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: 'Failed to load stories page CMS content' }, { status: 500 });
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

  const { content, errors } = parseStoriesPageContentUpdate(body);
  if (!content) {
    return NextResponse.json({ error: 'Invalid stories page CMS content', errors }, { status: 400 });
  }

  try {
    const snapshot = await saveStoriesPageContent(content, session.id);
    revalidatePath('/stories');
    revalidatePath('/stories/[slug]', 'page');
    return NextResponse.json({ ok: true, ...snapshot });
  } catch {
    return NextResponse.json({ error: 'Failed to save stories page CMS content' }, { status: 500 });
  }
}
