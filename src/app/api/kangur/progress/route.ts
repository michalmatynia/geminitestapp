export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getKangurProgressHandler, patchKangurProgressHandler } from './handler';

export const GET = apiHandler(getKangurProgressHandler, {
  source: 'kangur.progress.GET',
  service: 'kangur.api',
  successLogging: 'all',
});

export const PATCH = apiHandler(patchKangurProgressHandler, {
  source: 'kangur.progress.PATCH',
  service: 'kangur.api',
  successLogging: 'all',
});
