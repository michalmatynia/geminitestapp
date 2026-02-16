export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postImageStudioProjectAssetsImportHandler } from './handler';

export const POST = apiHandlerWithParams<{ projectId: string }>(
  postImageStudioProjectAssetsImportHandler,
  { source: 'image-studio.projects.[projectId].assets.import.POST' }
);
