export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandlerWithParams<{ applicationId: string }>(getHandler, {
  source: 'filemaker.job-applications.[applicationId].apply.GET',
});

export const POST = apiHandlerWithParams<{ applicationId: string }>(postHandler, {
  source: 'filemaker.job-applications.[applicationId].apply.POST',
});
