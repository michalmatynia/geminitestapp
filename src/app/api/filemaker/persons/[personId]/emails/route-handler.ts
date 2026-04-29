export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ personId: string }>(postHandler, {
  source: 'filemaker.persons.[personId].emails.POST',
});
