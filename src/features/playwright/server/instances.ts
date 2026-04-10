import 'server-only';

import type {
  PlaywrightEngineRunInstance,
  PlaywrightEngineRunInstanceKind,
} from './runtime';

type PlaywrightInstanceDefinition = {
  label: string;
  tags: string[];
};

type PlaywrightInstanceInput = Omit<PlaywrightEngineRunInstance, 'kind' | 'label' | 'tags'> & {
  label?: string | null;
  tags?: string[] | null;
};

export const PLAYWRIGHT_ENGINE_INSTANCE_DEFINITIONS: Record<
  Exclude<PlaywrightEngineRunInstanceKind, 'custom'>,
  PlaywrightInstanceDefinition
> = {
  ai_path_node: {
    label: 'AI Paths Playwright node',
    tags: ['ai-paths', 'playwright'],
  },
  programmable_listing: {
    label: 'Programmable Playwright listing',
    tags: ['integration', 'listing'],
  },
  programmable_import: {
    label: 'Programmable Playwright import',
    tags: ['integration', 'import'],
  },
  tradera_category_scrape: {
    label: 'Tradera public category scrape',
    tags: ['integration', 'tradera', 'taxonomy'],
  },
  social_capture_single: {
    label: 'Kangur social single capture',
    tags: ['kangur', 'social', 'capture', 'single'],
  },
  social_capture_batch: {
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

export const createTraderaCategoryScrapePlaywrightInstance = (
  input: PlaywrightInstanceInput = {}
): PlaywrightEngineRunInstance =>
  buildPlaywrightEngineInstance('tradera_category_scrape', input);

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
});
