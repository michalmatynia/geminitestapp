import { apiHandlerWithParams } from '@/shared/lib/api/route-handler';

import { postHandler } from './handler';

export const runtime = 'nodejs';

export const POST = apiHandlerWithParams<{ organizationId: string }>(postHandler, {
  source: 'filemaker.organizations.[organizationId].website-social-scrape.POST',
});
