export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { patchHandler } from './handler';

export const PATCH = apiHandlerWithParams<{ messageId: string }>(patchHandler, {
  source: 'filemaker.mail.messages.[messageId].flags.PATCH',
});
