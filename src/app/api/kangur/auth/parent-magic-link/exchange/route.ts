export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  kangurParentMagicLinkExchangeSchema,
  postKangurParentMagicLinkExchangeHandler,
} from './handler';

export const POST = apiHandler(postKangurParentMagicLinkExchangeHandler, {
  source: 'kangur.auth.parent-magic-link.exchange.POST',
  service: 'kangur.api',
  successLogging: 'all',
  bodySchema: kangurParentMagicLinkExchangeSchema,
});
