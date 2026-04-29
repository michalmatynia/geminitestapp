export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ applicationId: string }>(postHandler, {
  source: 'filemaker.job-applications.[applicationId].cover-letter-pdf.POST',
});
