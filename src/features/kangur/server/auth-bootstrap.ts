import 'server-only';

import { cache } from 'react';
import { headers as nextHeaders } from 'next/headers';
import { NextRequest } from 'next/server';

import { resolveKangurActor, toKangurAuthUser } from '@/features/kangur/services/kangur-actor';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { AppErrorCodes, isAppError } from '@/shared/errors/app-error';

import type { KangurUser } from '@kangur/platform';

const KANGUR_AUTH_BOOTSTRAP_URL = 'https://kangur.local/';
const NEXT_INTERNAL_ROUTE_REQUEST_HEADERS = ['next-router-state-tree', 'next-url', 'rsc'] as const;

// Serialize as safe JSON for embedding in a <script type="application/json"> data island.
// The HTML-unsafe characters must still be escaped to prevent broken HTML structure.
const serializeBootstrapJson = (value: KangurUser | null): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const buildKangurBootstrapRequest = (requestHeaders: Headers): NextRequest =>
  new NextRequest(KANGUR_AUTH_BOOTSTRAP_URL, {
    headers: new Headers(requestHeaders),
  });

const isInternalNextRouteRequest = (requestHeaders: Headers): boolean =>
  NEXT_INTERNAL_ROUTE_REQUEST_HEADERS.some((headerName) => requestHeaders.has(headerName));

/**
 * Request-scoped cached version — reads headers internally so React cache()
 * can deduplicate across layout levels within the same request.
 * Fire-and-forget from an outer layout to overlap auth lookup with sibling
 * async work; await from the inner layout to consume the result.
 */
export const getCachedKangurAuthBootstrapScript = cache(
  async (): Promise<string | null> => {
    const incomingHeaders = await nextHeaders();
    return getKangurAuthBootstrapScript(new Headers(incomingHeaders));
  }
);

export const getKangurAuthBootstrapScript = async (
  requestHeaders: Headers
): Promise<string | null> => {
  if (isInternalNextRouteRequest(requestHeaders)) {
    return null;
  }

  try {
    const actor = await resolveKangurActor(buildKangurBootstrapRequest(requestHeaders));
    const authUser = toKangurAuthUser(actor);

    return serializeBootstrapJson(authUser);
  } catch (error) {
    if (isAppError(error) && error.code === AppErrorCodes.unauthorized) {
      return serializeBootstrapJson(null);
    }

    await ErrorSystem.captureException(error, {
      service: 'kangur.auth',
      action: 'bootstrap',
    });

    return serializeBootstrapJson(null);
  }
};
