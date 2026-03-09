export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurParentAccountCreateSchema } from '@/shared/contracts/kangur-auth';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurParentAccountCreateHandler } from './handler';

export const POST = apiHandler(postKangurParentAccountCreateHandler, {
  source: 'kangur.auth.parent-account.create.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurParentAccountCreateSchema,
});
