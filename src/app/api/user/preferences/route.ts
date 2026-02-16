export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import {
  getUserPreferencesHandler,
  patchUserPreferencesHandler,
} from './handler';

export const GET = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    getUserPreferencesHandler(req, ctx),
  { source: 'user.preferences.GET' }
);

export const PATCH = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    patchUserPreferencesHandler(req, ctx),
  { source: 'user.preferences.PATCH' }
);

// POST handler for sendBeacon (used during page unload to save AI Paths settings)
export const POST = apiHandler(
  async (req, ctx: ApiHandlerContext): Promise<Response> =>
    patchUserPreferencesHandler(req, ctx),
  { source: 'user.preferences.POST' }
);
