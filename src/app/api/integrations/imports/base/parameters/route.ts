export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { getBaseImportParametersHandler, postBaseImportParametersHandler } from './handler';

export const POST = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.parameters.POST',
      context: { route: '/api/integrations/imports/base/parameters' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/parameters',
      method: 'POST',
      source: 'api.compat.integrations.imports.base.parameters.POST',
    });
    return postBaseImportParametersHandler(req, ctx);
  },
  {
    source: 'products.imports.base.parameters.POST',
    requireCsrf: false,
  }
);

export const GET = apiHandler(
  (req, ctx) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.parameters.GET',
      context: { route: '/api/integrations/imports/base/parameters' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/parameters',
      method: 'GET',
      source: 'api.compat.integrations.imports.base.parameters.GET',
    });
    return getBaseImportParametersHandler(req, ctx);
  },
  {
    source: 'products.imports.base.parameters.GET',
    requireCsrf: false,
  }
);
