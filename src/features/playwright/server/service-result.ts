import 'server-only';

import type { PlaywrightMissingListingRunContext } from './listing-context';
import { extractPlaywrightAppErrorMetadata } from './listing-service-utils';

export type PlaywrightServiceListingExecutionBase = {
  ok: boolean;
  externalListingId: string | null;
  listingUrl: string | null;
  error: string | null;
  errorCategory: string | null;
  metadata?: Record<string, unknown>;
};

export const buildPlaywrightServiceListingSuccess = <
  TExtra extends Record<string, unknown> = Record<string, unknown>,
>(
  input: {
    externalListingId: string | null;
    listingUrl?: string | null;
    metadata?: Record<string, unknown>;
    extra?: TExtra;
  }
): PlaywrightServiceListingExecutionBase & TExtra => ({
  ok: true,
  externalListingId: input.externalListingId,
  listingUrl: input.listingUrl ?? null,
  error: null,
  errorCategory: null,
  ...(input.metadata ? { metadata: input.metadata } : {}),
  ...(input.extra ?? ({} as TExtra)),
});

export const buildPlaywrightServiceListingFailure = <
  TExtra extends Record<string, unknown> = Record<string, unknown>,
>(
  input: {
    error: string;
    errorCategory: string | null;
    metadata?: Record<string, unknown>;
    extra?: TExtra;
  }
): PlaywrightServiceListingExecutionBase & TExtra => ({
  ok: false,
  externalListingId: null,
  listingUrl: null,
  error: input.error,
  errorCategory: input.errorCategory,
  ...(input.metadata ? { metadata: input.metadata } : {}),
  ...(input.extra ?? ({} as TExtra)),
});

export const buildPlaywrightServiceListingCaughtFailure = <
  TExtra extends Record<string, unknown> = Record<string, unknown>,
>({
  error,
  errorMessage,
  errorCategory,
  metadata,
  extra,
  includeAppErrorMetadata = true,
}: {
  error: unknown;
  errorMessage: string;
  errorCategory: string | null;
  metadata?: Record<string, unknown>;
  extra?: TExtra;
  includeAppErrorMetadata?: boolean;
}): PlaywrightServiceListingExecutionBase & TExtra => {
  const appErrorMetadata = includeAppErrorMetadata
    ? extractPlaywrightAppErrorMetadata(error)
    : undefined;
  const mergedMetadata = {
    ...(appErrorMetadata ?? {}),
    ...(metadata ?? {}),
  };

  return buildPlaywrightServiceListingFailure({
    error: errorMessage,
    errorCategory,
    ...(Object.keys(mergedMetadata).length > 0 ? { metadata: mergedMetadata } : {}),
    extra,
  });
};

export const buildPlaywrightServiceListingMissingContextFailure = <
  TExtra extends Record<string, unknown> = Record<string, unknown>,
>({
  context,
  extra,
}: {
  context: PlaywrightMissingListingRunContext;
  extra?: TExtra;
}): PlaywrightServiceListingExecutionBase & TExtra => {
  if (context.reason === 'listing_not_found') {
    return buildPlaywrightServiceListingFailure({
      error: `Listing not found: ${context.listingId}`,
      errorCategory: 'NOT_FOUND',
      extra,
    });
  }

  if (context.reason === 'connection_not_found') {
    return buildPlaywrightServiceListingFailure({
      error: `Connection not found: ${context.connectionId}`,
      errorCategory: 'NOT_FOUND',
      extra,
    });
  }

  return buildPlaywrightServiceListingFailure({
    error: `Integration not found: ${context.integrationId}`,
    errorCategory: 'NOT_FOUND',
    extra,
  });
};
