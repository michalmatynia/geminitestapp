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
      source: 'api.compat.languages.[id].GET',
      context: { route: '/api/languages/[id]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/languages/[id]',
      method: 'GET',
      source: 'api.compat.languages.[id].GET',
    });
    return GET_metadata_id_handler(req, ctx, { type: 'languages', id: params.id });
  },
  { source: 'languages.[id].GET' }
);

export const PUT = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.languages.[id].PUT',
      context: { route: '/api/languages/[id]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/languages/[id]',
      method: 'PUT',
      source: 'api.compat.languages.[id].PUT',
    });
    return PUT_metadata_id_handler(req, ctx, { type: 'languages', id: params.id });
  },
  { source: 'languages.[id].PUT' }
);

export const DELETE = apiHandlerWithParams<{ id: string }>(
  (req, ctx, params) => {
    recordLegacyCompatCounter('compat_route_hit', {
      source: 'api.compat.languages.[id].DELETE',
      context: { route: '/api/languages/[id]' },
    });
    assertLegacyCompatRouteEnabled({
      route: '/api/languages/[id]',
      method: 'DELETE',
      source: 'api.compat.languages.[id].DELETE',
    });
    return DELETE_metadata_id_handler(req, ctx, { type: 'languages', id: params.id });
  },
  { source: 'languages.[id].DELETE' }
);
