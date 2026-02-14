const BASE_INTEGRATION_SLUG_VALUES = ['baselinker', 'base', 'base-com'] as const;
const TRADERA_INTEGRATION_SLUG_VALUES = ['tradera', 'tradera-api'] as const;

export const BASE_INTEGRATION_SLUGS = new Set<string>(
  BASE_INTEGRATION_SLUG_VALUES
);
export const TRADERA_BROWSER_INTEGRATION_SLUG = 'tradera';
export const TRADERA_API_INTEGRATION_SLUG = 'tradera-api';
export const TRADERA_INTEGRATION_SLUGS = new Set<string>(
  TRADERA_INTEGRATION_SLUG_VALUES
);

export const normalizeIntegrationSlug = (
  value: string | null | undefined
): string => (value ?? '').trim().toLowerCase();

export const isBaseIntegrationSlug = (
  value: string | null | undefined
): boolean => BASE_INTEGRATION_SLUGS.has(normalizeIntegrationSlug(value));

export const isTraderaIntegrationSlug = (
  value: string | null | undefined
): boolean => TRADERA_INTEGRATION_SLUGS.has(normalizeIntegrationSlug(value));

export const isTraderaBrowserIntegrationSlug = (
  value: string | null | undefined
): boolean =>
  normalizeIntegrationSlug(value) === TRADERA_BROWSER_INTEGRATION_SLUG;

export const isTraderaApiIntegrationSlug = (
  value: string | null | undefined
): boolean => normalizeIntegrationSlug(value) === TRADERA_API_INTEGRATION_SLUG;
