import 'server-only';

import type { PlaywrightServiceListingExecutionBase } from './service-result';
import {
  resolvePlaywrightHistoryBrowserMode,
  resolvePlaywrightListingEffectiveBrowserMode,
  resolvePlaywrightPersistedExternalListingId,
} from './listing-outcome';
import { buildPlaywrightListingHistoryFields } from './listing-service-utils';

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

export const buildPlaywrightMarketplaceListingProcessArtifacts = <
  TProviderExtra extends Record<string, unknown> = Record<string, unknown>,
  TLastExecutionExtra extends Record<string, unknown> = Record<string, unknown>,
>({
  executedAt,
  existingMarketplaceData,
  existingExternalListingId,
  marketplace,
  providerKey,
  result,
  requestId,
  lastExecutionMetadata,
  lastExecutionExtra,
  providerState,
}: {
  executedAt: Date;
  existingMarketplaceData: Record<string, unknown> | null | undefined;
  existingExternalListingId: unknown;
  marketplace: string;
  providerKey: string;
  result: PlaywrightListingMarketplaceOutcome;
  requestId?: string | null;
  lastExecutionMetadata?: Record<string, unknown> | null;
  lastExecutionExtra?: TLastExecutionExtra;
  providerState?: TProviderExtra;
}): {
  lastExecution: Record<string, unknown>;
  marketplaceData: Record<string, unknown>;
  historyBrowserMode: string | null;
  persistedExternalListingId: string | null;
} => {
  const lastExecution = buildPlaywrightListingLastExecutionRecord({
    executedAt,
    result,
    requestId,
    metadata: lastExecutionMetadata ?? result.metadata ?? null,
    extra: lastExecutionExtra,
  });

  return {
    lastExecution,
    marketplaceData: buildPlaywrightListingMarketplaceDataRecord({
      existingMarketplaceData,
      marketplace,
      providerKey,
      result,
      lastExecution,
      providerState,
    }),
    historyBrowserMode: resolvePlaywrightHistoryBrowserMode({
      metadata: result.metadata,
    }),
    persistedExternalListingId: resolvePlaywrightPersistedExternalListingId({
      existingExternalListingId,
      resultExternalListingId: result.externalListingId,
    }),
  };
};

export const buildPlaywrightProgrammableListingProcessArtifacts = ({
  executedAt,
  existingMarketplaceData,
  result,
  requestId,
  requestedBrowserMode,
}: {
  executedAt: Date;
  existingMarketplaceData: Record<string, unknown> | null | undefined;
  result: PlaywrightListingMarketplaceOutcome;
  requestId?: string | null;
  requestedBrowserMode: string | null;
}): {
  effectiveBrowserMode: string | null;
  historyFields: string[] | null;
  lastExecution: Record<string, unknown>;
  marketplaceData: Record<string, unknown>;
} => {
  const previousMarketplaceData = toRecord(existingMarketplaceData);
  const effectiveBrowserMode = resolvePlaywrightListingEffectiveBrowserMode({
    metadata: result.metadata,
  });
  const historyFields = buildPlaywrightListingHistoryFields({
    browserMode: resolvePlaywrightHistoryBrowserMode({
      metadata: result.metadata,
      fallback: requestedBrowserMode,
    }),
  });
  const lastExecution = buildPlaywrightListingLastExecutionRecord({
    executedAt,
    result,
    requestId,
    includeOutcomeFields: false,
    metadata: {
      runId:
        typeof result.metadata?.['runId'] === 'string'
          ? result.metadata['runId']
          : null,
      browserMode: effectiveBrowserMode,
      requestedBrowserMode,
      publishVerified:
        typeof result.metadata?.['publishVerified'] === 'boolean'
          ? result.metadata['publishVerified']
          : null,
      rawResult: result.metadata?.['rawResult'] ?? null,
    },
    extra: {
      errorCategory: result.errorCategory,
    },
  });
  const playwrightData = buildPlaywrightListingProviderRecord({
    existingMarketplaceData: previousMarketplaceData,
    providerKey: 'playwright',
    result,
    lastExecution,
  });

  return {
    effectiveBrowserMode,
    historyFields,
    lastExecution,
    marketplaceData: {
      ...previousMarketplaceData,
      marketplace: 'playwright-programmable',
      listingUrl: result.listingUrl,
      playwright: playwrightData,
    },
  };
};
