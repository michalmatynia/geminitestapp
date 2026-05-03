import 'server-only';

import type {
  PlaywrightEngineRunInstance,
  PlaywrightEngineRunInstanceFamily,
  PlaywrightEngineRunInstanceKind,
} from './runtime';

type PlaywrightInstanceDefinition = {
  family: Exclude<PlaywrightEngineRunInstanceFamily, 'custom'>;
  label: string;
  tags: string[];
};

type PlaywrightInstanceInput = Omit<PlaywrightEngineRunInstance, 'kind' | 'family' | 'label' | 'tags'> & {
  label?: string | null;
  tags?: string[] | null;
};

export const PLAYWRIGHT_ENGINE_INSTANCE_DEFINITIONS: Record<
  Exclude<PlaywrightEngineRunInstanceKind, 'custom'>,
  PlaywrightInstanceDefinition
> = {
  ai_path_node: {
    family: 'ai_path',
    label: 'AI Paths Playwright node',
    tags: ['ai-paths', 'playwright'],
  },
  programmable_listing: {
    family: 'listing',
    label: 'Programmable Playwright listing',
    tags: ['integration', 'listing'],
  },
  programmable_import: {
    family: 'scrape',
    label: 'Programmable Playwright import',
    tags: ['integration', 'import', 'scrape'],
  },
  tradera_standard_listing: {
    family: 'listing',
    label: 'Tradera standard browser listing',
    tags: ['integration', 'tradera', 'listing', 'standard'],
  },
  tradera_scripted_listing: {
    family: 'listing',
    label: 'Tradera scripted listing',
    tags: ['integration', 'tradera', 'listing', 'scripted'],
  },
  tradera_parameter_mapper_catalog_scrape: {
    family: 'scrape',
    label: 'Tradera parameter mapper catalog scrape',
    tags: ['integration', 'tradera', 'parameter-mapper', 'scrape'],
  },
  tradera_category_scrape: {
    family: 'scrape',
    label: 'Tradera public category scrape',
    tags: ['integration', 'tradera', 'taxonomy', 'scrape'],
  },
  tradera_listing_status_scrape: {
    family: 'scrape',
    label: 'Tradera listing status scrape',
    tags: ['integration', 'tradera', 'status', 'scrape'],
  },
  vinted_browser_listing: {
    family: 'listing',
    label: 'Vinted browser listing',
    tags: ['integration', 'vinted', 'listing', 'browser'],
  },
  social_capture_single: {
    family: 'capture',
    label: 'Kangur social single capture',
    tags: ['kangur', 'social', 'capture', 'single'],
  },
  social_capture_batch: {
    family: 'capture',
    label: 'Kangur social batch capture',
    tags: ['kangur', 'social', 'capture', 'batch'],
  },
};

const buildPlaywrightEngineInstance = (
  kind: Exclude<PlaywrightEngineRunInstanceKind, 'custom'>,
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance => {
  const definition = PLAYWRIGHT_ENGINE_INSTANCE_DEFINITIONS[kind];
  return {
    kind,
    family: definition.family,
    ...input,
    label: input.label === undefined ? definition.label : input.label,
    tags: input.tags === undefined ? [...definition.tags] : input.tags,
  };
};

export const createAiPathNodePlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance => buildPlaywrightEngineInstance('ai_path_node', input);

export const createProgrammableListingPlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance => buildPlaywrightEngineInstance('programmable_listing', input);

export const createProgrammableImportPlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance => buildPlaywrightEngineInstance('programmable_import', input);

export const createTraderaStandardListingPlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance => buildPlaywrightEngineInstance('tradera_standard_listing', input);

export const createTraderaScriptedListingPlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance => buildPlaywrightEngineInstance('tradera_scripted_listing', input);

export const createTraderaParameterMapperCatalogScrapePlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance =>
  buildPlaywrightEngineInstance('tradera_parameter_mapper_catalog_scrape', input);

export const createTraderaCategoryScrapePlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance =>
  buildPlaywrightEngineInstance('tradera_category_scrape', input);

export const createTraderaListingStatusScrapePlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance =>
  buildPlaywrightEngineInstance('tradera_listing_status_scrape', input);

export const createVintedBrowserListingPlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance => buildPlaywrightEngineInstance('vinted_browser_listing', input);

export const createSocialCaptureSinglePlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance => buildPlaywrightEngineInstance('social_capture_single', input);

export const createSocialCaptureBatchPlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance => buildPlaywrightEngineInstance('social_capture_batch', input);

export const createCustomPlaywrightInstance = (
  input: Omit<PlaywrightEngineRunInstance, 'kind'> & { kind?: 'custom' }
): PlaywrightEngineRunInstance => ({
  ...input,
  kind: 'custom',
  family: input.family ?? 'custom',
});
