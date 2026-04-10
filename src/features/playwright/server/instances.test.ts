import { describe, expect, it } from 'vitest';

import {
  PLAYWRIGHT_ENGINE_INSTANCE_DEFINITIONS,
  createAiPathNodePlaywrightInstance,
  createCustomPlaywrightInstance,
  createProgrammableImportPlaywrightInstance,
  createProgrammableListingPlaywrightInstance,
  createSocialCaptureBatchPlaywrightInstance,
  createSocialCaptureSinglePlaywrightInstance,
  createTraderaParameterMapperCatalogScrapePlaywrightInstance,
  createTraderaCategoryScrapePlaywrightInstance,
  createTraderaStandardListingPlaywrightInstance,
  createTraderaScriptedListingPlaywrightInstance,
  createTraderaListingStatusScrapePlaywrightInstance,
  createVintedBrowserListingPlaywrightInstance,
} from './instances';

describe('playwright engine instances', () => {
  it('provides stable defaults for every built-in instance kind', () => {
    expect(PLAYWRIGHT_ENGINE_INSTANCE_DEFINITIONS).toMatchObject({
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
    });
  });

  it('builds built-in instances with default labels and tags', () => {
    expect(createAiPathNodePlaywrightInstance()).toEqual({
      kind: 'ai_path_node',
      family: 'ai_path',
      label: 'AI Paths Playwright node',
      tags: ['ai-paths', 'playwright'],
    });
    expect(
      createProgrammableListingPlaywrightInstance({
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        listingId: 'listing-1',
      })
    ).toEqual({
      kind: 'programmable_listing',
      family: 'listing',
      label: 'Programmable Playwright listing',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      listingId: 'listing-1',
      tags: ['integration', 'listing'],
    });
    expect(
      createProgrammableImportPlaywrightInstance({
        connectionId: 'connection-1',
        integrationId: 'integration-1',
      })
    ).toEqual({
      kind: 'programmable_import',
      family: 'scrape',
      label: 'Programmable Playwright import',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      tags: ['integration', 'import', 'scrape'],
    });
    expect(
      createTraderaStandardListingPlaywrightInstance({
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        listingId: 'listing-1',
      })
    ).toEqual({
      kind: 'tradera_standard_listing',
      family: 'listing',
      label: 'Tradera standard browser listing',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      listingId: 'listing-1',
      tags: ['integration', 'tradera', 'listing', 'standard'],
    });
    expect(
      createTraderaScriptedListingPlaywrightInstance({
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        listingId: 'listing-1',
      })
    ).toEqual({
      kind: 'tradera_scripted_listing',
      family: 'listing',
      label: 'Tradera scripted listing',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      listingId: 'listing-1',
      tags: ['integration', 'tradera', 'listing', 'scripted'],
    });
    expect(
      createTraderaParameterMapperCatalogScrapePlaywrightInstance({
        connectionId: 'connection-1',
        integrationId: 'integration-1',
      })
    ).toEqual({
      kind: 'tradera_parameter_mapper_catalog_scrape',
      family: 'scrape',
      label: 'Tradera parameter mapper catalog scrape',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      tags: ['integration', 'tradera', 'parameter-mapper', 'scrape'],
    });
    expect(
      createTraderaCategoryScrapePlaywrightInstance({
        connectionId: 'connection-1',
        integrationId: 'integration-1',
      })
    ).toEqual({
      kind: 'tradera_category_scrape',
      family: 'scrape',
      label: 'Tradera public category scrape',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      tags: ['integration', 'tradera', 'taxonomy', 'scrape'],
    });
    expect(
      createTraderaListingStatusScrapePlaywrightInstance({
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        listingId: 'listing-1',
      })
    ).toEqual({
      kind: 'tradera_listing_status_scrape',
      family: 'scrape',
      label: 'Tradera listing status scrape',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      listingId: 'listing-1',
      tags: ['integration', 'tradera', 'status', 'scrape'],
    });
    expect(
      createVintedBrowserListingPlaywrightInstance({
        connectionId: 'connection-1',
        integrationId: 'integration-1',
        listingId: 'listing-1',
      })
    ).toEqual({
      kind: 'vinted_browser_listing',
      family: 'listing',
      label: 'Vinted browser listing',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      listingId: 'listing-1',
      tags: ['integration', 'vinted', 'listing', 'browser'],
    });
    expect(createSocialCaptureSinglePlaywrightInstance()).toEqual({
      kind: 'social_capture_single',
      family: 'capture',
      label: 'Kangur social single capture',
      tags: ['kangur', 'social', 'capture', 'single'],
    });
    expect(createSocialCaptureBatchPlaywrightInstance()).toEqual({
      kind: 'social_capture_batch',
      family: 'capture',
      label: 'Kangur social batch capture',
      tags: ['kangur', 'social', 'capture', 'batch'],
    });
  });

  it('allows explicit overrides and custom instances', () => {
    expect(
      createAiPathNodePlaywrightInstance({
        label: null,
        tags: ['custom'],
        nodeId: 'node-1',
      })
    ).toEqual({
      kind: 'ai_path_node',
      family: 'ai_path',
      label: null,
      tags: ['custom'],
      nodeId: 'node-1',
    });

    expect(
      createCustomPlaywrightInstance({
        label: 'Ad hoc browser task',
        tags: ['custom'],
        connectionId: 'connection-1',
      })
    ).toEqual({
      kind: 'custom',
      family: 'custom',
      label: 'Ad hoc browser task',
      tags: ['custom'],
      connectionId: 'connection-1',
    });
  });
});
