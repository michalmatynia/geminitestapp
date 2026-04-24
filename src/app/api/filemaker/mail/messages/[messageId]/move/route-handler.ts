export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ messageId: string }>(postHandler, {
  source: 'filemaker.mail.messages.[messageId].move.POST',
});
