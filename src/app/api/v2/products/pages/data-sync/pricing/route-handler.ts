export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { postHandler } from './handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.pages.data-sync.pricing.POST',
  requireAuth: true,
  rateLimitKey: false,
});
