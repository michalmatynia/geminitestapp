export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getHandler, putHandler } from './handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(getHandler, {
  source: 'v2.products.pages.collection-cards.GET',
  requireAuth: true,
  rateLimitKey: false,
});

export const PUT = apiHandler(putHandler, {
  source: 'v2.products.pages.collection-cards.PUT',
  requireAuth: true,
  rateLimitKey: false,
});
