export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { patchHandler } from './handler';

export const PATCH = apiHandlerWithParams<{ accountId: string }>(patchHandler, {
  source: 'filemaker.mail.accounts.[accountId].status.PATCH',
});
