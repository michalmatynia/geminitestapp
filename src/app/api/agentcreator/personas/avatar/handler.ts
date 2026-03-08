import { NextRequest, NextResponse } from 'next/server';

import { uploadFile } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const isFileLike = (entry: FormDataEntryValue): entry is File => {
  return typeof entry === 'object' && entry !== null && 'arrayBuffer' in entry && 'size' in entry;
};

const sanitizeSegment = (value: string | null | undefined, fallback: string): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return fallback;
  return normalized.replace(/[^a-zA-Z0-9-_]/g, '_');
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    throw badRequestError('Invalid form data', { error });
  }

  const entries = [
    ...formData.getAll('file'),
    ...formData.getAll('files'),
    ...formData.getAll('image'),
  ];
  const file = entries.find(isFileLike);

  if (!file) {
    throw badRequestError('No file provided');
  }

  const personaId = sanitizeSegment(formData.get('personaId')?.toString(), 'draft');
  const moodId = sanitizeSegment(formData.get('moodId')?.toString(), 'neutral');
  const folder = `personas/${personaId}/${moodId}`;
  const uploaded = await uploadFile(file, {
    category: 'agentcreator',
    folder,
    allowOrphanRecord: true,
  });

  return NextResponse.json(
    {
      ...uploaded,
      originalName: file.name || uploaded.filename,
      folder,
    },
    { status: 201 }
  );
}
