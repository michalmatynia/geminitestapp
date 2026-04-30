/**
 * Registry mapping Playwright runtime keys to their handlers + timeout messages.
 *
 * Replaces the inline `if (isAmazon...) ... else if (is1688...) ...` cascade in
 * `playwright-node-runner.ts`. Adding a new site-specific runtime now means
 * registering one entry here instead of editing the dispatch switch.
 */
import type { Page } from 'playwright';

import {
  AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
  AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
  AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
} from '@/shared/lib/browser-execution/amazon-runtime-constants';
import type {
  ProductScanArtifacts,
  ProductScanHelpers,
} from '@/shared/lib/browser-execution/sequencers/ProductScanSequencer';

import { executeAmazonReverseImageScanRuntime } from './playwright-node-runner.amazon-runtime';
import {
  FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY,
  executeFilemakerOrganizationPresenceScrapeRuntime,
} from './playwright-node-runner.filemaker-runtime';
import {
  JOB_BOARD_SCRAPE_RUNTIME_KEY,
  executeJobBoardScrapeRuntime,
} from './playwright-node-runner.job-board-runtime';
import {
  SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY,
  executeSupplier1688ProbeScanRuntime,
} from './playwright-node-runner.supplier-1688-runtime';

export interface RuntimeHandlerArgs {
  page: Page;
  runtimeKey: string;
  input: Record<string, unknown>;
  emit: (port: string, value: unknown) => void;
  log: (...args: unknown[]) => void;
  artifacts: ProductScanArtifacts;
  helpers: ProductScanHelpers;
}

export interface RuntimeRegistryEntry {
  /** Runtime keys this entry handles. */
  keys: readonly string[];
  /** Message used when the run exceeds its timeout. */
  timeoutMessage: string;
  /** The handler implementation. */
  handle: (args: RuntimeHandlerArgs) => Promise<unknown>;
}

export const PLAYWRIGHT_RUNTIME_REGISTRY: readonly RuntimeRegistryEntry[] = [
  {
    keys: [
      AMAZON_REVERSE_IMAGE_SCAN_RUNTIME_KEY,
      AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
      AMAZON_CANDIDATE_EXTRACTION_RUNTIME_KEY,
    ],
    timeoutMessage: 'Amazon reverse-image runtime timed out.',
    handle: ({ page, runtimeKey, input, emit, log, artifacts, helpers }) =>
      executeAmazonReverseImageScanRuntime({
        page,
        runtimeKey,
        input,
        emit,
        log,
        artifacts,
        helpers,
      }),
  },
  {
    keys: [SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY],
    timeoutMessage: '1688 supplier probe runtime timed out.',
    handle: ({ page, input, emit, log, artifacts, helpers }) =>
      executeSupplier1688ProbeScanRuntime({ page, input, emit, log, artifacts, helpers }),
  },
  {
    keys: [FILEMAKER_ORGANIZATION_PRESENCE_SCRAPE_RUNTIME_KEY],
    timeoutMessage: 'FileMaker organisation discovery runtime timed out.',
    handle: ({ page, input, emit, log }) =>
      executeFilemakerOrganizationPresenceScrapeRuntime({ page, input, emit, log }),
  },
  {
    keys: [JOB_BOARD_SCRAPE_RUNTIME_KEY],
    timeoutMessage: 'Job board scrape runtime timed out.',
    handle: ({ page, input, emit, log, helpers }) =>
      executeJobBoardScrapeRuntime({ page, input, emit, log, helpers }),
  },
];

export function findRuntimeEntry(runtimeKey: string): RuntimeRegistryEntry | undefined {
  return PLAYWRIGHT_RUNTIME_REGISTRY.find((entry) => entry.keys.includes(runtimeKey));
}
