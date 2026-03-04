export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ runId: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.integrations.imports.base.runs.[runId].resume.POST',
      context: { route: '/api/integrations/imports/base/runs/[runId]/resume' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/integrations/imports/base/runs/[runId]/resume',
      method: 'POST',
      source: 'api.compat.integrations.imports.base.runs.[runId].resume.POST',
    });
    return POST_handler(req, ctx, params);
  },
  {
    source: 'integrations.imports.base.runs.[runId].resume.POST',
    requireCsrf: false,
  }
);
