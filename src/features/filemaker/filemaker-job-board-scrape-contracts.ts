import { z } from 'zod';

import {
  filemakerJobListingStatusSchema,
  filemakerLexiconTermCategorySchema,
  type FilemakerLexiconTermCategory,
} from '@/shared/contracts/filemaker';
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
export const filemakerJobBoardScrapeExtractionPathSchema = z.enum([
  'playwright_ai',
  'deterministic',
  'deterministic_then_playwright',
]);
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
  duplicateStrategy: filemakerJobBoardDuplicateStrategySchema.default('update'),
  extractDescriptions: z.boolean().default(true),
  extractSalaries: z.boolean().default(true),
  extractionPath: filemakerJobBoardScrapeExtractionPathSchema.default('playwright_ai'),
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
export type FilemakerJobBoardScrapeExtractionPath = z.infer<
  typeof filemakerJobBoardScrapeExtractionPathSchema
>;
export type FilemakerJobBoardScrapeProvider = z.infer<
  typeof filemakerJobBoardScrapeProviderSchema
>;

export const filemakerJobBoardScrapedPillSchema = z.object({
  category: filemakerLexiconTermCategorySchema.default('other'),
  label: z.string().trim().min(1),
  position: z.number().int().nonnegative().default(0),
  sourceSite: z.string().trim().default(''),
  sourceUrl: jobBoardSourceUrlSchema,
});

export const filemakerJobBoardScrapedOfferSchema = z.object({
  companyName: z.string().trim().min(1),
  companyProfile: z.string().default(''),
  companyProfileUrl: z.string().trim().url().nullable().default(null),
  description: z.string().default(''),
  expiresAt: z.string().trim().nullable().default(null),
  location: z.string().default(''),
  postedAt: z.string().trim().nullable().default(null),
  salaryCurrency: z.string().trim().nullable().default(null),
  salaryMax: z.number().nonnegative().nullable().default(null),
  salaryMin: z.number().nonnegative().nullable().default(null),
  salaryPeriod: z.enum(['hourly', 'monthly', 'yearly', 'fixed']).default('monthly'),
  salaryText: z.string().default(''),
  sourceExternalId: z.string().trim().nullable().default(null),
  sourceSite: z.string().trim().default(''),
  sourceUrl: jobBoardSourceUrlSchema,
  pills: z.array(filemakerJobBoardScrapedPillSchema).max(100).default([]),
  title: z.string().trim().min(1),
});

export const filemakerJobBoardScrapeDraftSaveRequestSchema =
  filemakerJobBoardScrapeRequestSchema
    .pick({
      duplicateStrategy: true,
      importStrategy: true,
      minimumMatchConfidence: true,
      organizationScope: true,
      provider: true,
      selectedOrganizationIds: true,
      sourceUrl: true,
      status: true,
    })
    .extend({
      action: z.literal('save_drafts'),
      offers: z.array(filemakerJobBoardScrapedOfferSchema).min(1).max(250),
    });

export type FilemakerJobBoardScrapedPill = z.infer<
  typeof filemakerJobBoardScrapedPillSchema
> & {
  category: FilemakerLexiconTermCategory;
};

export type FilemakerJobBoardScrapedOffer = z.infer<
  typeof filemakerJobBoardScrapedOfferSchema
>;

export type FilemakerJobBoardScrapeDraftSaveRequest = z.infer<
  typeof filemakerJobBoardScrapeDraftSaveRequestSchema
>;

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
  createdLexiconTerms: number;
  createdOrganizations: number;
  linkedLexiconTerms: number;
  matchedOffers: number;
  profileUpdates: number;
  addressUpdates: number;
  scrapedOffers: number;
  skippedOffers: number;
  unmatchedOffers: number;
  updatedOrganizations: number;
  updatedListings: number;
  verifiedListings: number;
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

export type FilemakerJobBoardScrapeRuntimeStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

export type FilemakerJobBoardScrapeRuntimeRun = {
  completedAt: string | null;
  createdAt: string;
  error: string | null;
  id: string;
  mode: FilemakerJobBoardScrapeMode;
  result: FilemakerJobBoardScrapeResponse | null;
  sourceUrl: string;
  startedAt: string | null;
  status: FilemakerJobBoardScrapeRuntimeStatus;
  updatedAt: string;
};

export type FilemakerJobBoardScrapeRuntimeSnapshot = {
  events: FilemakerJobBoardScrapeLiveEvent[];
  run: FilemakerJobBoardScrapeRuntimeRun | null;
};

export type FilemakerJobBoardScrapeRuntimeStartResponse = {
  run: FilemakerJobBoardScrapeRuntimeRun;
};

export type FilemakerJobBoardScrapeWriteAction =
  | 'organization_address_updated'
  | 'organization_created'
  | 'organization_linked'
  | 'organization_profile_updated'
  | 'listing_lexicon_linked'
  | 'listing_created'
  | 'listing_updated'
  | 'listing_skipped'
  | 'offer_unmatched';

export type FilemakerJobBoardScrapeWriteResult = {
  action: FilemakerJobBoardScrapeWriteAction;
  message: string;
  profileUpdated: boolean;
  result: FilemakerJobBoardScrapeOfferResult;
};

export type FilemakerJobBoardScrapeLiveEvent =
  | {
      at: string;
      run: FilemakerJobBoardScrapeRuntimeRun;
      type: 'run';
    }
  | {
      at: string;
      message: string;
      type: 'status';
    }
  | {
      at: string;
      provider: Exclude<FilemakerJobBoardScrapeProvider, 'auto'>;
      runId: string | null;
      sourceSite: string;
      type: 'links';
      urls: string[];
    }
  | {
      at: string;
      index: number;
      result: FilemakerJobBoardScrapeOfferResult;
      total: number;
      type: 'offer';
    }
  | {
      at: string;
      type: 'write';
      write: FilemakerJobBoardScrapeWriteResult;
    }
  | {
      at: string;
      type: 'warning';
      warning: string;
    }
  | {
      at: string;
      result: FilemakerJobBoardScrapeResponse;
      type: 'done';
    }
  | {
      at: string;
      message: string;
      type: 'error';
    };
