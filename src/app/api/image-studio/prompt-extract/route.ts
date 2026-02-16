export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import { postImageStudioPromptExtractHandler } from './handler';

export const POST = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    postImageStudioPromptExtractHandler(req, ctx),
  { source: 'image-studio.prompt-extract.POST' }
);
