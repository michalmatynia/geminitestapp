export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  kangurParentAccountCreateSchema,
  postKangurParentAccountCreateHandler,
} from './handler';

export const POST = apiHandler(postKangurParentAccountCreateHandler, {
  source: 'kangur.auth.parent-account.create.POST',
  service: 'kangur.api',
  successLogging: 'all',
  bodySchema: kangurParentAccountCreateSchema,
});
