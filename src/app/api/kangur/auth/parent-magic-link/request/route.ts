export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  kangurParentMagicLinkRequestSchema,
  postKangurParentMagicLinkRequestHandler,
} from './handler';

export const POST = apiHandler(postKangurParentMagicLinkRequestHandler, {
  source: 'kangur.auth.parent-magic-link.request.POST',
  service: 'kangur.api',
  successLogging: 'all',
  bodySchema: kangurParentMagicLinkRequestSchema,
});
