export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { kangurParentAccountResendSchema } from '@/shared/contracts/kangur-auth';

import { postKangurParentAccountResendHandler } from './handler';

export const POST = apiHandler(postKangurParentAccountResendHandler, {
  source: 'kangur.auth.parent-account.resend.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurParentAccountResendSchema,
});
