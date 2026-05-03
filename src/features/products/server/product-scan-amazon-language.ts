import 'server-only';

import type { ProductScannerAmazonCandidateEvaluatorResolvedConfig } from './product-scanner-settings';
import type {
  AmazonScanCandidateResult,
  AmazonScanRuntimeResult,
} from './product-scans-service.helpers';
import { normalizeTextList, readOptionalString } from './product-scan-ai-evaluator.utils';

export type DeterministicLanguageDecision = {
  pageLanguage: string | null;
  languageAccepted: boolean | null;
  confidence: number | null;
  reason: string | null;
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  'en-us': 'English (US)',
  'en-gb': 'English (UK)',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pl: 'Polish',
  nl: 'Dutch',
  sv: 'Swedish',
  ja: 'Japanese',
  tr: 'Turkish',
};

const AMAZON_MARKETPLACE_LANGUAGE_HINTS: Record<string, string> = {
  'amazon.co.uk': 'en',
  'amazon.com': 'en',
  'amazon.com.au': 'en',
  'amazon.de': 'de',
  'amazon.es': 'es',
  'amazon.fr': 'fr',
  'amazon.it': 'it',
  'amazon.nl': 'nl',
  'amazon.pl': 'pl',
  'amazon.se': 'sv',
  'amazon.co.jp': 'ja',
  'amazon.com.tr': 'tr',
  'amazon.com.mx': 'es',
};

const LANGUAGE_STOPWORDS: Record<string, readonly string[]> = {
  en: ['the', 'and', 'with', 'for', 'from', 'this', 'that', 'your', 'you', 'are', 'not'],
  de: ['und', 'mit', 'für', 'der', 'die', 'das', 'ist', 'nicht', 'eine', 'von'],
  fr: ['avec', 'pour', 'les', 'des', 'une', 'est', 'dans', 'pas', 'sur', 'par'],
  es: ['con', 'para', 'los', 'las', 'una', 'este', 'esta', 'del', 'por', 'sin'],
  it: ['con', 'per', 'gli', 'una', 'questo', 'questa', 'non', 'della', 'delle', 'dei'],
  pl: ['dla', 'jest', 'oraz', 'nie', 'ten', 'ta', 'kolor', 'produkt', 'zestaw', 'wymiary'],
  nl: ['met', 'voor', 'een', 'deze', 'niet', 'van', 'het', 'product', 'kleur', 'maat'],
};

export const normalizeLanguageTag = (value: unknown): string | null => {
  const raw = readOptionalString(value);
  return raw !== null ? raw.replace(/_/g, '-').toLowerCase() : null;
};

export const isEnglishLanguageTag = (value: string | null | undefined): boolean =>
  typeof value === 'string' && value.toLowerCase().startsWith('en') === true;

export const resolveLanguageLabel = (value: string | null | undefined): string | null => {
  const normalized = normalizeLanguageTag(value);
  if (normalized === null) return null;
  return LANGUAGE_LABELS[normalized] ?? normalized.toUpperCase();
};

export const resolveMarketplaceLanguageHint = (candidateUrl: string | null): string | null => {
  const normalizedUrl = readOptionalString(candidateUrl);
  if (normalizedUrl === null) return null;
  try {
    return AMAZON_MARKETPLACE_LANGUAGE_HINTS[new URL(normalizedUrl).hostname.toLowerCase()] ?? null;
  } catch {
    return null;
  }
};

export const detectTextLanguage = (value: string | null): DeterministicLanguageDecision => {
  const tokens = tokenizeLanguageText(value);
  if (tokens === null) return createEmptyLanguageDecision();
  const scoredLanguage = resolveBestStopwordLanguage(tokens);
  if (isUsableStopwordLanguage(scoredLanguage) === false) return createEmptyLanguageDecision();
  const label = resolveLanguageLabel(scoredLanguage.language) ?? scoredLanguage.language;
  return {
    pageLanguage: scoredLanguage.language,
    languageAccepted: null,
    confidence: Math.min(0.95, 0.55 + scoredLanguage.margin * 0.08),
    reason: `Visible Amazon text looks ${label}.`,
  };
};

const tokenizeLanguageText = (value: string | null): string[] | null => {
  const normalized = readOptionalString(value)?.toLowerCase() ?? null;
  if (normalized === null) return null;
  const tokens = normalized.match(/[a-z\u00c0-\u017f]+/g) ?? [];
  return tokens.length > 0 ? tokens : null;
};

const isUsableStopwordLanguage = (value: {
  language: string | null;
  score: number;
  margin: number;
}): value is { language: string; score: number; margin: number } =>
  value.language !== null && value.score >= 2;

const createEmptyLanguageDecision = (): DeterministicLanguageDecision => ({
  pageLanguage: null,
  languageAccepted: null,
  confidence: null,
  reason: null,
});

const resolveBestStopwordLanguage = (
  tokens: string[]
): { language: string | null; score: number; margin: number } => {
  let bestLanguage: string | null = null;
  let bestScore = 0;
  let secondScore = 0;
  for (const [language, stopwords] of Object.entries(LANGUAGE_STOPWORDS)) {
    const stopwordSet = new Set(stopwords);
    const score = tokens.reduce(
      (count, token) => count + (stopwordSet.has(token) ? 1 : 0),
      0
    );
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestLanguage = language;
    } else if (score > secondScore) {
      secondScore = score;
    }
  }
  return { language: bestLanguage, score: bestScore, margin: bestScore - secondScore };
};

const createAcceptedLanguageDecision = (
  pageLanguage: string,
  confidence: number | null,
  reason: string | null
): DeterministicLanguageDecision => ({
  pageLanguage,
  languageAccepted: true,
  confidence,
  reason,
});

const createRejectedLanguageDecision = (
  pageLanguage: string | null,
  confidence: number | null,
  reason: string | null
): DeterministicLanguageDecision => ({
  pageLanguage,
  languageAccepted: false,
  confidence,
  reason,
});

const resolveProbeDeclaredLanguageDecision = (
  probe: AmazonScanRuntimeResult['amazonProbe'],
  allowedContentLanguage: string
): DeterministicLanguageDecision | null => {
  const probeLanguage = normalizeLanguageTag(probe?.pageLanguage);
  if (probeLanguage === null) return null;
  const label = resolveLanguageLabel(probeLanguage) ?? probeLanguage;
  if (isEnglishLanguageTag(probeLanguage)) {
    return createAcceptedLanguageDecision(
      probeLanguage,
      0.99,
      `Amazon page declares ${label} content.`
    );
  }
  return createRejectedLanguageDecision(
    probeLanguage,
    0.99,
    `Amazon page declares ${label} content, which is outside the allowed ${resolveLanguageLabel(allowedContentLanguage) ?? allowedContentLanguage} policy.`
  );
};

const resolveProbeMarketplaceLanguage = (parsedResult: AmazonScanRuntimeResult): string | null => {
  const marketplaceDomain = readOptionalString(parsedResult.amazonProbe?.marketplaceDomain);
  return normalizeLanguageTag(
    marketplaceDomain !== null ? AMAZON_MARKETPLACE_LANGUAGE_HINTS[marketplaceDomain] : null
  ) ?? resolveMarketplaceLanguageHint(resolveProbeLanguageUrl(parsedResult));
};

const resolveProbeLanguageUrl = (parsedResult: AmazonScanRuntimeResult): string | null =>
  readOptionalString(parsedResult.amazonProbe?.canonicalUrl) ??
  readOptionalString(parsedResult.amazonProbe?.candidateUrl) ??
  readOptionalString(parsedResult.url) ??
  readOptionalString(parsedResult.currentUrl);

const detectProbeTextLanguage = (
  parsedResult: AmazonScanRuntimeResult
): DeterministicLanguageDecision =>
  detectTextLanguage(
    normalizeTextList([
      readOptionalString(parsedResult.amazonProbe?.pageTitle),
      readOptionalString(parsedResult.amazonProbe?.descriptionSnippet),
      ...(Array.isArray(parsedResult.amazonProbe?.bulletPoints)
        ? parsedResult.amazonProbe.bulletPoints
        : []),
    ]).join('\n')
  );

export const resolveDeterministicLanguageDecision = (input: {
  parsedResult: AmazonScanRuntimeResult;
  evaluatorConfig: Extract<
    ProductScannerAmazonCandidateEvaluatorResolvedConfig,
    { enabled: true }
  >;
}): DeterministicLanguageDecision => {
  const declaredDecision = resolveProbeDeclaredLanguageDecision(
    input.parsedResult.amazonProbe,
    input.evaluatorConfig.allowedContentLanguage
  );
  if (declaredDecision !== null) return declaredDecision;
  return combineTextAndMarketplaceLanguageDecision(
    detectProbeTextLanguage(input.parsedResult),
    resolveProbeMarketplaceLanguage(input.parsedResult)
  );
};

const combineTextAndMarketplaceLanguageDecision = (
  textLanguage: DeterministicLanguageDecision,
  marketplaceLanguage: string | null
): DeterministicLanguageDecision => {
  const pageLanguage = textLanguage.pageLanguage ?? marketplaceLanguage ?? null;
  if (textLanguage.pageLanguage !== null) {
    return createTextLanguageDecision(textLanguage, textLanguage.pageLanguage);
  }
  return createMarketplaceLanguageDecision(marketplaceLanguage, pageLanguage);
};

const createTextLanguageDecision = (
  textLanguage: DeterministicLanguageDecision,
  pageLanguage: string
): DeterministicLanguageDecision =>
  isEnglishLanguageTag(textLanguage.pageLanguage)
    ? createAcceptedLanguageDecision(pageLanguage, textLanguage.confidence, textLanguage.reason)
    : createRejectedLanguageDecision(pageLanguage, textLanguage.confidence, textLanguage.reason);

const createMarketplaceLanguageDecision = (
  marketplaceLanguage: string | null,
  pageLanguage: string | null
): DeterministicLanguageDecision => {
  if (marketplaceLanguage === null) return createEmptyLanguageDecision();
  const isEnglishMarketplace = isEnglishLanguageTag(marketplaceLanguage);
  return {
    pageLanguage,
    languageAccepted: isEnglishMarketplace ? true : null,
    confidence: isEnglishMarketplace ? 0.7 : 0.55,
    reason: `Marketplace domain suggests ${resolveLanguageLabel(marketplaceLanguage) ?? marketplaceLanguage} content.`,
  };
};

export const resolveDeterministicCandidateLanguageDecision = (
  candidate: Pick<AmazonScanCandidateResult, 'url' | 'snippet' | 'title'>
): DeterministicLanguageDecision => {
  const marketplaceLanguage = resolveMarketplaceLanguageHint(readOptionalString(candidate.url));
  const textLanguage = detectTextLanguage(
    normalizeTextList([
      readOptionalString(candidate.title),
      readOptionalString(candidate.snippet),
    ]).join('\n')
  );
  return combineTextAndMarketplaceLanguageDecision(textLanguage, marketplaceLanguage);
};
