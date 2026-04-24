const BASE_INTEGRATION_SLUG_VALUES = ['baselinker', 'base', 'base-com'] as const;
const TRADERA_INTEGRATION_SLUG_VALUES = ['tradera'] as const;

export const LINKEDIN_INTEGRATION_SLUG = 'linkedin';
export const VINTED_INTEGRATION_SLUG = 'vinted';
export const SCANNER_1688_INTEGRATION_SLUG = '1688';

export const BASE_INTEGRATION_SLUGS = new Set<string>(BASE_INTEGRATION_SLUG_VALUES);
export const TRADERA_BROWSER_INTEGRATION_SLUG = 'tradera';
export const TRADERA_INTEGRATION_SLUGS = new Set<string>(TRADERA_INTEGRATION_SLUG_VALUES);

export const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export const isBaseIntegrationSlug = (value: string | null | undefined): boolean =>
  BASE_INTEGRATION_SLUGS.has(normalizeIntegrationSlug(value));

export const isTraderaIntegrationSlug = (value: string | null | undefined): boolean =>
  TRADERA_INTEGRATION_SLUGS.has(normalizeIntegrationSlug(value));

export const isVintedIntegrationSlug = (value: string | null | undefined): boolean =>
  normalizeIntegrationSlug(value) === VINTED_INTEGRATION_SLUG;

export const is1688IntegrationSlug = (value: string | null | undefined): boolean =>
  normalizeIntegrationSlug(value) === SCANNER_1688_INTEGRATION_SLUG;

export const isTraderaBrowserIntegrationSlug = (value: string | null | undefined): boolean =>
  normalizeIntegrationSlug(value) === TRADERA_BROWSER_INTEGRATION_SLUG;

export const isBrowserAutomationIntegrationSlug = (
  value: string | null | undefined
): boolean =>
  isTraderaBrowserIntegrationSlug(value) ||
  isVintedIntegrationSlug(value) ||
  is1688IntegrationSlug(value);

export const isLinkedInIntegrationSlug = (value: string | null | undefined): boolean =>
  normalizeIntegrationSlug(value) === LINKEDIN_INTEGRATION_SLUG;

export const PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG = 'playwright-programmable';

export const isPlaywrightProgrammableSlug = (value: string | null | undefined): boolean =>
  normalizeIntegrationSlug(value) === PLAYWRIGHT_PROGRAMMABLE_INTEGRATION_SLUG;
