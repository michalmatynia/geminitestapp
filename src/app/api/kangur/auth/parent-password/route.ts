export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { kangurParentPasswordSchema, postKangurParentPasswordHandler } from './handler';

export const POST = apiHandler(postKangurParentPasswordHandler, {
  source: 'kangur.auth.parent-password.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurParentPasswordSchema,
});
