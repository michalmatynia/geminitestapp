import { z } from 'zod';

import { filemakerJobListingStatusSchema } from '@/shared/contracts/filemaker';
import { JOB_BOARD_PROVIDER_IDS } from '@/shared/lib/job-board/job-board-providers';

export const FILEMAKER_PRACUJ_SCRAPE_ENDPOINT =
  '/api/filemaker/organizations/pracuj-scrape';
export const FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT =
  '/api/filemaker/organizations/job-board-scrape';

export const filemakerPracujScrapeModeSchema = z.enum(['preview', 'import']);
export const filemakerPracujOrganizationScopeSchema = z.enum(['all', 'selected']);
export const filemakerPracujImportStrategySchema = z.enum([
  'matched_only',
  'create_unmatched',
]);
export const filemakerPracujDuplicateStrategySchema = z.enum(['skip', 'update', 'add']);
export const filemakerJobBoardScrapeProviderSchema = z.enum([
  'auto',
  ...JOB_BOARD_PROVIDER_IDS,
]);

const jobBoardSourceUrlSchema = z.string().trim().url().refine(
  (value: string): boolean => {
    try {
      const parsed = new URL(value);
      const hostname = parsed.hostname.toLowerCase();
      return (
        parsed.protocol === 'https:' &&
        (
          hostname === 'pracuj.pl' ||
          hostname.endsWith('.pracuj.pl') ||
          hostname === 'justjoin.it' ||
          hostname.endsWith('.justjoin.it') ||
          hostname === 'nofluffjobs.com' ||
          hostname.endsWith('.nofluffjobs.com')
        )
      );
    } catch {
      return false;
    }
  },
  { message: 'Only https pracuj.pl, justjoin.it, and nofluffjobs.com links are supported.' }
);

export const filemakerPracujScrapeRequestSchema = z.object({
  delayMs: z.number().int().min(0).max(10_000).default(750),
  duplicateStrategy: filemakerPracujDuplicateStrategySchema.default('skip'),
  extractDescriptions: z.boolean().default(true),
  extractSalaries: z.boolean().default(true),
  headless: z.boolean().default(true),
  humanizeMouse: z.boolean().default(true),
  importStrategy: filemakerPracujImportStrategySchema.default('matched_only'),
  maxOffers: z.number().int().min(1).max(250).default(50),
  maxPages: z.number().int().min(1).max(20).default(2),
  minimumMatchConfidence: z.number().int().min(50).max(100).default(85),
  mode: filemakerPracujScrapeModeSchema.default('preview'),
  organizationScope: filemakerPracujOrganizationScopeSchema.default('all'),
  personaId: z.string().trim().max(160).nullable().optional().default(null),
  provider: filemakerJobBoardScrapeProviderSchema.default('auto'),
  selectedOrganizationIds: z.array(z.string().trim().min(1)).max(500).default([]),
  sourceUrl: jobBoardSourceUrlSchema,
  status: filemakerJobListingStatusSchema.default('open'),
  timeoutMs: z.number().int().min(30_000).max(600_000).default(180_000),
});

export type FilemakerPracujScrapeRequest = z.infer<
  typeof filemakerPracujScrapeRequestSchema
>;
export type FilemakerPracujScrapeMode = z.infer<typeof filemakerPracujScrapeModeSchema>;
export type FilemakerPracujOrganizationScope = z.infer<
  typeof filemakerPracujOrganizationScopeSchema
>;
export type FilemakerPracujImportStrategy = z.infer<
  typeof filemakerPracujImportStrategySchema
>;
export type FilemakerPracujDuplicateStrategy = z.infer<
  typeof filemakerPracujDuplicateStrategySchema
>;
export type FilemakerJobBoardScrapeProvider = z.infer<
  typeof filemakerJobBoardScrapeProviderSchema
>;

export type FilemakerPracujScrapedOffer = {
  companyName: string;
  description: string;
  expiresAt: string | null;
  location: string;
  postedAt: string | null;
  salaryCurrency: string | null;
  salaryMax: number | null;
  salaryMin: number | null;
  salaryPeriod: 'hourly' | 'monthly' | 'yearly' | 'fixed';
  salaryText: string;
  sourceExternalId: string | null;
  sourceSite: string;
  sourceUrl: string;
  title: string;
};

export type FilemakerPracujOrganizationMatch = {
  confidence: number;
  organizationId: string;
  organizationName: string;
  reason: string;
};

export type FilemakerPracujScrapeImportStatus =
  | 'preview'
  | 'created'
  | 'updated'
  | 'skipped'
  | 'unmatched';

export type FilemakerPracujScrapeOfferResult = {
  listingId: string | null;
  match: FilemakerPracujOrganizationMatch | null;
  offer: FilemakerPracujScrapedOffer;
  reason: string | null;
  status: FilemakerPracujScrapeImportStatus;
};

export type FilemakerPracujScrapeSummary = {
  createdListings: number;
  matchedOffers: number;
  scrapedOffers: number;
  skippedOffers: number;
  unmatchedOffers: number;
  updatedListings: number;
};

export type FilemakerPracujScrapeResponse = {
  browserMode: 'headed' | 'headless';
  mode: FilemakerPracujScrapeMode;
  offers: FilemakerPracujScrapeOfferResult[];
  provider: Exclude<FilemakerJobBoardScrapeProvider, 'auto'>;
  runId: string | null;
  sourceSite: string;
  sourceUrl: string;
  summary: FilemakerPracujScrapeSummary;
  warnings: string[];
};
