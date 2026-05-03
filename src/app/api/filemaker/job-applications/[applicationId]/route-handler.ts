export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, patchHandler } from './handler';

export const GET = apiHandlerWithParams<{ applicationId: string }>(getHandler, {
  source: 'filemaker.job-applications.[applicationId].GET',
});

export const PATCH = apiHandlerWithParams<{ applicationId: string }>(patchHandler, {
  source: 'filemaker.job-applications.[applicationId].PATCH',
});

export const DELETE = apiHandlerWithParams<{ applicationId: string }>(deleteHandler, {
  source: 'filemaker.job-applications.[applicationId].DELETE',
});
