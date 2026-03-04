export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { postExportToBaseHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.products.[id].export-to-base.POST',
      context: { route: '/api/integrations/products/[id]/export-to-base' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/products/[id]/export-to-base',
      method: 'POST',
      source: 'api.compat.integrations.products.[id].export-to-base.POST',
    });
    return postExportToBaseHandler(req, ctx, params);
  },
  {
    source: 'integrations.products.[id].export-to-base.POST',
    requireCsrf: false,
  }
);
