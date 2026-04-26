export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ organizationId: string }>(getHandler, {
  source: 'filemaker.organizations.[organizationId].contact-logs.GET',
});
