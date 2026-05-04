import 'server-only';

/**
 * Playwright Listing Runner
 * 
 * Server-side integration layer for Playwright-based web scraping operations.
 * Provides standardized interfaces for:
 * - Product listing extraction from e-commerce sites
 * - Programmable import workflows
 * - Script execution with configurable settings
 * 
 * This module acts as a bridge between the integrations feature
 * and the core Playwright automation engine, ensuring consistent
 * execution patterns and result handling.
 */

export {
  runPlaywrightProgrammableImportForConnection,
  runPlaywrightImportScript,
  runPlaywrightListingScript,
} from '@/features/playwright/server';
export type {
  PlaywrightImportResult,
  PlaywrightListingResult,
} from '@/features/playwright/server';
export type { PlaywrightExecutionSettingsSummary } from '@/features/playwright/server';
