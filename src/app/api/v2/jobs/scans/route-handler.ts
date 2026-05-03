export const runtime = 'nodejs';

import {
  getHandler,
  jobScanCreateRequestSchema,
  postHandler,
  querySchema,
} from '@/app/api/v2/jobs/scans/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.jobs.scans.GET',
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.jobs.scans.POST',
  parseJsonBody: true,
  bodySchema: jobScanCreateRequestSchema,
  requireAuth: true,
});
