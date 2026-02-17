export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postImageStudioPromptExtractHandler } from './handler';

export const POST = apiHandler(
  postImageStudioPromptExtractHandler,
  { source: 'image-studio.prompt-extract.POST' }
);
