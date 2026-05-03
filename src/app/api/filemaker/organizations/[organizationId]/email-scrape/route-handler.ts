export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ organizationId: string }>(postHandler, {
  source: 'filemaker.organizations.[organizationId].email-scrape.POST',
});

