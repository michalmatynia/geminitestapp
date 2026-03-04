export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.products.[id].base.link-existing.POST',
      context: { route: '/api/integrations/products/[id]/base/link-existing' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/products/[id]/base/link-existing',
      method: 'POST',
      source: 'api.compat.integrations.products.[id].base.link-existing.POST',
    });
    return POST_handler(req, ctx, params);
  },
  {
    source: 'integrations.products.[id].base.link-existing.POST',
    requireCsrf: false,
  }
);
