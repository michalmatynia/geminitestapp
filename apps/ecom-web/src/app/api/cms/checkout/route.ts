import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCheckoutCmsSnapshot, parseCheckoutContentUpdate, saveCheckoutContent } from '@/lib/cms';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) return forbidden();

  try {
    const snapshot = await getCheckoutCmsSnapshot();
    return NextResponse.json(snapshot);
  } catch {
    return NextResponse.json({ error: 'Failed to load checkout CMS content' }, { status: 500 });
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

  const { content, errors } = parseCheckoutContentUpdate(body);
  if (!content) {
    return NextResponse.json({ error: 'Invalid checkout CMS content', errors }, { status: 400 });
  }

  try {
    const snapshot = await saveCheckoutContent(content, session.id);
    revalidatePath('/checkout');
    return NextResponse.json({ ok: true, ...snapshot });
  } catch {
    return NextResponse.json({ error: 'Failed to save checkout CMS content' }, { status: 500 });
  }
}
