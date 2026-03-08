export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postExportToBaseHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(postExportToBaseHandler, {
  source: 'v2.integrations.products.[id].export-to-base.POST',
  requireCsrf: false,
});
