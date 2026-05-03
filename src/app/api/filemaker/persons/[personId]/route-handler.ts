export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, patchHandler } from './handler';

export const GET = apiHandlerWithParams<{ personId: string }>(getHandler, {
  source: 'filemaker.persons.[personId].GET',
});

export const PATCH = apiHandlerWithParams<{ personId: string }>(patchHandler, {
  source: 'filemaker.persons.[personId].PATCH',
});
