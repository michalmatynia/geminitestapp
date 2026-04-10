import 'server-only';

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
