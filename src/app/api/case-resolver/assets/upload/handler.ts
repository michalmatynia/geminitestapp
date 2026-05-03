import { type NextRequest, NextResponse } from 'next/server';

import {
  inferCaseResolverAssetKind,
  resolveCaseResolverUploadFolder,
} from '@/features/case-resolver/server';
import { uploadFile } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const isFileLike = (entry: FormDataEntryValue): entry is File => {
  return typeof entry === 'object' && entry !== null && 'arrayBuffer' in entry && 'size' in entry;
};

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (error) {
    void ErrorSystem.captureException(error);
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
    files.map(async (file) => {
      const inferredKind = inferCaseResolverAssetKind({
        mimeType: file.type,
        name: file.name,
      });
      const targetFolder = resolveCaseResolverUploadFolder({
        baseFolder: folder,
        kind: inferredKind,
        mimeType: file.type,
        name: file.name,
      });
      const entry = await uploadFile(file, {
        category: 'case_resolver',
        folder: targetFolder,
        allowOrphanRecord: true,
      });
      return {
        ...entry,
        originalName: file.name || entry.filename,
        folder: targetFolder,
        kind: inferredKind,
      };
    })
  );

  return NextResponse.json(uploads.length === 1 ? uploads[0] : uploads, {
    status: 201,
  });
}
