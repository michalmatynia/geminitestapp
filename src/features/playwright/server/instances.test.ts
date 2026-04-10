import { describe, expect, it } from 'vitest';

import {
  PLAYWRIGHT_ENGINE_INSTANCE_DEFINITIONS,
  createAiPathNodePlaywrightInstance,
  createCustomPlaywrightInstance,
  createProgrammableImportPlaywrightInstance,
  createProgrammableListingPlaywrightInstance,
  createSocialCaptureBatchPlaywrightInstance,
  createSocialCaptureSinglePlaywrightInstance,
  createTraderaCategoryScrapePlaywrightInstance,
} from './instances';

describe('playwright engine instances', () => {
  it('provides stable defaults for every built-in instance kind', () => {
    expect(PLAYWRIGHT_ENGINE_INSTANCE_DEFINITIONS).toMatchObject({
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
    });
  });

  it('builds built-in instances with default labels and tags', () => {
    expect(createAiPathNodePlaywrightInstance()).toEqual({
      kind: 'ai_path_node',
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
      label: 'Programmable Playwright import',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      tags: ['integration', 'import'],
    });
    expect(
      createTraderaCategoryScrapePlaywrightInstance({
        connectionId: 'connection-1',
        integrationId: 'integration-1',
      })
    ).toEqual({
      kind: 'tradera_category_scrape',
      label: 'Tradera public category scrape',
      connectionId: 'connection-1',
      integrationId: 'integration-1',
      tags: ['integration', 'tradera', 'taxonomy'],
    });
    expect(createSocialCaptureSinglePlaywrightInstance()).toEqual({
      kind: 'social_capture_single',
      label: 'Kangur social single capture',
      tags: ['kangur', 'social', 'capture', 'single'],
    });
    expect(createSocialCaptureBatchPlaywrightInstance()).toEqual({
      kind: 'social_capture_batch',
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
      label: 'Ad hoc browser task',
      tags: ['custom'],
      connectionId: 'connection-1',
    });
  });
});
