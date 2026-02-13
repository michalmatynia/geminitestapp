import { NextRequest, NextResponse } from 'next/server';

import { uploadFile } from '@/features/files/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const runtime = 'nodejs';
export const maxDuration = 300;

const isFileLike = (entry: FormDataEntryValue): entry is File => {
  return typeof entry === 'object' && entry !== null && 'arrayBuffer' in entry && 'size' in entry;
};

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    throw badRequestError('Invalid form data', { error });
  }

  const folderRaw = formData.get('folder');
  const folder = typeof folderRaw === 'string' ? folderRaw : '';

  const entries = [
    ...formData.getAll('file'),
    ...formData.getAll('files'),
    ...formData.getAll('image'),
  ];

  const files = entries.filter(isFileLike);
  if (files.length === 0) {
    throw badRequestError('No file provided');
  }

  const uploads = await Promise.all(
    files.map((file) =>
      uploadFile(file, {
        category: 'case_resolver',
        folder,
        allowOrphanRecord: true,
      })
    )
  );

  const payload = uploads.map((entry, index) => ({
    ...entry,
    originalName: files[index]?.name ?? entry.filename,
  }));

  return NextResponse.json(payload.length === 1 ? payload[0] : payload, { status: 201 });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'case-resolver.assets.upload.POST' }
);
