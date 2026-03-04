export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { assertLegacyCompatRouteEnabled } from '@/shared/lib/ai-paths/legacy-compat/server';
import { recordLegacyCompatCounter } from '@/shared/lib/observability/legacy-compat-counters';

import {
  GET_metadata_id_handler,
  PUT_metadata_id_handler,
  DELETE_metadata_id_handler,
} from '../../v2/metadata/[type]/[id]/handler';

export const GET = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.countries.[id].GET',
      context: { route: '/api/countries/[id]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/countries/[id]',
      method: 'GET',
      source: 'api.compat.countries.[id].GET',
    });
    return GET_metadata_id_handler(req, ctx, { type: 'countries', id: params.id });
  },
  { source: 'countries.[id].GET' }
);

export const PUT = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.countries.[id].PUT',
      context: { route: '/api/countries/[id]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/countries/[id]',
      method: 'PUT',
      source: 'api.compat.countries.[id].PUT',
    });
    return PUT_metadata_id_handler(req, ctx, { type: 'countries', id: params.id });
  },
  { source: 'countries.[id].PUT' }
);

export const DELETE = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.countries.[id].DELETE',
      context: { route: '/api/countries/[id]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/countries/[id]',
      method: 'DELETE',
      source: 'api.compat.countries.[id].DELETE',
    });
    return DELETE_metadata_id_handler(req, ctx, { type: 'countries', id: params.id });
  },
  { source: 'countries.[id].DELETE' }
);
