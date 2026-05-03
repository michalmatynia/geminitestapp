export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ accountId: string }>(postHandler, {
  source: 'filemaker.mail.accounts.[accountId].sync.POST',
});
