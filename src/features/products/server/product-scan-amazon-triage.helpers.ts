import 'server-only';

import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';

import {
  buildDeterministicCandidateTriageReasons,
  resolveSourceProductDescription,
  resolveSourceProductName,
} from './product-scan-amazon.evidence';
import {
  resolveDeterministicCandidateLanguageDecision,
  type DeterministicLanguageDecision,
} from './product-scan-amazon-language';
import {
  createCandidateTriageEvaluationResult,
} from './product-scan-amazon.results';
import type {
  ProductScanCandidateTriageEvaluationCandidate,
  ProductScanCandidateTriageEvaluationResult,
} from './product-scan-amazon.types';
import type { ProductScannerAmazonCandidateEvaluatorResolvedConfig } from './product-scanner-settings';
import type {
  AmazonScanCandidateResult,
  AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import {
  extractAmazonAsinFromUrl,
  readOptionalString,
} from './product-scan-ai-evaluator.utils';

export type AmazonCandidateTriageInput = {
  scan: ProductScanRecord;
  product: ProductWithImages;
  parsedResult: AmazonScanRuntimeResult;
  evaluatorConfig: Extract<
    ProductScannerAmazonCandidateEvaluatorResolvedConfig,
    { enabled: true }
  >;
  provider: string | null;
};

export type DeterministicTriageEntry = {
  candidate: AmazonScanCandidateResult;
  rankBefore: number;
  deterministicReasons: string[];
  deterministicLanguageDecision: DeterministicLanguageDecision;
  candidateLanguageAccepted: boolean | null;
};

export const resolveCandidateTriageCandidates = (
  parsedResult: AmazonScanRuntimeResult
): AmazonScanCandidateResult[] => {
  if (parsedResult.candidateResults.length > 0) return parsedResult.candidateResults;
  return parsedResult.candidateUrls.map((url, index) => ({
    url,
    score: null,
    asin: extractAmazonAsinFromUrl(url),
    marketplaceDomain: resolveUrlHostname(url),
    title: null,
    snippet: null,
    rank: index + 1,
  }));
};

const resolveUrlHostname = (url: string): string | null => {
  if (readOptionalString(url) === null) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
};

export const createDeterministicTriageEntries = (
  input: AmazonCandidateTriageInput,
  candidates: AmazonScanCandidateResult[]
): DeterministicTriageEntry[] =>
  candidates.map((candidate, index) => {
    const rankBefore = resolveRankBefore(candidate.rank, index);
    const deterministicLanguageDecision = resolveDeterministicCandidateLanguageDecision(candidate);
    return {
      candidate,
      rankBefore,
      deterministicReasons: buildDeterministicCandidateTriageReasons(input.product, candidate),
      deterministicLanguageDecision,
      candidateLanguageAccepted:
        input.evaluatorConfig.languageDetectionMode === 'deterministic_then_ai'
          ? deterministicLanguageDecision.languageAccepted
          : null,
    };
  });

const resolveRankBefore = (rank: number | null, index: number): number =>
  typeof rank === 'number' && Number.isFinite(rank) && rank > 0 ? rank : index + 1;

export const createNoCandidatesTriageResult = (
  input: AmazonCandidateTriageInput
): ProductScanCandidateTriageEvaluationResult =>
  createCandidateTriageEvaluationResult({
    status: 'rejected',
    stage: 'candidate_triage',
    confidence: null,
    threshold: input.evaluatorConfig.threshold,
    recommendedAction: 'reject',
    rejectionCategory: 'wrong_product',
    reasons: ['Amazon candidate triage did not receive any Google candidate results.'],
    mismatchLabels: ['wrong_product'],
    modelId: input.evaluatorConfig.modelId,
    brainApplied: input.evaluatorConfig.brainApplied,
    candidates: [],
    keptCandidateUrls: [],
    provider: input.provider,
    error: null,
  });

export const maybeCreateDeterministicTriageResult = (
  input: AmazonCandidateTriageInput,
  entries: DeterministicTriageEntry[]
): ProductScanCandidateTriageEvaluationResult | null => {
  if (shouldUseDeterministicTriage(input) === false) return null;
  const keptEntries = entries.filter((entry) => isDeterministicKeep(input, entry));
  if (keptEntries.length === 0) return null;
  const normalizedCandidates = entries
    .map((entry) => createDeterministicCandidate(entry, keptEntries))
    .sort((left, right) => left.rankBefore - right.rankBefore);
  return createCandidateTriageEvaluationResult({
    status: 'skipped',
    stage: 'candidate_triage',
    confidence: 1,
    threshold: input.evaluatorConfig.threshold,
    recommendedAction: 'accept',
    rejectionCategory: null,
    reasons: keptEntries.flatMap((entry) => entry.deterministicReasons).slice(0, 4),
    mismatchLabels: [],
    modelId: input.evaluatorConfig.modelId,
    brainApplied: input.evaluatorConfig.brainApplied,
    candidates: normalizedCandidates,
    keptCandidateUrls: keptEntries.map((entry) => entry.candidate.url),
    provider: input.provider,
    error: null,
  });
};

const shouldUseDeterministicTriage = (input: AmazonCandidateTriageInput): boolean =>
  input.evaluatorConfig.candidateSimilarityMode !== 'ai_only' &&
  input.evaluatorConfig.onlyForAmbiguousCandidates === true;

const isDeterministicKeep = (
  input: AmazonCandidateTriageInput,
  entry: DeterministicTriageEntry
): boolean =>
  entry.deterministicReasons.length > 0 &&
  (input.evaluatorConfig.rejectNonEnglishContent === false ||
    entry.deterministicLanguageDecision.languageAccepted !== false);

const createDeterministicCandidate = (
  entry: DeterministicTriageEntry,
  keptEntries: DeterministicTriageEntry[]
): ProductScanCandidateTriageEvaluationCandidate => {
  const keepIndex = keptEntries.findIndex((keptEntry) => keptEntry.candidate.url === entry.candidate.url);
  const isKept = keepIndex >= 0;
  return {
    ...createBaseCandidate(entry),
    rankAfter: isKept ? keepIndex + 1 : null,
    confidence: entry.deterministicReasons.length > 0 ? 1 : null,
    keep: isKept,
    recommendedAction: isKept ? 'accept' : 'reject',
    rejectionCategory: resolveDeterministicRejectionCategory(entry, isKept),
    reasons: resolveDeterministicCandidateReasons(entry),
    mismatchLabels: entry.candidateLanguageAccepted === false ? ['language'] : [],
  };
};

const createBaseCandidate = (
  entry: DeterministicTriageEntry
): Omit<
  ProductScanCandidateTriageEvaluationCandidate,
  'rankAfter' | 'confidence' | 'keep' | 'recommendedAction' | 'rejectionCategory' | 'reasons' | 'mismatchLabels'
> => ({
  url: entry.candidate.url,
  rankBefore: entry.rankBefore,
  asin: entry.candidate.asin,
  marketplaceDomain: entry.candidate.marketplaceDomain,
  title: entry.candidate.title,
  snippet: entry.candidate.snippet,
  pageLanguage: entry.deterministicLanguageDecision.pageLanguage,
  languageAccepted: entry.candidateLanguageAccepted,
});

const resolveDeterministicRejectionCategory = (
  entry: DeterministicTriageEntry,
  isKept: boolean
): ProductScanCandidateTriageEvaluationCandidate['rejectionCategory'] => {
  if (isKept) return null;
  if (entry.candidateLanguageAccepted === false) return 'language';
  return entry.deterministicReasons.length > 0 ? null : 'wrong_product';
};

const resolveDeterministicCandidateReasons = (entry: DeterministicTriageEntry): string[] => {
  if (entry.deterministicReasons.length > 0) return entry.deterministicReasons;
  if (entry.candidateLanguageAccepted === false) {
    return [
      entry.deterministicLanguageDecision.reason ??
        'Candidate marketplace language is outside the allowed content policy.',
    ];
  }
  return ['Candidate remained ambiguous after deterministic checks.'];
};

export const buildCandidateTriagePromptPayload = (
  input: AmazonCandidateTriageInput,
  entries: DeterministicTriageEntry[]
): Record<string, unknown> => ({
  sourceProduct: {
    name: resolveSourceProductName(input.product, input.scan),
    description: resolveSourceProductDescription(input.product),
    asin: readOptionalString(input.product.asin),
    ean: readOptionalString(input.product.ean),
    gtin: readOptionalString(input.product.gtin),
  },
  provider: input.provider,
  candidates: entries.map(createCandidatePromptPayload),
  evaluatorPolicy: {
    candidateSimilarityMode: input.evaluatorConfig.candidateSimilarityMode,
    languageDetectionMode: input.evaluatorConfig.languageDetectionMode,
    rejectNonEnglishContent: input.evaluatorConfig.rejectNonEnglishContent,
    allowedContentLanguage: input.evaluatorConfig.allowedContentLanguage,
  },
  responseContract: {
    recommendedAction: 'accept | reject | try_next_candidate | fallback_provider',
    rejectionCategory: 'language | variant | wrong_product | low_confidence | null',
    candidates: [
      {
        url: 'candidate url',
        keep: 'boolean',
        confidence: 'number between 0 and 1 | null',
        rankAfter: 'integer rank for kept candidates | null',
        pageLanguage: 'string | null',
        languageAccepted: 'boolean | null',
        recommendedAction: 'accept | reject | try_next_candidate | fallback_provider | null',
        rejectionCategory: 'language | variant | wrong_product | low_confidence | null',
        reasons: 'string[]',
        mismatchLabels: 'brand | model | color | material | size | language | wrong_product | other',
      },
    ],
  },
});

const createCandidatePromptPayload = (entry: DeterministicTriageEntry): Record<string, unknown> => ({
  rankBefore: entry.rankBefore,
  url: entry.candidate.url,
  marketplaceDomain: entry.candidate.marketplaceDomain,
  asin: entry.candidate.asin,
  title: entry.candidate.title,
  snippet: entry.candidate.snippet,
  score: entry.candidate.score,
  deterministicMatchHints: entry.deterministicReasons,
  deterministicLanguageHint: {
    pageLanguage: entry.deterministicLanguageDecision.pageLanguage,
    languageAccepted: entry.candidateLanguageAccepted,
    reason: entry.deterministicLanguageDecision.reason,
  },
});
