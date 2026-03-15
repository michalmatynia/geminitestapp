export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurLearnerActivityUpdateInputSchema } from '@/shared/contracts/kangur';
import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  getKangurLearnerActivityHandler,
  postKangurLearnerActivityHandler,
} from './handler';

export const GET = apiHandler(getKangurLearnerActivityHandler, {
  source: 'kangur.learnerActivity.GET',
  service: 'kangur.api',
  successLogging: 'all',
});

export const POST = apiHandler(postKangurLearnerActivityHandler, {
  source: 'kangur.learnerActivity.POST',
  service: 'kangur.api',
  successLogging: 'off',
  parseJsonBody: true,
  bodySchema: kangurLearnerActivityUpdateInputSchema,
});
