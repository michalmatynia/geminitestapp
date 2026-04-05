import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { uploadFile } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const isFileLike = (entry: FormDataEntryValue): entry is File => {
  return typeof entry === 'object' && entry !== null && 'arrayBuffer' in entry && 'size' in entry;
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    void ErrorSystem.captureException(error);
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
  z.unknown().parse(payload);

  return NextResponse.json(payload, { status: 201 });
}
