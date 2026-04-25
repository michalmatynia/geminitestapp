export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, patchHandler } from './handler';

export const GET = apiHandlerWithParams<{ organizationId: string }>(getHandler, {
  source: 'filemaker.organizations.[organizationId].GET',
});

export const PATCH = apiHandlerWithParams<{ organizationId: string }>(patchHandler, {
  source: 'filemaker.organizations.[organizationId].PATCH',
});
