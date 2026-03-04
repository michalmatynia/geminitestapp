export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { DELETE_handler } from './handler';

export const DELETE = apiHandlerWithParams<{ id: string; listingId: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.products.[id].listings.[listingId].purge.DELETE',
      context: { route: '/api/integrations/products/[id]/listings/[listingId]/purge' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/products/[id]/listings/[listingId]/purge',
      method: 'DELETE',
      source: 'api.compat.integrations.products.[id].listings.[listingId].purge.DELETE',
    });
    return DELETE_handler(req, ctx, params);
  },
  {
    source: 'integrations.products.[id].listings.[listingId].purge.DELETE',
    requireCsrf: false,
  }
);
