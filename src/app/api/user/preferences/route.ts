export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  getQuerySchema,
  getUserPreferencesHandler,
  patchUserPreferencesHandler,
} from './handler';

export const GET = apiHandler(getUserPreferencesHandler, {
  source: 'user.preferences.GET',
  querySchema: getQuerySchema,
});

export const PATCH = apiHandler(patchUserPreferencesHandler, { source: 'user.preferences.PATCH' });

// POST handler for sendBeacon (used during page unload to save AI Paths settings)
export const POST = apiHandler(patchUserPreferencesHandler, { source: 'user.preferences.POST' });
