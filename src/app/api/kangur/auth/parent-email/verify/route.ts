export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  kangurParentEmailVerifySchema,
  postKangurParentEmailVerifyHandler,
} from './handler';

export const POST = apiHandler(postKangurParentEmailVerifyHandler, {
  source: 'kangur.auth.parent-email.verify.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurParentEmailVerifySchema,
});
