import type { RuntimeRegexRule } from './parser-runtime-patterns';
import type {
  PromptExploderLearnedTemplate,
  PromptExploderListItem,
  PromptExploderSegment,
  PromptExploderSegmentType,
} from './types';

const SEGMENT_TYPE_VALUES: PromptExploderSegmentType[] = [
  'metadata',
  'assigned_text',
  'list',
  'parameter_block',
  'referential_list',
  'sequence',
  'hierarchical_list',
  'conditional_list',
  'qa_matrix',
];

const CASE_RESOLVER_EMPTY_TITLE_PATTERN_IDS = new Set<string>([
  'segment.case_resolver.heading.place_date',
  'segment.case_resolver.heading.addresser_label',
  'segment.case_resolver.heading.addresser_person',
  'segment.case_resolver.heading.addressee_label',
  'segment.case_resolver.heading.addressee_organization',
  'segment.case_resolver.heading.dotyczy',
  'segment.case_resolver.heading.body_statement',
  'segment.case_resolver.heading.closing_statement',
]);
const CASE_RESOLVER_SUBJECT_OR_SECTION_PATTERN_ID =
  'segment.case_resolver.heading.subject_or_section';
const CASE_RESOLVER_WSA_PARTY_HEADING_PREFIX_RE =
  /^(strona|organ|uczestnik|wnioskodawca|addresser|addressee)\s+w\s+postepowaniu\s+przed\s+wsa\b/;

const isPromptExploderSegmentType = (
  value: string | null | undefined
): value is PromptExploderSegmentType =>
  Boolean(value && SEGMENT_TYPE_VALUES.includes(value as PromptExploderSegmentType));

const typeFromPatternId = (patternId: string): PromptExploderSegmentType | null => {
  const match =
    /^segment\.(?:infer|learned)\.([a-z_]+)\b/i.exec(patternId) ??
    /^segment\.type\.([a-z_]+)\b/i.exec(patternId);
  if (!match) return null;
  const candidate = (match[1] ?? '').toLowerCase();
  if (!isPromptExploderSegmentType(candidate)) return null;
  return candidate;
};

const normalizedSimilarityText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenSet = (value: string): Set<string> => {
  const tokens = normalizedSimilarityText(value)
    .split(' ')
    .filter((token) => token.length > 1);
  return new Set(tokens);
};

const jaccardSimilarity = (left: string, right: string): number => {
  const leftSet = tokenSet(left);
  const rightSet = tokenSet(right);
  if (leftSet.size === 0 && rightSet.size === 0) return 1;
  if (leftSet.size === 0 || rightSet.size === 0) return 0;
  let intersection = 0;
  leftSet.forEach((token: string) => {
    if (rightSet.has(token)) intersection += 1;
  });
  const union = leftSet.size + rightSet.size - intersection;
  if (union <= 0) return 0;
  return intersection / union;
};

const toBigrams = (value: string): Set<string> => {
  const normalized = normalizedSimilarityText(value).replace(/\s/g, '');
  if (!normalized) return new Set();
  if (normalized.length === 1) return new Set([normalized]);
  const out = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i += 1) {
    out.add(normalized.slice(i, i + 2));
  }
  return out;
};

const diceSimilarity = (left: string, right: string): number => {
  const leftBigrams = toBigrams(left);
  const rightBigrams = toBigrams(right);
  if (leftBigrams.size === 0 && rightBigrams.size === 0) return 1;
  if (leftBigrams.size === 0 || rightBigrams.size === 0) return 0;
  let overlap = 0;
  leftBigrams.forEach((token: string) => {
    if (rightBigrams.has(token)) overlap += 1;
  });
  return (2 * overlap) / (leftBigrams.size + rightBigrams.size);
};

const anchorCoverageScore = (segmentText: string, anchorTokens: string[]): number => {
  const anchors = anchorTokens
    .map((token: string) => normalizedSimilarityText(token))
    .filter(Boolean);
  if (anchors.length === 0) return 0;
  const normalized = normalizedSimilarityText(segmentText);
  let hits = 0;
  anchors.forEach((token: string) => {
    if (normalized.includes(token)) hits += 1;
  });
  return hits / anchors.length;
};

const segmentSimilaritySource = (segment: PromptExploderSegment): string => {
  const lines: string[] = [segment.title || ''];
  if (segment.listItems && segment.listItems.length > 0) {
    lines.push(
      segment.listItems
        .slice(0, 3)
        .map((item: PromptExploderListItem) => item.text || '')
        .join(' ')
    );
  }
  if (segment.subsections && segment.subsections.length > 0) {
    const subsection = segment.subsections[0];
    if (subsection) {
      lines.push(subsection.title || '');
      if (subsection.items && subsection.items.length > 0) {
        lines.push(
          subsection.items
            .slice(0, 2)
            .map((item: PromptExploderListItem) => item.text || '')
            .join(' ')
        );
      }
    }
  }
  if (segment.text) {
    lines.push(segment.text.slice(0, 180));
  }
  return lines.join(' ');
};

const inferTypeFromPatternIds = (
  matchedPatternIds: string[],
  fallbackType: PromptExploderSegmentType
): PromptExploderSegmentType => {
  for (const patternId of matchedPatternIds) {
    const inferred = typeFromPatternId(patternId);
    if (inferred) return inferred;
  }
  return fallbackType;
};

export const shouldKeepEmptyTitleForCaseResolver = (
  matchedPatternIds: string[],
  sourceText = ''
): boolean => {
  if (matchedPatternIds.some((patternId) => CASE_RESOLVER_EMPTY_TITLE_PATTERN_IDS.has(patternId))) {
    return true;
  }
  if (!matchedPatternIds.includes(CASE_RESOLVER_SUBJECT_OR_SECTION_PATTERN_ID)) {
    const normalizedAsciiSource = sourceText
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return CASE_RESOLVER_WSA_PARTY_HEADING_PREFIX_RE.test(normalizedAsciiSource);
  }

  const normalizedSource = normalizedSimilarityText(sourceText);
  if (!normalizedSource) return false;
  return normalizedSource === 'wniosek' || normalizedSource.startsWith('wniosek ');
};

export const inferTypeFromRuleHints = (
  matchedRules: RuntimeRegexRule[],
  fallbackType: PromptExploderSegmentType
): PromptExploderSegmentType => {
  const typedMatches = matchedRules
    .filter((rule) => rule.segmentTypeHint)
    .sort((left, right) => {
      if (right.priority !== left.priority) return right.priority - left.priority;
      if (right.confidenceBoost !== left.confidenceBoost) {
        return right.confidenceBoost - left.confidenceBoost;
      }
      return left.id.localeCompare(right.id);
    });

  const preferred = typedMatches[0]?.segmentTypeHint;
  if (preferred) return preferred;

  return inferTypeFromPatternIds(
    matchedRules.map((rule) => rule.id),
    fallbackType
  );
};

export const inferTypeFromRuleSequence = (
  matchedRules: RuntimeRegexRule[],
  fallbackType: PromptExploderSegmentType
): PromptExploderSegmentType => {
  const typedMatches = matchedRules
    .filter((rule) => rule.segmentTypeHint)
    .sort((left, right) => {
      if (left.sequence !== right.sequence) return left.sequence - right.sequence;
      if (right.priority !== left.priority) return right.priority - left.priority;
      if (right.confidenceBoost !== left.confidenceBoost) {
        return right.confidenceBoost - left.confidenceBoost;
      }
      return left.id.localeCompare(right.id);
    });

  const preferred = typedMatches[0]?.segmentTypeHint;
  if (preferred) return preferred;

  return inferTypeFromPatternIds(
    matchedRules.map((rule) => rule.id),
    fallbackType
  );
};

export const inferTypeFromLearnedTemplates = (
  segment: PromptExploderSegment,
  templates: PromptExploderLearnedTemplate[],
  similarityThreshold: number
): {
  type: PromptExploderSegmentType;
  confidence: number;
  matchedTemplateId: string | null;
} => {
  if (templates.length === 0) {
    return {
      type: segment.type,
      confidence: segment.confidence,
      matchedTemplateId: null,
    };
  }

  if (segment.type === 'metadata' || segment.type === 'parameter_block') {
    return {
      type: segment.type,
      confidence: segment.confidence,
      matchedTemplateId: null,
    };
  }

  const sourceText = segmentSimilaritySource(segment);
  let bestTemplate: PromptExploderLearnedTemplate | null = null;
  let bestScore = 0;

  templates.forEach((template: PromptExploderLearnedTemplate) => {
    const titleReference = template.normalizedTitle || template.title || '';
    const titleScore = Math.max(
      diceSimilarity(sourceText, titleReference),
      jaccardSimilarity(sourceText, titleReference)
    );
    const sampleScore = template.sampleText
      ? Math.max(
        diceSimilarity(sourceText, template.sampleText),
        jaccardSimilarity(sourceText, template.sampleText)
      )
      : 0;
    const anchorScore = anchorCoverageScore(sourceText, template.anchorTokens || []);
    const totalScore = Math.max(titleScore, sampleScore * 0.8 + anchorScore * 0.2);

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestTemplate = template;
    }
  });

  if (!bestTemplate || bestScore < similarityThreshold) {
    return {
      type: segment.type,
      confidence: segment.confidence,
      matchedTemplateId: null,
    };
  }

  const matchedTemplate = bestTemplate as PromptExploderLearnedTemplate;
  const matchedTypeCandidate = matchedTemplate.segmentType as string;
  const matchedType = isPromptExploderSegmentType(matchedTypeCandidate)
    ? matchedTypeCandidate
    : segment.type;
  const matchedTemplateId = typeof matchedTemplate.id === 'string' ? matchedTemplate.id : null;

  return {
    type: matchedType,
    confidence: Math.max(segment.confidence, bestScore),
    matchedTemplateId,
  };
};
