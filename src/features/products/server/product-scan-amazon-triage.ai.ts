import 'server-only';

import type { z } from 'zod';

import type { amazonCandidateTriageResponseSchema } from './product-scan-ai-evaluator.schema';
import {
  normalizeLanguageTag,
} from './product-scan-amazon-language';
import {
  createCandidateTriageEvaluationResult,
  dedupeMismatchLabels,
  resolveAmazonRecommendedAction,
  resolveAmazonRejectionCategory,
} from './product-scan-amazon.results';
import type {
  ProductScanCandidateTriageEvaluationCandidate,
  ProductScanCandidateTriageEvaluationResult,
} from './product-scan-amazon.types';
import type {
  AmazonCandidateTriageInput,
  DeterministicTriageEntry,
} from './product-scan-amazon-triage.helpers';
import { normalizeTextList } from './product-scan-ai-evaluator.utils';

type ParsedTriageResponse = z.infer<typeof amazonCandidateTriageResponseSchema>;
type ParsedTriageCandidate = ParsedTriageResponse['candidates'][number];

export const buildCandidateTriageSystemPrompt = (
  input: AmazonCandidateTriageInput
): string =>
  [
    input.evaluatorConfig.systemPrompt,
    'Return only JSON.',
    'Rank the strongest Amazon candidates first before any Amazon page is opened.',
    'Discard obvious wrong products, wrong variants, or wrong-language marketplaces when the policy requires it.',
    resolveDeterministicHintPolicy(input),
  ]
    .join('\n');

const resolveDeterministicHintPolicy = (input: AmazonCandidateTriageInput): string =>
  input.evaluatorConfig.candidateSimilarityMode === 'ai_only'
    ? 'Deterministic hints are hints only. AI must decide whether each candidate should stay in the queue.'
    : 'Use deterministic hints as strong signals, but still discard candidates that are clearly wrong from the result metadata.';

export const normalizeAiTriageCandidates = (
  input: AmazonCandidateTriageInput,
  entries: DeterministicTriageEntry[],
  parsed: ParsedTriageResponse
): ProductScanCandidateTriageEvaluationCandidate[] => {
  const parsedByUrl = new Map(parsed.candidates.map((candidate) => [candidate.url, candidate]));
  const normalizedCandidates = entries.map((entry) =>
    createAiTriageCandidate(input, entry, parsedByUrl.get(entry.candidate.url) ?? null)
  );
  const keptCandidates = normalizeKeptCandidateRanks(normalizedCandidates);
  return normalizedCandidates
    .map((candidate) => keptCandidates.find((entry) => entry.url === candidate.url) ?? candidate)
    .sort((left, right) => left.rankBefore - right.rankBefore);
};

const createAiTriageCandidate = (
  input: AmazonCandidateTriageInput,
  entry: DeterministicTriageEntry,
  parsedCandidate: ParsedTriageCandidate | null
): ProductScanCandidateTriageEvaluationCandidate => {
  const languageAccepted = resolveAiCandidateLanguageAccepted(input, entry, parsedCandidate);
  const mismatchLabels = resolveAiCandidateMismatchLabels(parsedCandidate, languageAccepted);
  const keep = shouldKeepAiCandidate(input, parsedCandidate, languageAccepted);
  const rejectionCategory = resolveAiCandidateRejectionCategory({
    input,
    entry,
    keep,
    languageAccepted,
    mismatchLabels,
    parsedCandidate,
  });
  return {
    ...createAiCandidateBase(entry, parsedCandidate, languageAccepted),
    rankAfter: resolveAiCandidateRankAfter(keep, parsedCandidate),
    confidence: parsedCandidate?.confidence ?? null,
    languageAccepted,
    keep,
    recommendedAction: resolveAmazonRecommendedAction({
      approved: keep,
      parsedRecommendedAction: parsedCandidate?.recommendedAction ?? null,
      rejectionCategory,
    }),
    rejectionCategory,
    reasons: normalizeTextList([
      ...(parsedCandidate?.reasons ?? []),
      ...entry.deterministicReasons,
      languageAccepted === false ? entry.deterministicLanguageDecision.reason : null,
    ]),
    mismatchLabels,
  };
};

const resolveAiCandidateMismatchLabels = (
  parsedCandidate: ParsedTriageCandidate | null,
  languageAccepted: boolean | null
): ProductScanCandidateTriageEvaluationCandidate['mismatchLabels'] =>
  dedupeMismatchLabels([
    ...(parsedCandidate?.mismatchLabels ?? []),
    languageAccepted === false ? 'language' : null,
  ]);

const shouldKeepAiCandidate = (
  input: AmazonCandidateTriageInput,
  parsedCandidate: ParsedTriageCandidate | null,
  languageAccepted: boolean | null
): boolean =>
  parsedCandidate?.keep === true &&
  (input.evaluatorConfig.rejectNonEnglishContent === false || languageAccepted !== false);

const resolveAiCandidateRejectionCategory = (input: {
  input: AmazonCandidateTriageInput;
  entry: DeterministicTriageEntry;
  keep: boolean;
  languageAccepted: boolean | null;
  mismatchLabels: ProductScanCandidateTriageEvaluationCandidate['mismatchLabels'];
  parsedCandidate: ParsedTriageCandidate | null;
}): ProductScanCandidateTriageEvaluationCandidate['rejectionCategory'] =>
  resolveAmazonRejectionCategory({
    approved: input.keep,
    languageAccepted: input.languageAccepted,
    parsedRejectionCategory: input.parsedCandidate?.rejectionCategory ?? null,
    mismatchLabels: input.mismatchLabels,
    sameProduct: input.keep || input.entry.deterministicReasons.length > 0,
    pageRepresentsSameProduct: input.keep || input.entry.deterministicReasons.length > 0,
    confidence: input.parsedCandidate?.confidence ?? 0,
    threshold: input.input.evaluatorConfig.threshold,
  });

const createAiCandidateBase = (
  entry: DeterministicTriageEntry,
  parsedCandidate: ParsedTriageCandidate | null,
  languageAccepted: boolean | null
): Pick<
  ProductScanCandidateTriageEvaluationCandidate,
  'url' | 'rankBefore' | 'asin' | 'marketplaceDomain' | 'title' | 'snippet' | 'pageLanguage' | 'languageAccepted'
> => ({
  url: entry.candidate.url,
  rankBefore: entry.rankBefore,
  asin: entry.candidate.asin,
  marketplaceDomain: entry.candidate.marketplaceDomain,
  title: entry.candidate.title,
  snippet: entry.candidate.snippet,
  pageLanguage:
    normalizeLanguageTag(parsedCandidate?.pageLanguage) ??
    entry.deterministicLanguageDecision.pageLanguage,
  languageAccepted,
});

const resolveAiCandidateRankAfter = (
  keep: boolean,
  parsedCandidate: ParsedTriageCandidate | null
): number | null => {
  if (keep === false || parsedCandidate === null) return null;
  return parsedCandidate.rankAfter;
};

const resolveAiCandidateLanguageAccepted = (
  input: AmazonCandidateTriageInput,
  entry: DeterministicTriageEntry,
  parsedCandidate: ParsedTriageCandidate | null
): boolean | null => {
  if (input.evaluatorConfig.languageDetectionMode === 'deterministic_then_ai') {
    return parsedCandidate?.languageAccepted ?? entry.candidateLanguageAccepted;
  }
  return parsedCandidate?.languageAccepted ?? null;
};

const normalizeKeptCandidateRanks = (
  candidates: ProductScanCandidateTriageEvaluationCandidate[]
): ProductScanCandidateTriageEvaluationCandidate[] =>
  candidates
    .filter((candidate) => candidate.keep)
    .sort(compareKeptCandidates)
    .map((candidate, index) => ({ ...candidate, rankAfter: index + 1 }));

const compareKeptCandidates = (
  left: ProductScanCandidateTriageEvaluationCandidate,
  right: ProductScanCandidateTriageEvaluationCandidate
): number => {
  const rankDelta =
    (left.rankAfter ?? Number.MAX_SAFE_INTEGER) -
    (right.rankAfter ?? Number.MAX_SAFE_INTEGER);
  return rankDelta !== 0 ? rankDelta : left.rankBefore - right.rankBefore;
};

export const createAiTriageEvaluationResult = (input: {
  triageInput: AmazonCandidateTriageInput;
  parsed: ParsedTriageResponse;
  finalCandidates: ProductScanCandidateTriageEvaluationCandidate[];
  modelId: string | null;
}): ProductScanCandidateTriageEvaluationResult => {
  const keptCandidateUrls = input.finalCandidates
    .filter((candidate) => candidate.keep)
    .map((candidate) => candidate.url);
  return createCandidateTriageEvaluationResult({
    status: keptCandidateUrls.length > 0 ? 'approved' : 'rejected',
    stage: 'candidate_triage',
    confidence: input.finalCandidates.find((candidate) => candidate.keep)?.confidence ?? null,
    threshold: input.triageInput.evaluatorConfig.threshold,
    recommendedAction: resolveStageRecommendedAction(input, keptCandidateUrls),
    rejectionCategory: resolveStageRejectionCategory(input, keptCandidateUrls),
    reasons: resolveStageReasons(input.parsed, input.finalCandidates),
    mismatchLabels: dedupeMismatchLabels(input.finalCandidates.flatMap((candidate) => candidate.mismatchLabels)),
    modelId: input.modelId,
    brainApplied: input.triageInput.evaluatorConfig.brainApplied,
    candidates: input.finalCandidates,
    keptCandidateUrls,
    provider: input.triageInput.provider,
    error: null,
  });
};

const resolveStageRecommendedAction = (
  input: Parameters<typeof createAiTriageEvaluationResult>[0],
  keptCandidateUrls: string[]
): ProductScanCandidateTriageEvaluationResult['recommendedAction'] => {
  if (keptCandidateUrls.length > 0) return 'accept';
  const providerIssueCount = input.finalCandidates.filter(isRepeatedProviderIssue).length;
  return input.parsed.recommendedAction ??
    (providerIssueCount >= Math.min(2, input.finalCandidates.length) ? 'fallback_provider' : 'reject');
};

const isRepeatedProviderIssue = (
  candidate: ProductScanCandidateTriageEvaluationCandidate
): boolean =>
  candidate.keep === false &&
  (candidate.rejectionCategory === 'language' || candidate.rejectionCategory === 'wrong_product');

const resolveStageRejectionCategory = (
  input: Parameters<typeof createAiTriageEvaluationResult>[0],
  keptCandidateUrls: string[]
): ProductScanCandidateTriageEvaluationResult['rejectionCategory'] => {
  if (keptCandidateUrls.length > 0) return null;
  return input.parsed.rejectionCategory ??
    input.finalCandidates.find((candidate) => candidate.rejectionCategory !== null)
      ?.rejectionCategory ??
    'wrong_product';
};

const resolveStageReasons = (
  parsed: ParsedTriageResponse,
  finalCandidates: ProductScanCandidateTriageEvaluationCandidate[]
): string[] =>
  parsed.reasons.length > 0
    ? parsed.reasons
    : finalCandidates.flatMap((candidate) => candidate.reasons).slice(0, 4);

export const createFailedTriageEvaluationResult = (
  input: AmazonCandidateTriageInput,
  entries: DeterministicTriageEntry[],
  error: unknown
): ProductScanCandidateTriageEvaluationResult =>
  createCandidateTriageEvaluationResult({
    status: 'failed',
    stage: 'candidate_triage',
    confidence: null,
    threshold: input.evaluatorConfig.threshold,
    recommendedAction: 'reject',
    rejectionCategory: 'low_confidence',
    reasons: [],
    mismatchLabels: [],
    modelId: input.evaluatorConfig.modelId,
    brainApplied: input.evaluatorConfig.brainApplied,
    candidates: entries.map(createFailedCandidate),
    keptCandidateUrls: [],
    provider: input.provider,
    error: error instanceof Error ? error.message : 'Amazon candidate triage failed.',
  });

const createFailedCandidate = (
  entry: DeterministicTriageEntry
): ProductScanCandidateTriageEvaluationCandidate => ({
  url: entry.candidate.url,
  rankBefore: entry.rankBefore,
  rankAfter: null,
  confidence: null,
  keep: false,
  asin: entry.candidate.asin,
  marketplaceDomain: entry.candidate.marketplaceDomain,
  title: entry.candidate.title,
  snippet: entry.candidate.snippet,
  pageLanguage: entry.deterministicLanguageDecision.pageLanguage,
  languageAccepted: entry.candidateLanguageAccepted,
  recommendedAction: 'reject',
  rejectionCategory: null,
  reasons: [],
  mismatchLabels: [],
});
