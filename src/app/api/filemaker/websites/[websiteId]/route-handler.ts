export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ websiteId: string }>(getHandler, {
  source: 'filemaker.websites.[websiteId].GET',
});
