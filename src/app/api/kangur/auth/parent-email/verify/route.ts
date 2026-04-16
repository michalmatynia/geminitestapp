
import { apiHandler } from '@/shared/lib/api/api-handler';
import { kangurParentEmailVerifySchema } from '@/shared/contracts/kangur-auth';

import { postKangurParentEmailVerifyHandler } from './handler';

export const POST = apiHandler(postKangurParentEmailVerifyHandler, {
  source: 'kangur.auth.parent-email.verify.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurParentEmailVerifySchema,
});
