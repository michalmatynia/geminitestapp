import 'server-only';

import type { PlaywrightServiceListingExecutionBase } from './service-result';

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export type PlaywrightListingMarketplaceOutcome = Pick<
  PlaywrightServiceListingExecutionBase,
  'ok' | 'externalListingId' | 'listingUrl' | 'error' | 'errorCategory' | 'metadata'
>;

export const buildPlaywrightListingLastExecutionRecord = <
  TExtra extends Record<string, unknown> = Record<string, unknown>,
>({
  executedAt,
  result,
  requestId,
  metadata,
  includeOutcomeFields = true,
  extra,
}: {
  executedAt: Date;
  result: PlaywrightListingMarketplaceOutcome;
  requestId?: string | null;
  metadata?: Record<string, unknown> | null;
  includeOutcomeFields?: boolean;
  extra?: TExtra;
}): Record<string, unknown> => ({
  executedAt: executedAt.toISOString(),
  ...(requestId !== undefined ? { requestId } : {}),
  ...(includeOutcomeFields
    ? {
        ok: result.ok,
        error: result.error,
        errorCategory: result.errorCategory,
      }
    : {}),
  metadata: metadata ?? null,
  ...(extra ?? {}),
});

export const buildPlaywrightListingProviderRecord = <
  TProviderExtra extends Record<string, unknown> = Record<string, unknown>,
>({
  existingMarketplaceData,
  providerKey,
  result,
  lastExecution,
  providerState,
}: {
  existingMarketplaceData: Record<string, unknown> | null | undefined;
  providerKey: string;
  result: PlaywrightListingMarketplaceOutcome;
  lastExecution: Record<string, unknown>;
  providerState?: TProviderExtra;
}): Record<string, unknown> => {
  const marketplaceData = toRecord(existingMarketplaceData);
  const providerData = toRecord(marketplaceData[providerKey]);

  return {
    ...providerData,
    lastErrorCategory: result.ok ? null : result.errorCategory,
    pendingExecution: null,
    ...(providerState ?? {}),
    lastExecution,
  };
};

export const buildPlaywrightListingMarketplaceDataRecord = <
  TProviderExtra extends Record<string, unknown> = Record<string, unknown>,
>({
  existingMarketplaceData,
  marketplace,
  providerKey,
  result,
  lastExecution,
  providerState,
}: {
  existingMarketplaceData: Record<string, unknown> | null | undefined;
  marketplace: string;
  providerKey: string;
  result: PlaywrightListingMarketplaceOutcome;
  lastExecution: Record<string, unknown>;
  providerState?: TProviderExtra;
}): Record<string, unknown> => {
  const marketplaceData = toRecord(existingMarketplaceData);
  const nextListingUrl =
    result.listingUrl ??
    (typeof marketplaceData['listingUrl'] === 'string' && marketplaceData['listingUrl'].trim()
      ? marketplaceData['listingUrl']
      : null);
  const nextExternalListingId =
    result.externalListingId ??
    (typeof marketplaceData['externalListingId'] === 'string' &&
    marketplaceData['externalListingId'].trim()
      ? marketplaceData['externalListingId']
      : null);

  return {
    ...marketplaceData,
    marketplace,
    ...(nextListingUrl ? { listingUrl: nextListingUrl } : {}),
    ...(nextExternalListingId ? { externalListingId: nextExternalListingId } : {}),
    [providerKey]: buildPlaywrightListingProviderRecord({
      existingMarketplaceData,
      providerKey,
      result,
      lastExecution,
      providerState,
    }),
  };
};
