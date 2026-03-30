export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, PATCH_handler, DELETE_handler } from './handler';

export const GET = apiHandlerWithParams<{ threadId: string }>(GET_handler, {
  source: 'filemaker.mail.threads.[threadId].GET',
});

export const PATCH = apiHandlerWithParams<{ threadId: string }>(PATCH_handler, {
  source: 'filemaker.mail.threads.[threadId].PATCH',
});

export const DELETE = apiHandlerWithParams<{ threadId: string }>(DELETE_handler, {
  source: 'filemaker.mail.threads.[threadId].DELETE',
});
