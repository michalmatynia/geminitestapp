import type {
  FilemakerLexiconTypeKey,
  FilemakerLexiconValidationPattern,
  FilemakerLexiconValidationPatternSourceScope,
} from '../../types';
import { createDefaultFilemakerLexiconValidationPatterns } from '../../filemaker-settings.entities';
import { normalizeLexiconKey } from './lexicon-rules';

type ClassificationInput = {
  label: string;
  sourceScope: FilemakerLexiconValidationPatternSourceScope;
};

type ClassificationResult = {
  confidence: number;
  pattern: FilemakerLexiconValidationPattern;
  typeKey: FilemakerLexiconTypeKey;
};

export const filemakerLexiconValidationPatternSourceMatches = (
  pattern: FilemakerLexiconValidationPattern,
  sourceScope: FilemakerLexiconValidationPatternSourceScope
): boolean =>
  pattern.sourceScope === 'all' ||
  pattern.sourceScope === sourceScope ||
  (pattern.sourceScope === 'listing_field' && sourceScope.startsWith('listing_field_')) ||
  (pattern.sourceScope === 'section' &&
    (sourceScope === 'section_heading' || sourceScope === 'section_value'));

const regexMatches = (pattern: string, label: string, normalizedLabel: string): boolean => {
  try {
    const expression = new RegExp(pattern, 'iu');
    return expression.test(label) || expression.test(normalizedLabel);
  } catch {
    return false;
  }
};

const partialMatches = (
  pattern: FilemakerLexiconValidationPattern,
  normalizedLabel: string
): boolean => {
  const tokens = Array.from(
    new Set(
      normalizeLexiconKey(pattern.pattern)
        .split(/\s+|[,;|/]+/u)
        .map((token: string): string => token.trim())
        .filter((token: string): boolean => token.length >= 3)
    )
  );
  if (tokens.length === 0) return false;
  const matched = tokens.filter((token: string): boolean => normalizedLabel.includes(token));
  const minimumMatches = Math.min(tokens.length, Math.max(2, Math.ceil(tokens.length * 0.3)));
  const minimumRatio = pattern.confidence >= 0.8 ? 0.5 : 0.3;
  return matched.length >= minimumMatches && matched.length / tokens.length >= minimumRatio;
};

const patternMatches = (
  pattern: FilemakerLexiconValidationPattern,
  label: string,
  normalizedLabel: string
): boolean => {
  const normalizedPattern = normalizeLexiconKey(pattern.pattern);
  if (normalizedPattern.length === 0) return false;
  if (pattern.matchMode === 'exact') return normalizedLabel === normalizedPattern;
  if (pattern.matchMode === 'contains') return normalizedLabel.includes(normalizedPattern);
  if (pattern.matchMode === 'partial') return partialMatches(pattern, normalizedLabel);
  return regexMatches(pattern.pattern, label, normalizedLabel);
};

export const resolveFilemakerLexiconValidationPatterns = (
  patterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): FilemakerLexiconValidationPattern[] =>
  (patterns && patterns.length > 0 ? [...patterns] : createDefaultFilemakerLexiconValidationPatterns())
    .filter((pattern: FilemakerLexiconValidationPattern): boolean => pattern.enabled)
    .sort(
      (
        left: FilemakerLexiconValidationPattern,
        right: FilemakerLexiconValidationPattern
      ): number => {
        const priorityCompare = left.priority - right.priority;
        if (priorityCompare !== 0) return priorityCompare;
        return left.label.localeCompare(right.label);
      }
    );

export const classifyFilemakerLexiconLabelWithPatterns = (
  patterns: readonly FilemakerLexiconValidationPattern[] | null | undefined,
  input: ClassificationInput
): ClassificationResult | null => {
  const normalizedLabel = normalizeLexiconKey(input.label);
  if (normalizedLabel.length === 0) return null;
  const matchedPattern = resolveFilemakerLexiconValidationPatterns(patterns).find(
    (pattern: FilemakerLexiconValidationPattern): boolean =>
      filemakerLexiconValidationPatternSourceMatches(pattern, input.sourceScope) &&
      patternMatches(pattern, input.label, normalizedLabel)
  );
  if (matchedPattern === undefined) return null;
  return {
    confidence: matchedPattern.confidence,
    pattern: matchedPattern,
    typeKey: matchedPattern.targetTypeKey,
  };
};
