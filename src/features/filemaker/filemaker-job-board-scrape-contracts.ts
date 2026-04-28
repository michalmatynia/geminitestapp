import { z } from 'zod';

import { filemakerJobListingStatusSchema } from '@/shared/contracts/filemaker';
import { JOB_BOARD_PROVIDER_IDS } from '@/shared/lib/job-board/job-board-providers';

export const FILEMAKER_JOB_BOARD_SCRAPE_ENDPOINT =
  '/api/filemaker/organizations/job-board-scrape';

export const filemakerJobBoardScrapeModeSchema = z.enum(['preview', 'import']);
export const filemakerJobBoardOrganizationScopeSchema = z.enum(['all', 'selected']);
export const filemakerJobBoardImportStrategySchema = z.enum([
  'matched_only',
  'create_unmatched',
]);
export const filemakerJobBoardDuplicateStrategySchema = z.enum(['skip', 'update', 'add']);
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

export const filemakerJobBoardScrapeRequestSchema = z.object({
  delayMs: z.number().int().min(0).max(10_000).default(750),
  duplicateStrategy: filemakerJobBoardDuplicateStrategySchema.default('skip'),
  extractDescriptions: z.boolean().default(true),
  extractSalaries: z.boolean().default(true),
  headless: z.boolean().nullable().optional().default(null),
  humanizeMouse: z.boolean().default(true),
  importStrategy: filemakerJobBoardImportStrategySchema.default('create_unmatched'),
  maxOffers: z.number().int().min(1).max(250).default(50),
  maxPages: z.number().int().min(1).max(20).default(2),
  minimumMatchConfidence: z.number().int().min(50).max(100).default(85),
  mode: filemakerJobBoardScrapeModeSchema.default('preview'),
  organizationScope: filemakerJobBoardOrganizationScopeSchema.default('all'),
  personaId: z.string().trim().max(160).nullable().optional().default(null),
  provider: filemakerJobBoardScrapeProviderSchema.default('auto'),
  selectedOrganizationIds: z.array(z.string().trim().min(1)).max(500).default([]),
  sourceUrl: jobBoardSourceUrlSchema,
  status: filemakerJobListingStatusSchema.default('open'),
  timeoutMs: z.number().int().min(30_000).max(600_000).default(180_000),
});

export type FilemakerJobBoardScrapeRequest = z.infer<
  typeof filemakerJobBoardScrapeRequestSchema
>;
export type FilemakerJobBoardScrapeMode = z.infer<typeof filemakerJobBoardScrapeModeSchema>;
export type FilemakerJobBoardOrganizationScope = z.infer<
  typeof filemakerJobBoardOrganizationScopeSchema
>;
export type FilemakerJobBoardImportStrategy = z.infer<
  typeof filemakerJobBoardImportStrategySchema
>;
export type FilemakerJobBoardDuplicateStrategy = z.infer<
  typeof filemakerJobBoardDuplicateStrategySchema
>;
export type FilemakerJobBoardScrapeProvider = z.infer<
  typeof filemakerJobBoardScrapeProviderSchema
>;

export type FilemakerJobBoardScrapedOffer = {
  companyName: string;
  companyProfile: string;
  companyProfileUrl: string | null;
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

export type FilemakerJobBoardOrganizationMatch = {
  confidence: number;
  organizationId: string;
  organizationName: string;
  reason: string;
};

export type FilemakerJobBoardScrapeImportStatus =
  | 'preview'
  | 'created'
  | 'updated'
  | 'skipped'
  | 'unmatched';

export type FilemakerJobBoardScrapeOfferResult = {
  listingId: string | null;
  match: FilemakerJobBoardOrganizationMatch | null;
  offer: FilemakerJobBoardScrapedOffer;
  reason: string | null;
  status: FilemakerJobBoardScrapeImportStatus;
};

export type FilemakerJobBoardScrapeSummary = {
  createdListings: number;
  matchedOffers: number;
  scrapedOffers: number;
  skippedOffers: number;
  unmatchedOffers: number;
  updatedListings: number;
};

export type FilemakerJobBoardScrapeResponse = {
  browserMode: 'headed' | 'headless';
  mode: FilemakerJobBoardScrapeMode;
  offers: FilemakerJobBoardScrapeOfferResult[];
  provider: Exclude<FilemakerJobBoardScrapeProvider, 'auto'>;
  runId: string | null;
  sourceSite: string;
  sourceUrl: string;
  summary: FilemakerJobBoardScrapeSummary;
  warnings: string[];
};
