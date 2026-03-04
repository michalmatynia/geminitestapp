export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { postBaseImportsHandler, requestSchema } from './handler';

export const POST = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.POST',
      context: { route: '/api/integrations/imports/base' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base',
      method: 'POST',
      source: 'api.compat.integrations.imports.base.POST',
    });
    return postBaseImportsHandler(req, ctx);
  },
  {
    source: 'products.imports.base.POST',
    requireCsrf: false,
    parseJsonBody: true,
    bodySchema: requestSchema,
  }
);
