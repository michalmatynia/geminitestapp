import 'server-only';

import type { ScripterImportDraft } from '@/features/playwright/scripters';
import {
  buildCandidate,
  buildCandidateDuplicateKeys,
  type ProductScrapeCandidate,
} from './product-scrape-profiles.candidates';
import { throwIfProductScrapeAborted } from './product-scrape-profile-abort';
import {
  createOutcome,
  toResultProduct,
  type ProductScrapeDraftOutcome,
} from './product-scrape-profiles.outcomes';
import {
  createDryRunScrapeOutcome,
  processPersistedCandidate,
} from './product-scrape-profiles.persistence';
import type { ProductScrapeRunContext } from './product-scrape-profiles.run-context';

export type { ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';

const hasBlockingIssue = (draft: ScripterImportDraft): boolean =>
  draft.issues.some((issue) => issue.severity === 'error');

const formatDraftIssues = (draft: ScripterImportDraft): string =>
  draft.issues
    .map((issue) => `${issue.field}: ${issue.message}`)
    .filter((message) => message.trim().length > 0)
    .join('; ');

const markDuplicateCandidate = (
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): boolean => {
  const state = context.duplicateState;
  if (state === undefined) return false;
  const keys = buildCandidateDuplicateKeys(candidate, context.profile);
  if (keys.some((key) => state.seenKeys.has(key))) return true;
  keys.forEach((key) => state.seenKeys.add(key));
  return false;
};

const processValidScrapeCandidate = async (
  draft: ScripterImportDraft,
  candidate: ProductScrapeCandidate,
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome> => {
  if (markDuplicateCandidate(candidate, context)) {
    return createOutcome(
      toResultProduct(draft, candidate, 'skipped', {
        error: 'Duplicate scraped product in this run.',
      }),
      { skippedCount: 1 }
    );
  }
  if (context.dryRun) {
    return await createDryRunScrapeOutcome(draft, candidate, context);
  }
  try {
    return await processPersistedCandidate(draft, candidate, context);
  } catch (error) {
    throwIfProductScrapeAborted(context.signal);
    return createOutcome(
      toResultProduct(draft, candidate, 'failed', {
        error: error instanceof Error ? error.message : String(error),
      }),
      { failedCount: 1 }
    );
  }
};

const reportImportProgress = async (
  context: ProductScrapeRunContext,
  current: number,
  total: number
): Promise<void> => {
  await context.reportProgress?.({
    current,
    message: `Processed ${current} of ${total} scraped product record(s).`,
    stage: 'importing_products',
    total,
  });
};

export const processScrapeDraft = async (
  draft: ScripterImportDraft,
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome> => {
  throwIfProductScrapeAborted(context.signal);
  const candidate = buildCandidate(draft, context.profile);
  if (hasBlockingIssue(draft) && context.skipRecordsWithErrors) {
    const issueText = formatDraftIssues(draft);
    return createOutcome(
      toResultProduct(draft, candidate, 'skipped', {
        error: issueText.length > 0 ? issueText : 'Record has blocking mapping errors.',
      }),
      { skippedCount: 1 }
    );
  }
  if (candidate === null) {
    return createOutcome(
      toResultProduct(draft, candidate, 'failed', {
        error: 'Product title, SKU source, or source URL could not be resolved.',
      }),
      { failedCount: 1 }
    );
  }
  return await processValidScrapeCandidate(draft, candidate, context);
};

export const processScrapeDrafts = async (
  drafts: ScripterImportDraft[],
  context: ProductScrapeRunContext
): Promise<ProductScrapeDraftOutcome[]> => {
  const runContext: ProductScrapeRunContext = {
    ...context,
    duplicateState: context.duplicateState ?? { seenKeys: new Set<string>() },
  };
  return await drafts.reduce<Promise<ProductScrapeDraftOutcome[]>>(async (previous, draft) => {
    const outcomes = await previous;
    await runContext.waitWhilePaused?.();
    throwIfProductScrapeAborted(runContext.signal);
    outcomes.push(await processScrapeDraft(draft, runContext));
    await reportImportProgress(runContext, outcomes.length, drafts.length);
    throwIfProductScrapeAborted(runContext.signal);
    return outcomes;
  }, Promise.resolve([]));
};
