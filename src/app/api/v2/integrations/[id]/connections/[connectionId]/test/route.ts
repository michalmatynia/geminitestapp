export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postTestConnectionHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(
  postTestConnectionHandler,
  { source: 'integrations.[id].connections.[connectionId].test.POST', requireCsrf: false }
);
