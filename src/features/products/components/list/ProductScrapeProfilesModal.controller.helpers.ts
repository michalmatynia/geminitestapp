import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfile,
  ProductScrapeProfileRunRequest,
  ProductScrapeProfileRunResponse,
  ProductScrapeProfilesListResponse,
  ProductScrapeSourcePriceCurrencyCode,
} from '@/shared/contracts/products/scrape-profiles';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { getProducts, getProductsWithCount } from '@/features/products/api/products';
import type { ProductFilter } from '@/shared/contracts/products/filters';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  getStoredProfileSettings,
  type ProductScrapeProfileStoredSettings,
} from './ProductScrapeProfilesModal.storage';

export const SCRAPE_RUN_TIMEOUT_MS = 300_000;
export const SCRAPE_PROFILES_QUERY_KEY = ['products', 'scrape-profiles'] as const;

export const fetchScrapeProfiles = async (): Promise<ProductScrapeProfilesListResponse> =>
  await api.get<ProductScrapeProfilesListResponse>('/api/v2/products/scrape-profiles');

export const runScrapeProfile = async (
  request: ProductScrapeProfileRunRequest
): Promise<ProductScrapeProfileRunResponse> =>
  await api.post<ProductScrapeProfileRunResponse>(
    '/api/v2/products/scrape-profiles/run',
    request,
    { timeout: SCRAPE_RUN_TIMEOUT_MS }
  );

export const parseLimit = (value: string): number | null | undefined => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const formatCount = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

export const buildToastMessage = (result: ProductScrapeProfileRunResponse): string =>
  result.dryRun
    ? `Dry run mapped ${formatCount(result.scrapedCount, 'product')}.`
    : `Imported ${formatCount(result.createdCount, 'new product')} and updated ${result.updatedCount}.`;

export const resultVariant = (result: ProductScrapeProfileRunResponse): 'success' | 'warning' =>
  result.failedCount > 0 || result.skippedCount > 0 ? 'warning' : 'success';

export const resolveLimitError = (parsedLimit: number | null | undefined): string | null =>
  parsedLimit === undefined ? 'Limit must be a positive whole number.' : null;

const hasProfile = (profiles: ProductScrapeProfile[], profileId: string): boolean =>
  profiles.some((profile) => profile.id === profileId);

export const resolvePreferredProfileId = (
  currentProfileId: string,
  savedProfileId: string,
  profiles: ProductScrapeProfile[]
): string => {
  if (hasProfile(profiles, currentProfileId)) return currentProfileId;
  if (hasProfile(profiles, savedProfileId)) return savedProfileId;
  return profiles[0]?.id ?? '';
};

export const resolveProfileLimitInput = (
  profile: ProductScrapeProfile,
  storedSettings: ProductScrapeProfileStoredSettings
): string => {
  const storedProfileSettings = getStoredProfileSettings(storedSettings, profile.id);
  return (
    storedProfileSettings?.limitInput ??
    (profile.defaultLimit !== null ? String(profile.defaultLimit) : '')
  );
};

export const buildRunRequest = ({
  draftTemplateId,
  dryRun,
  imageImportMode,
  parsedLimit,
  profileId,
  sourcePriceCurrencyCode,
}: {
  draftTemplateId: string;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  parsedLimit: number | null | undefined;
  profileId: string;
  sourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
}): ProductScrapeProfileRunRequest => ({
  profileId,
  dryRun,
  imageImportMode,
  sourcePriceCurrencyCode,
  skipRecordsWithErrors: true,
  ...(parsedLimit !== null && parsedLimit !== undefined ? { limit: parsedLimit } : {}),
  ...(draftTemplateId.length > 0 ? { draftTemplateId } : {}),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && Array.isArray(value) === false;

const readFiltersFromQueryKeyPart = (value: unknown): ProductFilter | null => {
  if (!isRecord(value)) return null;
  const filters = value['filters'];
  return isRecord(filters) ? (filters as ProductFilter) : null;
};

const resolveProductListQuery = (
  queryKey: QueryKey
): { kind: 'list' | 'paged'; filters: ProductFilter } | null => {
  const keyParts = Array.from(queryKey);
  if (keyParts[0] !== 'products' || keyParts[1] !== 'list') return null;

  if (keyParts[2] === 'paged') {
    const filters = readFiltersFromQueryKeyPart(keyParts[3]);
    return filters === null ? null : { kind: 'paged', filters };
  }

  const filters = readFiltersFromQueryKeyPart(keyParts[2]);
  return filters === null ? null : { kind: 'list', filters };
};

const refreshProductListQueryFresh = async (
  queryClient: QueryClient,
  queryKey: QueryKey
): Promise<void> => {
  const resolved = resolveProductListQuery(queryKey);
  if (resolved === null) return;

  if (resolved.kind === 'paged') {
    const result = await getProductsWithCount(resolved.filters, undefined, { fresh: true });
    queryClient.setQueryData(queryKey, { items: result.products, total: result.total });
    return;
  }

  const products = await getProducts(resolved.filters, undefined, { fresh: true });
  queryClient.setQueryData(queryKey, products);
};

export const refreshProductListQueriesFresh = async (
  queryClient: QueryClient
): Promise<void> => {
  const listQueries = queryClient.getQueriesData({
    queryKey: QUERY_KEYS.products.lists(),
  });
  await Promise.all(
    listQueries.map(async ([queryKey]) => {
      try {
        await refreshProductListQueryFresh(queryClient, queryKey);
      } catch (error) {
        logClientError(error);
      }
    })
  );
};
