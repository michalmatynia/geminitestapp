export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurParentAccountResendSchema } from '@/shared/contracts/kangur-auth';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurParentAccountResendHandler } from './handler';

export const POST = apiHandler(postKangurParentAccountResendHandler, {
  source: 'kangur.auth.parent-account.resend.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurParentAccountResendSchema,
});
