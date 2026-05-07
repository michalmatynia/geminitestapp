import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllLookbookEntries, saveLookbookEntry, validateEditorial } from '@/lib/lookbookCms';

function forbidden(): NextResponse {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

function readEntryPayload(input: unknown): unknown {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return input;
  const root = input as Record<string, unknown>;
  return root['entry'] ?? root['editorial'] ?? root['content'] ?? input;
}

export async function GET(): Promise<NextResponse> {
  try {
    const entries = await getAllLookbookEntries();
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: 'Failed to load lookbook entries' }, { status: 500 });
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

  const { editorial, errors } = validateEditorial(readEntryPayload(body));
  if (!editorial) {
    return NextResponse.json({ error: 'Invalid lookbook entry', errors }, { status: 400 });
  }

  try {
    await saveLookbookEntry(editorial);
    revalidatePath('/lookbook');
    return NextResponse.json({ ok: true, entry: editorial });
  } catch {
    return NextResponse.json({ error: 'Failed to save lookbook entry' }, { status: 500 });
  }
}
