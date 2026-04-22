export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, patchHandler, deleteHandler } from './handler';

export const GET = apiHandlerWithParams<{ threadId: string }>(getHandler, {
  source: 'filemaker.mail.threads.[threadId].GET',
});

export const PATCH = apiHandlerWithParams<{ threadId: string }>(patchHandler, {
  source: 'filemaker.mail.threads.[threadId].PATCH',
});

export const DELETE = apiHandlerWithParams<{ threadId: string }>(deleteHandler, {
  source: 'filemaker.mail.threads.[threadId].DELETE',
});
