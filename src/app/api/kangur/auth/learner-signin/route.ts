export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { kangurLearnerSignInInputSchema } from '@kangur/contracts';

import { postKangurLearnerSignInHandler } from './handler';

export const POST = apiHandler(postKangurLearnerSignInHandler, {
  source: 'kangur.auth.learner-signin.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurLearnerSignInInputSchema,
});
