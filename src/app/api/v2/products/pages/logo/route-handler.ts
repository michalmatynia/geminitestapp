export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getHandler, postHandler } from './handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.products.pages.logo.GET',
  requireAuth: true,
  rateLimitKey: false,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.products.pages.logo.POST',
  requireAuth: true,
  rateLimitKey: 'upload',
});
