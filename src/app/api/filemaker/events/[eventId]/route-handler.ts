export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, patchHandler } from './handler';

export const GET = apiHandlerWithParams<{ eventId: string }>(getHandler, {
  source: 'filemaker.events.[eventId].GET',
});

export const PATCH = apiHandlerWithParams<{ eventId: string }>(patchHandler, {
  source: 'filemaker.events.[eventId].PATCH',
});
