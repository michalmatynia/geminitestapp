import {
  createFilemakerJobListing,
  createFilemakerJobListingLexiconLink,
  createFilemakerLexiconTerm,
} from '../../filemaker-settings.entities';
import { normalizeFilemakerDatabase } from '../../filemaker-settings.database';
import type {
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerJobListingLexiconLink,
  FilemakerLexiconTerm,
  FilemakerLexiconTermCategory,
} from '../../types';
import {
  buildCategoryCanonicalIds,
  buildLinksByTermId,
  hasRepairSummaryChanges,
  isPracujLocationNoiseTerm,
  isPracujProviderNoiseTerm,
  mergeTermStats,
  remapTermId,
  repairPromotionCategory,
  sameStringList,
  samplePush,
  uniqueStrings,
} from './lexicon-cleanup.rules';
import type {
  FilemakerJobBoardLexiconRepairResult,
  FilemakerJobBoardLexiconRepairSummary,
} from './lexicon-cleanup.types';
import { normalizeLexiconKey } from './lexicon-rules';

export type {
  FilemakerJobBoardLexiconRepairResult,
  FilemakerJobBoardLexiconRepairSummary,
} from './lexicon-cleanup.types';

type PromotedTermResult = {
  mergedTermsByTargetId: Map<string, FilemakerLexiconTerm[]>;
  replacementTermIds: Map<string, string>;
  terms: FilemakerLexiconTerm[];
};

type PromotionContext = PromotedTermResult & {
  canonicalIdsByCategory: Map<FilemakerLexiconTermCategory, Map<string, string>>;
  database: FilemakerDatabase;
  removedTermIds: ReadonlySet<string>;
  summary: FilemakerJobBoardLexiconRepairSummary;
  linksByTermId: ReadonlyMap<string, FilemakerJobListingLexiconLink[]>;
  now: string;
};

const createRepairSummary = (beforeTermCount: number): FilemakerJobBoardLexiconRepairSummary => ({
  beforeTermCount,
  afterTermCount: beforeTermCount,
  promotedTechnologyTerms: 0,
  mergedTechnologyTerms: 0,
  promotedRequirementTerms: 0,
  mergedRequirementTerms: 0,
  promotedValidationPatternTerms: 0,
  mergedValidationPatternTerms: 0,
  removedNoiseTerms: 0,
  removedLexiconLinks: 0,
  updatedLexiconLinks: 0,
  updatedListings: 0,
  promotedSamples: [],
  mergedSamples: [],
  removedSamples: [],
});

const collectRemovedTermIds = (
  database: FilemakerDatabase,
  linksByTermId: ReadonlyMap<string, FilemakerJobListingLexiconLink[]>,
  summary: FilemakerJobBoardLexiconRepairSummary
): Set<string> => {
  const removedTermIds = new Set<string>();
  const targetSummary = summary;
  database.lexiconTerms.forEach((term: FilemakerLexiconTerm): void => {
    const links = linksByTermId.get(term.id) ?? [];
    if (!isPracujProviderNoiseTerm(term) && !isPracujLocationNoiseTerm(term, links)) return;
    removedTermIds.add(term.id);
    targetSummary.removedNoiseTerms += 1;
    samplePush(targetSummary.removedSamples, { id: term.id, label: term.label, from: term.typeKey });
  });
  return removedTermIds;
};

const incrementPromotionCounters = (
  summary: FilemakerJobBoardLexiconRepairSummary,
  promotedCategory: FilemakerLexiconTermCategory,
  mode: 'merged' | 'promoted'
): void => {
  const targetSummary = summary;
  if (mode === 'merged') {
    targetSummary.mergedValidationPatternTerms += 1;
    if (promotedCategory === 'technology') targetSummary.mergedTechnologyTerms += 1;
    if (promotedCategory === 'requirement') targetSummary.mergedRequirementTerms += 1;
    return;
  }
  targetSummary.promotedValidationPatternTerms += 1;
  if (promotedCategory === 'technology') targetSummary.promotedTechnologyTerms += 1;
  if (promotedCategory === 'requirement') targetSummary.promotedRequirementTerms += 1;
};

const canonicalIdsForCategory = (
  context: PromotionContext,
  category: FilemakerLexiconTermCategory
): Map<string, string> => {
  const existing = context.canonicalIdsByCategory.get(category);
  if (existing !== undefined) return existing;
  const canonicalIds = buildCategoryCanonicalIds(
    context.database.lexiconTerms,
    context.removedTermIds,
    category
  );
  context.canonicalIdsByCategory.set(category, canonicalIds);
  return canonicalIds;
};

const mergePromotedTerm = (
  context: PromotionContext,
  term: FilemakerLexiconTerm,
  promotedCategory: FilemakerLexiconTermCategory,
  canonicalId: string
): void => {
  context.replacementTermIds.set(term.id, canonicalId);
  const merged = context.mergedTermsByTargetId.get(canonicalId) ?? [];
  merged.push(term);
  context.mergedTermsByTargetId.set(canonicalId, merged);
  incrementPromotionCounters(context.summary, promotedCategory, 'merged');
  samplePush(context.summary.mergedSamples, {
    id: term.id,
    label: term.label,
    from: term.typeKey,
    to: promotedCategory,
  });
};

const promoteTerm = (
  context: PromotionContext,
  term: FilemakerLexiconTerm,
  promotedCategory: FilemakerLexiconTermCategory,
  termKey: string
): void => {
  canonicalIdsForCategory(context, promotedCategory).set(termKey, term.id);
  incrementPromotionCounters(context.summary, promotedCategory, 'promoted');
  samplePush(context.summary.promotedSamples, {
    id: term.id,
    label: term.label,
    from: term.typeKey,
    to: promotedCategory,
  });
  context.terms.push(
    createFilemakerLexiconTerm({
      ...term,
      normalizedLabel: termKey,
      typeKey: promotedCategory,
      category: promotedCategory,
      updatedAt: context.now,
    })
  );
};

const processLexiconTerm = (context: PromotionContext, term: FilemakerLexiconTerm): void => {
  if (context.removedTermIds.has(term.id)) return;
  const termKey = normalizeLexiconKey(term.label);
  const links = context.linksByTermId.get(term.id) ?? [];
  const promotedCategory = repairPromotionCategory(term, links, context.database);
  if (promotedCategory === null) {
    context.terms.push(term);
    return;
  }
  const canonicalId = canonicalIdsForCategory(context, promotedCategory).get(termKey);
  if (canonicalId !== undefined && canonicalId !== term.id) {
    mergePromotedTerm(context, term, promotedCategory, canonicalId);
    return;
  }
  promoteTerm(context, term, promotedCategory, termKey);
};

const buildPromotedTerms = (input: {
  database: FilemakerDatabase;
  linksByTermId: ReadonlyMap<string, FilemakerJobListingLexiconLink[]>;
  now: string;
  removedTermIds: ReadonlySet<string>;
  summary: FilemakerJobBoardLexiconRepairSummary;
}): PromotedTermResult => {
  const context: PromotionContext = {
    canonicalIdsByCategory: new Map(),
    database: input.database,
    linksByTermId: input.linksByTermId,
    mergedTermsByTargetId: new Map(),
    now: input.now,
    removedTermIds: input.removedTermIds,
    replacementTermIds: new Map(),
    summary: input.summary,
    terms: [],
  };
  input.database.lexiconTerms.forEach((term) => processLexiconTerm(context, term));
  return {
    mergedTermsByTargetId: context.mergedTermsByTargetId,
    replacementTermIds: context.replacementTermIds,
    terms: context.terms,
  };
};

const buildRepairedLinks = (input: {
  links: readonly FilemakerJobListingLexiconLink[];
  now: string;
  removedTermIds: ReadonlySet<string>;
  replacementTermIds: ReadonlyMap<string, string>;
  summary: FilemakerJobBoardLexiconRepairSummary;
  termTypeById: ReadonlyMap<string, FilemakerLexiconTermCategory>;
}): FilemakerJobListingLexiconLink[] => {
  const seenLinkRelations = new Set<string>();
  const summary = input.summary;
  return input.links.flatMap((link): FilemakerJobListingLexiconLink[] => {
    const nextTermId = remapTermId(link.lexiconTermId, input.removedTermIds, input.replacementTermIds);
    if (nextTermId === null) {
      summary.removedLexiconLinks += 1;
      return [];
    }
    const relationKey = `${link.jobListingId}:${nextTermId}`;
    if (seenLinkRelations.has(relationKey)) {
      summary.removedLexiconLinks += 1;
      return [];
    }
    seenLinkRelations.add(relationKey);
    const nextTypeKey = input.termTypeById.get(nextTermId) ?? link.typeKey;
    const changed = nextTermId !== link.lexiconTermId || nextTypeKey !== link.typeKey || nextTypeKey !== link.category;
    if (changed) summary.updatedLexiconLinks += 1;
    return [
      createFilemakerJobListingLexiconLink({
        ...link,
        lexiconTermId: nextTermId,
        typeKey: nextTypeKey,
        category: nextTypeKey,
        updatedAt: changed ? input.now : link.updatedAt,
      }),
    ];
  });
};

const buildRepairedListings = (input: {
  existingTermIds: ReadonlySet<string>;
  listings: readonly FilemakerJobListing[];
  now: string;
  removedTermIds: ReadonlySet<string>;
  replacementTermIds: ReadonlyMap<string, string>;
  summary: FilemakerJobBoardLexiconRepairSummary;
}): FilemakerJobListing[] =>
  input.listings.map((listing): FilemakerJobListing => {
    const summary = input.summary;
    const nextLexiconTermIds = uniqueStrings(
      listing.lexiconTermIds
        .map((termId) => remapTermId(termId, input.removedTermIds, input.replacementTermIds))
        .filter((termId): termId is string => termId !== null && input.existingTermIds.has(termId))
    );
    if (sameStringList(listing.lexiconTermIds, nextLexiconTermIds)) return listing;
    summary.updatedListings += 1;
    return createFilemakerJobListing({
      ...listing,
      lexiconTermIds: nextLexiconTermIds,
      updatedAt: input.now,
    });
  });

export const repairFilemakerJobBoardLexicon = (
  database: FilemakerDatabase
): FilemakerJobBoardLexiconRepairResult => {
  const normalizedDatabase = normalizeFilemakerDatabase(database);
  const linksByTermId = buildLinksByTermId(normalizedDatabase.jobListingLexiconLinks);
  const now = new Date().toISOString();
  const summary = createRepairSummary(normalizedDatabase.lexiconTerms.length);
  const removedTermIds = collectRemovedTermIds(normalizedDatabase, linksByTermId, summary);
  const promotedTerms = buildPromotedTerms({
    database: normalizedDatabase,
    linksByTermId,
    now,
    removedTermIds,
    summary,
  });
  const mergedTerms = promotedTerms.terms.map((term) =>
    mergeTermStats(term, promotedTerms.mergedTermsByTargetId.get(term.id) ?? [], now)
  );
  const termTypeById = new Map(
    mergedTerms.map((term): [string, FilemakerLexiconTermCategory] => [term.id, term.typeKey])
  );
  const existingTermIds = new Set(mergedTerms.map((term) => term.id));
  const nextDatabase = normalizeFilemakerDatabase({
    ...normalizedDatabase,
    lexiconTerms: mergedTerms,
    jobListingLexiconLinks: buildRepairedLinks({
      links: normalizedDatabase.jobListingLexiconLinks,
      now,
      removedTermIds,
      replacementTermIds: promotedTerms.replacementTermIds,
      summary,
      termTypeById,
    }),
    jobListings: buildRepairedListings({
      existingTermIds,
      listings: normalizedDatabase.jobListings,
      now,
      removedTermIds,
      replacementTermIds: promotedTerms.replacementTermIds,
      summary,
    }),
  });
  summary.afterTermCount = mergedTerms.length;
  return { changed: hasRepairSummaryChanges(summary), database: nextDatabase, summary };
};
