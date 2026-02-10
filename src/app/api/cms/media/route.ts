import { NextRequest, NextResponse } from 'next/server';

import { uploadFile } from '@/features/files/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large uploads

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
    files.map((file) => uploadFile(file, { category: 'cms', allowOrphanRecord: true }))
  );
  const payload = uploads.length === 1 ? uploads[0] : uploads;

  return NextResponse.json(payload, { status: 201 });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'cms.media.POST' }
);
