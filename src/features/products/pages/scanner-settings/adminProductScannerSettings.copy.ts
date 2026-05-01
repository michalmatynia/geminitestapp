import type { ProductScannerSettingsDraft } from '../../scanner-settings';

export const CUSTOM_PERSONA_VALUE = 'custom';
export const CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE = '__custom__';

export const AMAZON_IMAGE_SEARCH_PAGE_OPTIONS = [
  { value: '', label: 'Built-in Google Lens direct upload' },
  { value: 'https://lens.google.com/?hl=en', label: 'Google Lens direct upload' },
  { value: 'https://images.google.com/?hl=en', label: 'Google Images legacy page' },
  { value: 'https://www.google.com/imghp?hl=en', label: 'Google Images homepage' },
  { value: CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE, label: 'Custom URL' },
];

type AmazonCandidateEvaluator = Pick<
  ProductScannerSettingsDraft,
  | 'amazonCandidateEvaluatorTriage'
  | 'amazonCandidateEvaluatorProbe'
  | 'amazonCandidateEvaluatorExtraction'
>[keyof Pick<
  ProductScannerSettingsDraft,
  | 'amazonCandidateEvaluatorTriage'
  | 'amazonCandidateEvaluatorProbe'
  | 'amazonCandidateEvaluatorExtraction'
>];

export const toPositiveInteger = (value: string, fallback: number): number => {
  const normalized = Number.parseInt(value, 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
};

export const toUnitInterval = (value: string, fallback: number): number => {
  const normalized = Number.parseFloat(value);
  if (!Number.isFinite(normalized)) return fallback;
  return Math.min(1, Math.max(0, normalized));
};

export const formatConfidenceThresholdLabel = (value: number): string =>
  `${Math.round(Math.min(1, Math.max(0, value)) * 100)}% confidence`;

export const resolveAmazonImageSearchPageSelectValue = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';
  const hasPreset = AMAZON_IMAGE_SEARCH_PAGE_OPTIONS.some((option) => option.value === trimmed);
  return hasPreset ? trimmed : CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE;
};

const resolveAmazonSimilarityPolicyLine = (evaluator: AmazonCandidateEvaluator): string => {
  if (evaluator.candidateSimilarityMode === 'ai_only') {
    return 'AI review runs on every Amazon candidate and decides product similarity itself.';
  }
  if (evaluator.onlyForAmbiguousCandidates) {
    return 'AI review runs only when the Amazon candidate remains ambiguous after deterministic identifier checks.';
  }
  return 'AI review runs on every Amazon candidate after deterministic identifier hints are gathered.';
};

const resolveAmazonLanguagePolicyLines = (evaluator: AmazonCandidateEvaluator): string[] => {
  if (!evaluator.rejectNonEnglishContent) {
    return [
      'Language does not block extraction in the current evaluator policy.',
      'Language review is informational only when extraction is not blocked by content language.',
      'Matched products can still be scraped even when page language is not English.',
    ];
  }
  const detectionLine =
    evaluator.languageDetectionMode === 'ai_only'
      ? 'The evaluator decides page language during every reviewed AI pass.'
      : 'The scanner uses probe language hints first and asks AI when page language remains unclear.';
  return [
    'Only English Amazon page content is trusted for scraping into English product fields.',
    detectionLine,
    'Matched products on non-English Amazon pages are rejected and the scanner moves to the next candidate when one is available.',
  ];
};

export const resolveAmazonEvaluatorPolicyLines = (
  evaluator: AmazonCandidateEvaluator
): string[] => {
  if (evaluator.mode === 'disabled') {
    return [
      'AI review is disabled. The scanner trusts the Amazon candidate flow without an evaluator gate.',
    ];
  }
  const deterministicLine =
    evaluator.candidateSimilarityMode === 'ai_only'
      ? 'Deterministic identifier matches are passed to the model as hints and cannot bypass AI review.'
      : 'Deterministic identifier matches can bypass AI review when the candidate is configured as non-ambiguous.';
  return [
    resolveAmazonSimilarityPolicyLine(evaluator),
    deterministicLine,
    ...resolveAmazonLanguagePolicyLines(evaluator),
    `Candidates must meet ${formatConfidenceThresholdLabel(evaluator.threshold)} to be trusted.`,
    'Rejected candidates continue to the next Amazon candidate when one is available; otherwise the scan finishes as No Match.',
    'Evaluator runtime errors fail the scan conservatively instead of trusting the page.',
  ];
};

export const resolveAmazonEvaluatorModelLabel = (
  evaluator: AmazonCandidateEvaluator,
  brainDefaultModelLabel: string
): string => {
  if (evaluator.mode === 'disabled') return 'Disabled';
  if (evaluator.mode === 'brain_default') {
    const trimmed = brainDefaultModelLabel.trim();
    return trimmed.length > 0 ? trimmed : 'Not configured in AI Brain';
  }
  const modelId = evaluator.modelId?.trim() ?? '';
  return modelId.length > 0 ? modelId : 'Select a model';
};

const resolveAmazonReviewScopeLine = (evaluator: AmazonCandidateEvaluator): string => {
  if (evaluator.candidateSimilarityMode === 'ai_only') return 'Review scope: Every Amazon candidate';
  if (evaluator.onlyForAmbiguousCandidates) return 'Review scope: Ambiguous candidates only';
  return 'Review scope: Every Amazon candidate';
};

const resolveAmazonLanguageGateLine = (evaluator: AmazonCandidateEvaluator): string => {
  if (!evaluator.rejectNonEnglishContent) return 'Language gate: Inactive';
  if (evaluator.languageDetectionMode === 'ai_only') {
    return 'Language gate: English only, AI decides language';
  }
  return 'Language gate: English only, probe hints first';
};

export const resolveAmazonEvaluatorSummaryLines = (
  evaluator: AmazonCandidateEvaluator,
  effectiveModelLabel: string
): string[] => {
  if (evaluator.mode === 'disabled') {
    return [
      'Model: Disabled',
      'Trust policy: Amazon pages are trusted without AI review.',
      'Language gate: Inactive',
      'Continuation: No AI rejection recovery path',
    ];
  }
  const modelSource = evaluator.mode === 'brain_default' ? 'AI Brain default' : 'Scanner override';
  const similarity =
    evaluator.candidateSimilarityMode === 'ai_only' ? 'AI only' : 'Deterministic hints, then AI';
  return [
    `Model source: ${modelSource}`,
    `Resolved model: ${effectiveModelLabel}`,
    `Trust threshold: ${formatConfidenceThresholdLabel(evaluator.threshold)}`,
    `Similarity decision: ${similarity}`,
    resolveAmazonReviewScopeLine(evaluator),
    resolveAmazonLanguageGateLine(evaluator),
    'Continuation: Try next Amazon candidate after rejection',
  ];
};

export const resolve1688EvaluatorPolicyLines = (
  draft: Pick<ProductScannerSettingsDraft, 'scanner1688CandidateEvaluator'>
): string[] => {
  const evaluator = draft.scanner1688CandidateEvaluator;
  if (evaluator.mode === 'disabled') {
    return ['AI review is disabled. The 1688 scanner trusts the strongest heuristic supplier candidate.'];
  }
  const scopeLine = evaluator.onlyForAmbiguousCandidates
    ? 'AI review runs only when the 1688 supplier candidate remains ambiguous after the heuristic probe.'
    : 'AI review runs on every strongest 1688 supplier candidate before the scan is trusted.';
  return [
    scopeLine,
    `Candidates must meet ${formatConfidenceThresholdLabel(evaluator.threshold)} to be approved.`,
    'Approved supplier candidates persist their extracted supplier page, pricing, MOQ, and images.',
    'Rejected supplier candidates finish the scan as No Match while keeping the candidate diagnostics visible.',
    'Evaluator runtime errors fail the scan conservatively instead of trusting the supplier page.',
  ];
};

export const resolve1688EvaluatorSummaryLines = (
  draft: Pick<ProductScannerSettingsDraft, 'scanner1688CandidateEvaluator'>,
  effectiveModelLabel: string
): string[] => {
  const evaluator = draft.scanner1688CandidateEvaluator;
  if (evaluator.mode === 'disabled') {
    return [
      'Model: Disabled',
      'Trust policy: 1688 supplier candidates are trusted without AI review.',
      'Review scope: Heuristic-only',
      'Continuation: No AI rejection recovery path',
    ];
  }
  const modelSource = evaluator.mode === 'brain_default' ? 'AI Brain default' : 'Scanner override';
  const scope = evaluator.onlyForAmbiguousCandidates
    ? 'Ambiguous 1688 candidates only'
    : 'Every strongest 1688 candidate';
  return [
    `Model source: ${modelSource}`,
    `Resolved model: ${effectiveModelLabel}`,
    `Trust threshold: ${formatConfidenceThresholdLabel(evaluator.threshold)}`,
    `Review scope: ${scope}`,
    'Continuation: Approved candidates complete the scan, rejected candidates finish as No Match',
  ];
};
