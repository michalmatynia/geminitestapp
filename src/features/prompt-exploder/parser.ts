import { extractParamsFromPrompt } from '@/features/prompt-engine/prompt-params';
import type {
  PromptExploderRuleSegmentType,
  PromptValidationRule,
} from '@/features/prompt-engine/settings';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
  PromptExploderListItem,
  PromptExploderLogicalComparator,
  PromptExploderLogicalCondition,
  PromptExploderLogicalJoin,
  PromptExploderLogicalOperator,
  PromptExploderParamUiControl,
  PromptExploderSegment,
  PromptExploderSegmentType,
  PromptExploderSubsection,
} from './types';

const REFERENCE_CODE_RE = /\b(P\d+|RL\d+|QA(?:_R)?\d+)\b/g;
const PARAM_REFERENCE_RE = /\b([a-z_]+(?:\.[a-z_]+)+)\b/g;

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

const DEFAULT_PATTERN_IDS: Record<string, RegExp> = {
  'segment.metadata.banner': /^\s*={3,}.+={3,}\s*$/,
  'segment.params.block': /^\s*params\s*=\s*\{/i,
  'segment.reference.code': /^\s*(P\d+|RL\d+|QA(?:_R)?\d+)\b/i,
  'segment.list.numeric': /^\s*\d+[.)]\s+/,
  'segment.list.bullet': /^\s*[*-]\s+/,
  'segment.list.alpha_sequence': /^\s*[A-Z]\)\s+/,
  'segment.pipeline.step': /^\s*\d+\.\s+/,
  'segment.conditional.only_if': /\bonly if\b/i,
  'segment.conditional.fix_until': /\bfix\s+until\b/i,
  'segment.comment.patch': /^\s*\/\/\s*PATCH\b/i,
  'segment.subsection.alpha_heading': /^\s*([A-Z])\)\s+(.+)$/,
  'segment.subsection.reference_named':
    /^\s*(RL\d+|P\d+|QA(?:_R)?\d+)\s+\(([^)]+)\)\s*:\s*(.*)$/i,
  'segment.subsection.reference_plain': /^\s*(RL\d+|P\d+|QA(?:_R)?\d+)\b\s*[—:-]?\s*(.*)$/i,
  'segment.subsection.qa_code': /^\s*(QA(?:_R)?\d+)\b\s*[—:-]?\s*(.*)$/i,
  'segment.subsection.numeric_bracket_heading': /^\s*\d+\.\s+\[([A-Z0-9 _()\-/:&+.,]{2,})]$/,
  'segment.subsection.bracket_heading': /^\s*\[([A-Z0-9 _()\-/:&+.,]{2,})]$/,
  'segment.subsection.markdown_heading': /^\s*#{1,6}\s+(.+)$/,
};
const BRACKET_SECTION_HEADING_RE = /^\s*\[[A-Z0-9 _()\-/:&+.,]{2,}]$/i;
const STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE = /^(===\s*STUDIO\s+RELIGHTING|STUDIO\s+RELIGHTING\b)/i;
const REQUIREMENTS_BOUNDARY_FALLBACK_RE = /^(REQUIREMENTS|COMPOSITING\s+REQUIREMENTS)\b/i;
const PIPELINE_BOUNDARY_FALLBACK_RE = /^(PIPELINE|WORKFLOW|PROCESS|EXECUTION\s+TEMPLATE)\b/i;
const FINAL_QA_BOUNDARY_FALLBACK_RE = /^FINAL\s+QA\b/i;

type PatternRuntime = {
  byId: Map<string, RegExp>;
  scopedRules: PromptValidationRule[];
  regexRules: RuntimeRegexRule[];
  headingRules: RuntimeRegexRule[];
};

type RuntimeRegexRule = {
  id: string;
  regex: RegExp;
  segmentTypeHint: PromptExploderSegmentType | null;
  confidenceBoost: number;
  priority: number;
  treatAsHeading: boolean;
};

type ParseCursor = {
  lines: string[];
  index: number;
};

type ParsedTitleLine = {
  code: string | null;
  title: string;
};

const listItemId = (() => {
  let count = 0;
  return (): string => {
    count += 1;
    return `item_${count.toString(36)}`;
  };
})();

const logicalConditionId = (() => {
  let count = 0;
  return (): string => {
    count += 1;
    return `condition_${count.toString(36)}`;
  };
})();

const segmentId = (() => {
  let count = 0;
  return (): string => {
    count += 1;
    return `segment_${count.toString(36)}`;
  };
})();

const subsectionId = (() => {
  let count = 0;
  return (): string => {
    count += 1;
    return `subsection_${count.toString(36)}`;
  };
})();

const bindingId = (() => {
  let count = 0;
  return (): string => {
    count += 1;
    return `binding_${count.toString(36)}`;
  };
})();

const trimTrailingBlankLines = (value: string): string => value.replace(/\n{3,}$/g, '\n\n').trimEnd();

const normalizeMultiline = (value: string): string => value.replace(/\r\n/g, '\n');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toLine = (line: string | undefined): string => (line ?? '').replace(/\r/g, '');

const normalizeHeadingLabel = (line: string): string =>
  line
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/^\[(.+)]$/, '$1')
    .trim();

const parseCodeFromLine = (line: string): ParsedTitleLine => {
  const trimmed = line.trim();
  const match = /^(P\d+|RL\d+|QA(?:_R)?\d+)\s*[—:-]?\s*(.*)$/i.exec(trimmed);
  if (!match) {
    return {
      code: null,
      title: trimmed,
    };
  }
  return {
    code: (match[1] ?? '').toUpperCase(),
    title: (match[2] ?? '').trim() || trimmed,
  };
};

const LIST_ITEM_MARKER_RE = /^\s*(\d+[.)]|[A-Z]\)|[*-])\s+/;

const isListItemMarkerLine = (line: string): boolean => LIST_ITEM_MARKER_RE.test(line);

const hasListContinuationParent = (lines: string[], index: number): boolean => {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const previous = toLine(lines[cursor]);
    if (!previous.trim()) continue;
    if (isListItemMarkerLine(previous)) return true;
    if (/^\s+/.test(previous) && !isListItemMarkerLine(previous)) continue;
    return false;
  }
  return false;
};

const isIndentedListContinuationLine = (lines: string[], index: number): boolean => {
  const line = toLine(lines[index]);
  if (!line.trim()) return false;
  if (!/^\s+/.test(line)) return false;
  if (isListItemMarkerLine(line)) return false;
  return hasListContinuationParent(lines, index);
};

const isLikelyHeading = (line: string, runtime?: PatternRuntime): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^`{3,}/.test(trimmed)) return false;
  if (/^={3,}.+={3,}$/.test(trimmed)) return true;
  if (/^#{1,6}\s+\S+/.test(trimmed)) return true;
  if (/^\[[A-Z0-9 _()\-/:&+.,]{2,}]$/i.test(trimmed)) return true;
  if (/^[^|\n]+(?:\s*\|\s*[^|\n]+){2,}$/.test(trimmed)) return true;
  if (/^[*-]\s+/.test(trimmed)) return false;
  if (/^[A-Z]\)\s+/.test(trimmed)) return false;
  if (runtime?.headingRules.some((rule) => rule.regex.test(trimmed))) return true;
  if (/^\d+[.)]\s+/.test(trimmed)) return false;
  if (/^(P\d+|RL\d+|QA(?:_R)?\d+)\b/i.test(trimmed)) return true;
  if (/^[A-Z][A-Z0-9 _()\-/:&+.,]{2,}$/.test(trimmed)) return true;
  return /^(ROLE|PARAMS|REQUIREMENTS|PIPELINE|FINAL QA)\b/i.test(trimmed);
};

const isPromptExploderSegmentType = (
  value: string | null | undefined
): value is PromptExploderSegmentType =>
  Boolean(value && SEGMENT_TYPE_VALUES.includes(value as PromptExploderSegmentType));

const toSegmentTypeHint = (
  value: PromptExploderRuleSegmentType | PromptExploderSegmentType | string | null | undefined
): PromptExploderSegmentType | null => {
  if (!value) return null;
  return isPromptExploderSegmentType(String(value)) ? (String(value) as PromptExploderSegmentType) : null;
};

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
  leftSet.forEach((token) => {
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
  leftBigrams.forEach((token) => {
    if (rightBigrams.has(token)) overlap += 1;
  });
  return (2 * overlap) / (leftBigrams.size + rightBigrams.size);
};

const anchorCoverageScore = (
  segmentText: string,
  anchorTokens: string[]
): number => {
  const anchors = anchorTokens
    .map((token) => normalizedSimilarityText(token))
    .filter(Boolean);
  if (anchors.length === 0) return 0;
  const normalized = normalizedSimilarityText(segmentText);
  let hits = 0;
  anchors.forEach((token) => {
    if (normalized.includes(token)) hits += 1;
  });
  return hits / anchors.length;
};

const segmentSimilaritySource = (segment: PromptExploderSegment): string => {
  const lines: string[] = [segment.title];
  if (segment.listItems.length > 0) {
    lines.push(segment.listItems.slice(0, 3).map((item) => item.text).join(' '));
  }
  if (segment.subsections.length > 0) {
    const subsection = segment.subsections[0];
    if (subsection) {
      lines.push(subsection.title);
      if (subsection.items.length > 0) {
        lines.push(subsection.items.slice(0, 2).map((item) => item.text).join(' '));
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

const normalizeRegexFlags = (flags: string | null | undefined): string | undefined => {
  const cleaned = (flags ?? '').replace(/[gy]/g, '');
  return cleaned.trim() || undefined;
};

const compileSafeRegex = (
  pattern: string,
  flags: string | null | undefined
): RegExp | null => {
  try {
    return new RegExp(pattern, normalizeRegexFlags(flags));
  } catch {
    return null;
  }
};

const inferTypeFromRuleHints = (
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

const inferTypeFromLearnedTemplates = (
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

  templates.forEach((template) => {
    const titleScore = Math.max(
      diceSimilarity(sourceText, template.normalizedTitle || template.title),
      jaccardSimilarity(sourceText, template.normalizedTitle || template.title)
    );
    const sampleScore = template.sampleText
      ? Math.max(
        diceSimilarity(sourceText, template.sampleText),
        jaccardSimilarity(sourceText, template.sampleText)
      )
      : 0;
    const anchorScore = anchorCoverageScore(sourceText, template.anchorTokens);
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
  const matchedTemplateId =
    typeof matchedTemplate.id === 'string' ? matchedTemplate.id : null;

  return {
    type: matchedType,
    confidence: Math.max(segment.confidence, bestScore),
    matchedTemplateId,
  };
};

const compileRuntimePatterns = (rules: PromptValidationRule[] | null | undefined): PatternRuntime => {
  const byId = new Map<string, RegExp>();
  const runtimeRulesById = new Map<string, RuntimeRegexRule>();

  Object.entries(DEFAULT_PATTERN_IDS).forEach(([id, regex]) => {
    byId.set(id, regex);
    runtimeRulesById.set(id, {
      id,
      regex,
      segmentTypeHint: typeFromPatternId(id),
      confidenceBoost: 0,
      priority: 0,
      treatAsHeading: false,
    });
  });

  const scopedRules = (rules ?? []).filter((rule) => {
    if (!rule.enabled) return false;
    if (rule.kind !== 'regex') return false;
    const scopes = rule.appliesToScopes ?? [];
    return scopes.length === 0 || scopes.includes('prompt_exploder') || scopes.includes('global');
  });

  scopedRules.forEach((rule) => {
    if (rule.kind !== 'regex') return;
    const compiled = compileSafeRegex(rule.pattern, rule.flags);
    if (!compiled) return;
    byId.set(rule.id, compiled);
    runtimeRulesById.set(rule.id, {
      id: rule.id,
      regex: compiled,
      segmentTypeHint:
        toSegmentTypeHint(rule.promptExploderSegmentType) ?? typeFromPatternId(rule.id),
      confidenceBoost: Math.min(
        0.5,
        Math.max(0, Number(rule.promptExploderConfidenceBoost ?? 0))
      ),
      priority: Math.min(
        50,
        Math.max(-50, Math.floor(Number(rule.promptExploderPriority ?? 0)))
      ),
      treatAsHeading: Boolean(rule.promptExploderTreatAsHeading),
    });
  });

  const regexRules = [...runtimeRulesById.values()];
  const headingRules = regexRules.filter((rule) => rule.treatAsHeading);

  return {
    byId,
    scopedRules,
    regexRules,
    headingRules,
  };
};

const testPattern = (runtime: PatternRuntime, patternId: string, value: string): boolean => {
  const regex = runtime.byId.get(patternId) ?? DEFAULT_PATTERN_IDS[patternId];
  if (!regex) return false;
  return regex.test(value);
};

const resolveBoundaryRegex = (
  runtime: PatternRuntime,
  patternId: string,
  fallback: RegExp
): RegExp => {
  return runtime.byId.get(patternId) ?? fallback;
};

const resolveBoundaryRegexOptional = (
  runtime: PatternRuntime | undefined,
  patternId: string,
  fallback: RegExp
): RegExp => {
  return runtime?.byId.get(patternId) ?? fallback;
};

const matchesBoundaryHeading = (
  runtime: PatternRuntime,
  patternId: string,
  fallback: RegExp,
  value: string
): boolean => {
  return resolveBoundaryRegex(runtime, patternId, fallback).test(value);
};

const collectMatchedRules = (
  runtime: PatternRuntime,
  text: string
): RuntimeRegexRule[] => {
  return runtime.regexRules.filter((rule) => rule.regex.test(text));
};

const extractReferenceCodes = (value: string): string[] => {
  const matches = new Set<string>();
  for (const match of value.matchAll(REFERENCE_CODE_RE)) {
    const code = (match[1] ?? '').trim();
    if (!code) continue;
    matches.add(code.toUpperCase());
  }
  return [...matches];
};

const collectParamPaths = (
  objectValue: Record<string, unknown> | null,
  prefix = ''
): string[] => {
  if (!objectValue) return [];
  const out: string[] = [];
  Object.entries(objectValue).forEach(([key, value]) => {
    const nextPath = prefix ? `${prefix}.${key}` : key;
    out.push(nextPath);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...collectParamPaths(value as Record<string, unknown>, nextPath));
    }
  });
  return out;
};

const parseLogicalReferenceValue = (rawValue: string | null | undefined): unknown => {
  const trimmed = (rawValue ?? '').trim();
  if (!trimmed) return null;
  if (/^(true|false)$/i.test(trimmed)) return /^true$/i.test(trimmed);
  if (/^null$/i.test(trimmed)) return null;
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1);
  }
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

const normalizeLogicalOperator = (
  raw: string
): PromptExploderLogicalOperator | null => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'only if') return 'only_if';
  if (normalized === 'if') return 'if';
  if (normalized === 'unless') return 'unless';
  if (normalized === 'when') return 'when';
  return null;
};

const normalizeLogicalComparator = (
  raw: string | null | undefined
): PromptExploderLogicalComparator | null => {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === '=' || normalized === '==') return 'equals';
  if (normalized === '!=') return 'not_equals';
  if (normalized === '>') return 'gt';
  if (normalized === '>=') return 'gte';
  if (normalized === '<') return 'lt';
  if (normalized === '<=') return 'lte';
  if (normalized === 'contains') return 'contains';
  return null;
};

const normalizeLogicalParamPath = (raw: string): string => {
  return raw.trim().replace(/^\[(.+)]$/i, '$1').replace(/^params\./i, '');
};

const normalizeLogicalJoin = (raw: string | null | undefined): PromptExploderLogicalJoin | null => {
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'and') return 'and';
  if (normalized === 'or') return 'or';
  return null;
};

const parseLogicalConditionExpression = (
  expression: string,
  fallbackComparator: PromptExploderLogicalComparator
): Omit<PromptExploderLogicalCondition, 'id' | 'joinWithPrevious'> | null => {
  const expressionMatch = /^([A-Za-z_][A-Za-z0-9_.[\]]*)(?:\s*(==|=|!=|>=|<=|>|<|contains)\s*(.+))?$/i.exec(
    expression
  );
  if (!expressionMatch) return null;

  const paramPath = normalizeLogicalParamPath(expressionMatch[1] ?? '');
  if (!paramPath) return null;

  const rawComparator = expressionMatch[2] ?? null;
  const comparator = normalizeLogicalComparator(rawComparator) ?? fallbackComparator;
  const value =
    comparator === 'truthy' || comparator === 'falsy'
      ? null
      : parseLogicalReferenceValue(expressionMatch[3]);

  return {
    paramPath,
    comparator,
    value,
  };
};

const parseLogicalConditionChain = (
  expression: string,
  operator: PromptExploderLogicalOperator
): PromptExploderLogicalCondition[] => {
  const fallbackComparator: PromptExploderLogicalComparator =
    operator === 'unless' ? 'falsy' : 'truthy';
  const conditions: PromptExploderLogicalCondition[] = [];
  const separator = /\s+(AND|OR)\s+/gi;
  let cursor = 0;
  let joinForNext: PromptExploderLogicalJoin | null = null;

  for (const match of expression.matchAll(separator)) {
    const index = match.index ?? -1;
    if (index < 0) continue;
    const clauseRaw = expression.slice(cursor, index).trim();
    if (clauseRaw) {
      const parsed = parseLogicalConditionExpression(clauseRaw, fallbackComparator);
      if (!parsed) return [];
      conditions.push({
        id: logicalConditionId(),
        ...parsed,
        joinWithPrevious: conditions.length === 0 ? null : (joinForNext ?? 'and'),
      });
    }

    joinForNext = normalizeLogicalJoin(match[1] ?? '') ?? 'and';
    cursor = index + (match[0]?.length ?? 0);
  }

  const tailClause = expression.slice(cursor).trim();
  if (tailClause) {
    const parsed = parseLogicalConditionExpression(tailClause, fallbackComparator);
    if (!parsed) return [];
    conditions.push({
      id: logicalConditionId(),
      ...parsed,
      joinWithPrevious: conditions.length === 0 ? null : (joinForNext ?? 'and'),
    });
  }

  if (conditions.length === 0) {
    const parsed = parseLogicalConditionExpression(expression.trim(), fallbackComparator);
    if (!parsed) return [];
    conditions.push({
      id: logicalConditionId(),
      ...parsed,
      joinWithPrevious: null,
    });
  }

  return conditions;
};

const parseLogicalListItemPrefix = (text: string): {
  text: string;
  logicalOperator: PromptExploderLogicalOperator;
  logicalConditions: PromptExploderLogicalCondition[];
  referencedParamPath: string;
  referencedComparator: PromptExploderLogicalComparator;
  referencedValue: unknown;
} | null => {
  const trimmed = text.trim();
  const prefixMatch = /^(if|only if|unless|when)\s+(.+?)(?::|,\s+)(.+)$/i.exec(trimmed);
  if (!prefixMatch) return null;

  const operator = normalizeLogicalOperator(prefixMatch[1] ?? '');
  const expression = (prefixMatch[2] ?? '').trim();
  const statement = (prefixMatch[3] ?? '').trim();
  if (!operator || !expression || !statement) return null;

  const logicalConditions = parseLogicalConditionChain(expression, operator);
  const firstCondition = logicalConditions[0];
  if (!firstCondition) return null;

  return {
    text: statement,
    logicalOperator: operator,
    logicalConditions,
    referencedParamPath: firstCondition.paramPath,
    referencedComparator: firstCondition.comparator,
    referencedValue: firstCondition.value,
  };
};

const parseListLines = (lines: string[]): PromptExploderListItem[] => {
  const normalized = lines
    .map((line) => line.replace(/\r/g, ''))
    .filter((line) => line.trim().length > 0);
  if (normalized.length === 0) return [];

  const root: PromptExploderListItem[] = [];
  const stack: Array<{ level: number; item: PromptExploderListItem }> = [];

  normalized.forEach((line) => {
    const raw = line;
    const indent = raw.match(/^\s*/)?.[0]?.length ?? 0;
    const markerMatch = LIST_ITEM_MARKER_RE.exec(raw);
    const hasMarker = Boolean(markerMatch);
    const cleaned = raw
      .replace(/^\s*(\d+[.)]|[A-Z]\)|[*-])\s+/, '')
      .trim();

    if (!cleaned) return;

    if (!hasMarker && stack.length > 0) {
      const current = stack[stack.length - 1]?.item;
      if (current) {
        current.text = `${current.text} ${cleaned}`.trim();
      }
      return;
    }

    const logicalPrefix = parseLogicalListItemPrefix(cleaned);
    const item: PromptExploderListItem = {
      id: listItemId(),
      text: logicalPrefix?.text ?? cleaned,
      logicalOperator: logicalPrefix?.logicalOperator ?? null,
      logicalConditions: logicalPrefix?.logicalConditions ?? [],
      referencedParamPath: logicalPrefix?.referencedParamPath ?? null,
      referencedComparator: logicalPrefix?.referencedComparator ?? null,
      referencedValue: logicalPrefix?.referencedValue ?? null,
      children: [],
    };

    while (stack.length > 0 && indent <= stack[stack.length - 1]!.level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]?.item;
    if (!parent) {
      root.push(item);
    } else {
      parent.children.push(item);
    }

    stack.push({ level: indent, item });
  });

  return root;
};

const formatLogicalReferenceValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return /^[A-Za-z0-9_.-]+$/.test(value) ? value : JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null || value === undefined) return 'null';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const buildLogicalConditionsFromLegacyFields = (
  item: PromptExploderListItem
): PromptExploderLogicalCondition[] => {
  const paramPath = (item.referencedParamPath ?? '').trim();
  if (!paramPath) return [];
  const fallbackComparator: PromptExploderLogicalComparator =
    item.logicalOperator === 'unless' ? 'falsy' : 'truthy';
  const comparator = item.referencedComparator ?? fallbackComparator;
  return [
    {
      id: `${item.id}_legacy`,
      paramPath,
      comparator,
      value:
        comparator === 'truthy' || comparator === 'falsy'
          ? null
          : item.referencedValue ?? null,
      joinWithPrevious: null,
    },
  ];
};

const resolveLogicalConditions = (item: PromptExploderListItem): PromptExploderLogicalCondition[] => {
  const fromItem = (item.logicalConditions ?? [])
    .map((condition, index) => {
      const paramPath = (condition.paramPath ?? '').trim();
      if (!paramPath) return null;
      const fallbackComparator: PromptExploderLogicalComparator =
        item.logicalOperator === 'unless' ? 'falsy' : 'truthy';
      const comparator = condition.comparator ?? fallbackComparator;
      return {
        id: condition.id || `${item.id}_condition_${index + 1}`,
        paramPath,
        comparator,
        value:
          comparator === 'truthy' || comparator === 'falsy'
            ? null
            : condition.value ?? null,
        joinWithPrevious:
          index === 0 ? null : (condition.joinWithPrevious === 'or' ? 'or' : 'and'),
      } satisfies PromptExploderLogicalCondition;
    })
    .filter((condition): condition is PromptExploderLogicalCondition => Boolean(condition));
  if (fromItem.length > 0) return fromItem;
  return buildLogicalConditionsFromLegacyFields(item);
};

const formatLogicalConditionExpression = (condition: PromptExploderLogicalCondition): string => {
  if (condition.comparator === 'truthy') return condition.paramPath;
  if (condition.comparator === 'falsy') return `${condition.paramPath}=false`;
  if (condition.comparator === 'equals') {
    return `${condition.paramPath}=${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'not_equals') {
    return `${condition.paramPath}!=${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'gt') {
    return `${condition.paramPath}>${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'gte') {
    return `${condition.paramPath}>=${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'lt') {
    return `${condition.paramPath}<${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'lte') {
    return `${condition.paramPath}<=${formatLogicalReferenceValue(condition.value)}`;
  }
  if (condition.comparator === 'contains') {
    return `${condition.paramPath} contains ${formatLogicalReferenceValue(condition.value)}`;
  }
  return condition.paramPath;
};

const formatLogicalListItemPrefix = (item: PromptExploderListItem): string | null => {
  const operator = item.logicalOperator ?? null;
  if (!operator) return null;
  const logicalConditions = resolveLogicalConditions(item);
  if (!logicalConditions.length) return null;

  const operatorLabel =
    operator === 'only_if' ? 'Only if' : `${operator.slice(0, 1).toUpperCase()}${operator.slice(1)}`;
  const expression = logicalConditions
    .map((condition, index) => {
      const clause = formatLogicalConditionExpression(condition);
      if (index === 0) return clause;
      const joinLabel = condition.joinWithPrevious === 'or' ? 'OR' : 'AND';
      return `${joinLabel} ${clause}`;
    })
    .join(' ');
  return `${operatorLabel} ${expression}`;
};

const flattenItemsToTextLines = (
  items: PromptExploderListItem[],
  options?: { ordered?: boolean; level?: number }
): string[] => {
  const ordered = options?.ordered ?? false;
  const level = options?.level ?? 0;
  const lines: string[] = [];

  items.forEach((item, index) => {
    const indent = '  '.repeat(level);
    const marker = ordered && level === 0 ? `${index + 1}.` : '*';
    const logicalPrefix = formatLogicalListItemPrefix(item);
    const bodyText = item.text.trim();
    const renderedText = logicalPrefix
      ? (bodyText ? `${logicalPrefix}: ${bodyText}` : logicalPrefix)
      : bodyText;
    lines.push(`${indent}${marker} ${renderedText}`);
    lines.push(...flattenItemsToTextLines(item.children, { ordered: false, level: level + 1 }));
  });

  return lines;
};

const collectReferencedParamsFromItems = (items: PromptExploderListItem[]): string[] => {
  const out = new Set<string>();
  const walk = (nodes: PromptExploderListItem[]): void => {
    nodes.forEach((item) => {
      resolveLogicalConditions(item).forEach((condition) => {
        const path = (condition.paramPath ?? '').trim();
        if (path) out.add(path);
      });
      const legacyPath = (item.referencedParamPath ?? '').trim();
      if (legacyPath) out.add(legacyPath);
      if (item.children.length > 0) walk(item.children);
    });
  };
  walk(items);
  return [...out];
};

const findNextHeadingIndex = (
  lines: string[],
  startIndex: number,
  boundaryHeadings: RegExp[] = [],
  runtime?: PatternRuntime
): number => {
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = toLine(lines[i]);
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isIndentedListContinuationLine(lines, i)) continue;
    if (boundaryHeadings.some((pattern) => pattern.test(trimmed))) {
      return i;
    }
    if (isLikelyHeading(trimmed, runtime)) {
      return i;
    }
  }
  return lines.length;
};

const consumeParagraphBlock = (
  cursor: ParseCursor,
  boundaryHeadings: RegExp[] = [],
  runtime?: PatternRuntime
): string[] => {
  const start = cursor.index;
  const end = findNextHeadingIndex(cursor.lines, start + 1, boundaryHeadings, runtime);
  cursor.index = end;
  return cursor.lines.slice(start, end);
};

const consumeTailBlock = (cursor: ParseCursor): string[] => {
  const start = cursor.index;
  cursor.index = cursor.lines.length;
  return cursor.lines.slice(start);
};

const consumeQaBlock = (
  cursor: ParseCursor,
  runtime?: PatternRuntime
): string[] => {
  const start = cursor.index;
  for (let i = start + 1; i < cursor.lines.length; i += 1) {
    const trimmed = toLine(cursor.lines[i]).trim();
    if (!trimmed) continue;
    if (isIndentedListContinuationLine(cursor.lines, i)) {
      continue;
    }

    if (/^(QA(?:_R)?\d+)\b/i.test(normalizeHeadingLabel(trimmed))) {
      continue;
    }
    if (/^FINAL\s+QA\b/i.test(normalizeHeadingLabel(trimmed))) {
      continue;
    }
    if (/^\s*(\d+[.)]|[*-])\s+/.test(trimmed)) {
      continue;
    }
    if (isLikelyHeading(trimmed, runtime)) {
      cursor.index = i;
      return cursor.lines.slice(start, i);
    }
  }
  return consumeTailBlock(cursor);
};

const consumeBlockUntilBoundary = (
  cursor: ParseCursor,
  boundaryHeadings: RegExp[]
): string[] => {
  const start = cursor.index;
  for (let i = start + 1; i < cursor.lines.length; i += 1) {
    const trimmed = toLine(cursor.lines[i]).trim();
    if (!trimmed) continue;
    if (boundaryHeadings.some((pattern) => pattern.test(trimmed))) {
      cursor.index = i;
      return cursor.lines.slice(start, i);
    }
  }
  cursor.index = cursor.lines.length;
  return cursor.lines.slice(start);
};

const consumeParamsBlock = (cursor: ParseCursor, runtime?: PatternRuntime): string[] => {
  const start = cursor.index;
  let i = start;
  while (i < cursor.lines.length && !/^\s*params\s*=\s*\{/i.test(toLine(cursor.lines[i]))) {
    i += 1;
  }
  if (i >= cursor.lines.length) {
    const fallback = consumeParagraphBlock(cursor, [], runtime);
    return fallback;
  }

  let braceDepth = 0;
  let foundOpening = false;
  let end = i;

  for (let lineIndex = i; lineIndex < cursor.lines.length; lineIndex += 1) {
    const line = toLine(cursor.lines[lineIndex]);
    for (let charIndex = 0; charIndex < line.length; charIndex += 1) {
      const char = line[charIndex] ?? '';
      if (char === '{') {
        braceDepth += 1;
        foundOpening = true;
      } else if (char === '}') {
        braceDepth -= 1;
      }
      if (foundOpening && braceDepth <= 0) {
        end = lineIndex;
        cursor.index = end + 1;
        return cursor.lines.slice(start, end + 1);
      }
    }
  }

  cursor.index = end + 1;
  return cursor.lines.slice(start, end + 1);
};

const parseSequenceSubsections = (
  lines: string[],
  runtime?: PatternRuntime
): PromptExploderSubsection[] => {
  const subsections: PromptExploderSubsection[] = [];
  let currentTitle: string | null = null;
  let currentCode: string | null = null;
  let currentCondition: string | null = null;
  let currentGuidance: string | null = null;
  let buffer: string[] = [];
  const alphaHeadingRegex = resolveBoundaryRegexOptional(
    runtime,
    'segment.subsection.alpha_heading',
    DEFAULT_PATTERN_IDS['segment.subsection.alpha_heading']!
  );
  const referenceNamedRegex = resolveBoundaryRegexOptional(
    runtime,
    'segment.subsection.reference_named',
    DEFAULT_PATTERN_IDS['segment.subsection.reference_named']!
  );
  const referencePlainRegex = resolveBoundaryRegexOptional(
    runtime,
    'segment.subsection.reference_plain',
    DEFAULT_PATTERN_IDS['segment.subsection.reference_plain']!
  );
  const numericBracketRegex = resolveBoundaryRegexOptional(
    runtime,
    'segment.subsection.numeric_bracket_heading',
    DEFAULT_PATTERN_IDS['segment.subsection.numeric_bracket_heading']!
  );
  const bracketRegex = resolveBoundaryRegexOptional(
    runtime,
    'segment.subsection.bracket_heading',
    DEFAULT_PATTERN_IDS['segment.subsection.bracket_heading']!
  );
  const markdownHeadingRegex = resolveBoundaryRegexOptional(
    runtime,
    'segment.subsection.markdown_heading',
    DEFAULT_PATTERN_IDS['segment.subsection.markdown_heading']!
  );

  const flush = (): void => {
    if (!currentTitle && buffer.length === 0) return;
    subsections.push({
      id: subsectionId(),
      title: currentTitle ?? 'Section',
      code: currentCode,
      condition: currentCondition,
      guidance: currentGuidance,
      items: parseListLines(buffer),
    });
    currentTitle = null;
    currentCode = null;
    currentCondition = null;
    currentGuidance = null;
    buffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const normalizedHeading = normalizeHeadingLabel(trimmed);
    const alphaMatch = alphaHeadingRegex.exec(trimmed);
    const refWithNamedHeader = referenceNamedRegex.exec(trimmed);
    const refMatch = referencePlainRegex.exec(trimmed);
    const numericBracketHeadingMatch = numericBracketRegex.exec(trimmed);
    const bracketHeadingMatch = bracketRegex.exec(trimmed);
    const markdownHeadingMatch = markdownHeadingRegex.exec(trimmed);

    if (alphaMatch) {
      flush();
      const alphaCode = (alphaMatch[1] ?? '').trim();
      const alphaTitle = (alphaMatch[2] ?? '').trim();
      currentTitle =
        alphaCode && alphaTitle
          ? `${alphaCode}) ${alphaTitle}`
          : normalizedHeading || trimmed;
      currentCode = null;
      currentCondition = null;
      currentGuidance = null;
      return;
    }

    if (refWithNamedHeader) {
      flush();
      currentCode = (refWithNamedHeader[1] ?? '').toUpperCase();
      const subsectionName = (refWithNamedHeader[2] ?? '').trim();
      const headingTail = (refWithNamedHeader[3] ?? '').trim();
      currentTitle = subsectionName || currentCode;
      if (/^(if|only if|unless|when)\b/i.test(headingTail)) {
        currentCondition = headingTail;
      } else {
        currentCondition = null;
        currentGuidance = headingTail || null;
      }
      return;
    }

    if (refMatch) {
      flush();
      currentCode = (refMatch[1] ?? '').toUpperCase();
      currentTitle = (refMatch[2] ?? '').trim() || currentCode;
      currentCondition = null;
      currentGuidance = null;
      return;
    }

    if (numericBracketHeadingMatch) {
      flush();
      currentTitle = `[${(numericBracketHeadingMatch[1] ?? '').trim()}]`;
      currentCode = null;
      currentCondition = null;
      currentGuidance = null;
      return;
    }

    if (bracketHeadingMatch) {
      flush();
      currentTitle = `[${(bracketHeadingMatch[1] ?? '').trim()}]`;
      currentCode = null;
      currentCondition = null;
      currentGuidance = null;
      return;
    }

    if (markdownHeadingMatch) {
      flush();
      currentTitle = normalizeHeadingLabel(markdownHeadingMatch[0] ?? '') || normalizedHeading;
      currentCode = null;
      currentCondition = null;
      currentGuidance = null;
      return;
    }

    buffer.push(line);
  });

  flush();
  return subsections;
};

const parseQaSubsections = (
  lines: string[],
  runtime?: PatternRuntime
): PromptExploderSubsection[] => {
  const subsections: PromptExploderSubsection[] = [];
  let currentTitle: string | null = null;
  let currentCode: string | null = null;
  let currentCondition: string | null = null;
  let buffer: string[] = [];
  const qaCodeRegex = resolveBoundaryRegexOptional(
    runtime,
    'segment.subsection.qa_code',
    DEFAULT_PATTERN_IDS['segment.subsection.qa_code']!
  );
  const finalQaBoundaryRegex = resolveBoundaryRegexOptional(
    runtime,
    'segment.boundary.final_qa',
    FINAL_QA_BOUNDARY_FALLBACK_RE
  );

  const flush = (): void => {
    if (!currentTitle && !currentCode && buffer.length === 0) return;
    subsections.push({
      id: subsectionId(),
      title: currentTitle ?? currentCode ?? 'QA',
      code: currentCode,
      condition: currentCondition,
      items: parseListLines(buffer),
    });
    currentTitle = null;
    currentCode = null;
    currentCondition = null;
    buffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const normalizedHeading = normalizeHeadingLabel(trimmed);

    const qaMatch = qaCodeRegex.exec(trimmed);
    if (qaMatch) {
      flush();
      currentCode = (qaMatch[1] ?? '').trim().toUpperCase();
      const qaTail = (qaMatch[2] ?? '').trim();
      currentTitle = qaTail || currentCode || normalizedHeading || trimmed;
      currentCondition = null;
      return;
    }

    if (finalQaBoundaryRegex.test(normalizedHeading) || finalQaBoundaryRegex.test(trimmed)) {
      flush();
      const onlyIfMatch = /\((only if[^)]*)\)/i.exec(normalizedHeading);
      currentTitle = normalizedHeading;
      currentCode = null;
      currentCondition = onlyIfMatch?.[1]?.trim() || null;
      return;
    }

    if (!currentTitle && !currentCode) {
      currentTitle = trimmed;
      return;
    }

    buffer.push(line);
  });

  flush();
  return subsections;
};

const inferSegmentType = (title: string, raw: string): PromptExploderSegmentType => {
  const normalizedTitle = normalizeHeadingLabel(title).toLowerCase();
  const normalizedRaw = raw.trim().toLowerCase();
  const trimmedTitle = title.trim();

  if (/^={3,}.+={3,}$/.test(trimmedTitle)) return 'metadata';
  if (/^\s*[^|\n]+(?:\s*\|\s*[^|\n]+){2,}\s*$/.test(trimmedTitle)) return 'metadata';
  if (
    /\b(params|parameters|config|global settings|global_settings)\b/.test(normalizedTitle) &&
    /\bparams\s*=\s*\{/.test(normalizedRaw)
  ) {
    return 'parameter_block';
  }
  if (/^(p\d+|rl\d+|qa(?:_r)?\d+)/i.test(trimmedTitle)) return 'referential_list';
  if (
    /\b(final qa|quality gate|quality checks?|validation module)\b/.test(normalizedTitle) ||
    /\bpass\b[^\n]{0,80}\bfail\b/i.test(raw)
  ) {
    return 'qa_matrix';
  }
  if (
    /\b(pipeline|workflow|execution template|run report)\b/.test(normalizedTitle) ||
    (/^\s*\d+\.\s+/m.test(raw) &&
      /\b(step|module|parse|run|export|validate|execute)\b/.test(normalizedRaw))
  ) {
    return 'hierarchical_list';
  }
  if (
    /\b(requirements|guidelines|constraints|ruleset|modules|data model|logging and audit|error handling|security notes|dry_run_behavior)\b/.test(
      normalizedTitle
    ) ||
    /^\s*[A-Z]\)\s+.+$/m.test(raw) ||
    /(?:^|\n)\s*(RL\d+|QA(?:_R)?\d+)\b/i.test(raw)
  ) {
    return 'sequence';
  }
  if (/\bonly if\b|\bif\b|\buntil\b/.test(normalizedRaw)) return 'conditional_list';
  if (/^\s*(\d+[.)]|[*-]|[A-Z]\))\s+/m.test(raw)) return 'list';
  return 'assigned_text';
};

const createSegment = (args: {
  runtime: PatternRuntime;
  title: string;
  raw: string;
  type?: PromptExploderSegmentType;
  includeInOutput?: boolean;
  code?: string | null;
  condition?: string | null;
  listItems?: PromptExploderListItem[];
  subsections?: PromptExploderSubsection[];
  paramsText?: string;
  paramsObject?: Record<string, unknown> | null;
  paramUiControls?: Record<string, PromptExploderParamUiControl>;
  paramComments?: Record<string, string>;
  paramDescriptions?: Record<string, string>;
  lockType?: boolean;
}): PromptExploderSegment => {
  const inferredType = args.type ?? inferSegmentType(args.title, args.raw);
  const matchedRules = collectMatchedRules(args.runtime, args.raw);
  const matchedPatternIds = matchedRules.map((rule) => rule.id);
  const hintedType = inferTypeFromRuleHints(matchedRules, inferredType);
  const type = args.lockType ? inferredType : hintedType;
  const normalizedRaw = trimTrailingBlankLines(args.raw);
  const shouldParseParams = type === 'parameter_block';
  const extractedParams =
    shouldParseParams && !args.paramsObject ? extractParamsFromPrompt(normalizedRaw) : null;
  const resolvedParamsObject = args.paramsObject
    ?? (extractedParams?.ok ? extractedParams.params : null);
  const resolvedParamsText =
    shouldParseParams
      ? (args.paramsText && args.paramsText.trim().length > 0 ? args.paramsText : normalizedRaw)
      : (args.paramsText ?? '');
  const confidenceBase = 0.45;
  const confidenceBoost = matchedRules.reduce(
    (total, rule) => total + Math.max(0, rule.confidenceBoost),
    0
  );
  const confidence = Math.min(
    0.99,
    confidenceBase + matchedPatternIds.length * 0.06 + confidenceBoost
  );

  return {
    id: segmentId(),
    type,
    title: args.title.trim() || 'Untitled Segment',
    includeInOutput: args.includeInOutput ?? (type !== 'metadata'),
    text: normalizedRaw,
    raw: normalizedRaw,
    code: args.code ?? null,
    condition: args.condition ?? null,
    listItems: args.listItems ?? [],
    subsections: args.subsections ?? [],
    paramsText: resolvedParamsText,
    paramsObject: resolvedParamsObject,
    paramUiControls: args.paramUiControls ?? {},
    paramComments: args.paramComments ?? {},
    paramDescriptions: args.paramDescriptions ?? {},
    matchedPatternIds,
    confidence,
  };
};

const formatHeadingWithCode = (title: string, code: string | null): string => {
  const normalizedTitle = title.trim();
  if (!code) return normalizedTitle;
  const upperCode = code.toUpperCase();
  if (new RegExp(`^${escapeRegExp(upperCode)}\\b`, 'i').test(normalizedTitle)) {
    return normalizedTitle;
  }
  if (!normalizedTitle) return upperCode;
  return `${upperCode} ${normalizedTitle}`;
};

const formatSubsectionHeading = (subsection: PromptExploderSubsection): string => {
  const code = subsection.code?.trim().toUpperCase() || null;
  const title = subsection.title.trim();
  const condition = subsection.condition?.trim() || null;
  const guidance = subsection.guidance?.trim() || null;

  if (code && title && (condition || guidance)) {
    const detail = condition ?? guidance ?? '';
    return `${code} (${title}): ${detail}`.trim();
  }
  if (code && title) {
    return formatHeadingWithCode(title, code);
  }
  if (code) return code;
  return title;
};

const stripLeadingTitleLine = (text: string, title: string): string => {
  const normalized = trimTrailingBlankLines(text);
  if (!normalized) return '';
  const lines = normalized.split('\n');
  const firstLine = normalizeHeadingLabel(lines[0] ?? '');
  const titleLabel = normalizeHeadingLabel(title);
  if (!firstLine || !titleLabel) return normalized;
  if (firstLine.toLowerCase() !== titleLabel.toLowerCase()) return normalized;
  return trimTrailingBlankLines(lines.slice(1).join('\n'));
};

const renderSegment = (segment: PromptExploderSegment): string => {
  const lines: string[] = [];

  const appendTitle = (): void => {
    if (segment.title.trim().length > 0) {
      if (segment.type === 'referential_list') {
        lines.push(formatHeadingWithCode(segment.title, segment.code));
        return;
      }
      lines.push(segment.title.trim());
    }
  };

  switch (segment.type) {
    case 'metadata':
      lines.push(segment.text.trim());
      break;
    case 'parameter_block':
      appendTitle();
      if (segment.paramsText.trim().length > 0) {
        const body = stripLeadingTitleLine(segment.paramsText, segment.title);
        if (body.length > 0) lines.push(body);
      } else if (segment.text.trim().length > 0) {
        const body = stripLeadingTitleLine(segment.text, segment.title);
        if (body.length > 0) lines.push(body);
      }
      break;
    case 'sequence':
      appendTitle();
      if (segment.condition?.trim()) {
        lines.push(segment.condition.trim());
      }
      segment.subsections.forEach((subsection, index) => {
        if (index > 0 || lines.length > 0) {
          lines.push('');
        }
        const subsectionHeading = formatSubsectionHeading(subsection);
        if (subsectionHeading) {
          lines.push(subsectionHeading);
        }
        lines.push(...flattenItemsToTextLines(subsection.items));
      });
      break;
    case 'qa_matrix':
      appendTitle();
      if (segment.subsections.length > 0) {
        segment.subsections.forEach((subsection, index) => {
          if (index > 0 || lines.length > 0) {
            lines.push('');
          }
          const subsectionHeading = formatHeadingWithCode(
            subsection.title,
            subsection.code
          );
          if (subsectionHeading) {
            lines.push(subsectionHeading);
          }
          lines.push(...flattenItemsToTextLines(subsection.items));
        });
        break;
      }
      lines.push(...flattenItemsToTextLines(segment.listItems));
      break;
    case 'hierarchical_list':
    case 'conditional_list':
    case 'referential_list':
    case 'list':
      appendTitle();
      lines.push(...flattenItemsToTextLines(segment.listItems, {
        ordered: segment.type === 'list' || segment.type === 'hierarchical_list',
      }));
      break;
    case 'assigned_text':
    default:
      appendTitle();
      if (segment.text.trim().length > 0) {
        const body = stripLeadingTitleLine(segment.text, segment.title);
        if (body.length > 0) {
          lines.push(body);
        }
      }
      break;
  }

  return trimTrailingBlankLines(lines.join('\n'));
};

type BindingCodeTarget = {
  code: string;
  segmentId: string;
  subsectionId: string | null;
  label: string;
};

const buildBindingCodeTargets = (
  segments: PromptExploderSegment[]
): Map<string, BindingCodeTarget> => {
  const map = new Map<string, BindingCodeTarget>();

  const register = (
    code: string | null | undefined,
    segmentId: string,
    subsectionId: string | null,
    label: string
  ): void => {
    const normalizedCode = (code ?? '').trim().toUpperCase();
    if (!normalizedCode || map.has(normalizedCode)) return;
    map.set(normalizedCode, {
      code: normalizedCode,
      segmentId,
      subsectionId,
      label: label.trim() || normalizedCode,
    });
  };

  segments.forEach((segment) => {
    register(segment.code, segment.id, null, segment.title);
    segment.subsections.forEach((subsection) => {
      register(subsection.code, segment.id, subsection.id, subsection.title);
    });
  });

  return map;
};

const normalizeManualBindings = (
  bindings: PromptExploderBinding[],
  segments: PromptExploderSegment[]
): PromptExploderBinding[] => {
  if (!bindings.length) return [];
  const segmentById = new Map(segments.map((segment) => [segment.id, segment]));
  return bindings
    .filter((binding) => {
      const fromSegment = segmentById.get(binding.fromSegmentId);
      const toSegment = segmentById.get(binding.toSegmentId);
      if (!fromSegment || !toSegment) return false;
      const fromSubsectionId = binding.fromSubsectionId ?? null;
      const toSubsectionId = binding.toSubsectionId ?? null;
      if (
        fromSubsectionId &&
        !fromSegment.subsections.some((subsection) => subsection.id === fromSubsectionId)
      ) {
        return false;
      }
      if (
        toSubsectionId &&
        !toSegment.subsections.some((subsection) => subsection.id === toSubsectionId)
      ) {
        return false;
      }
      return true;
    })
    .map((binding) => ({
      ...binding,
      fromSubsectionId: binding.fromSubsectionId ?? null,
      toSubsectionId: binding.toSubsectionId ?? null,
      origin: 'manual' as const,
    }));
};

const detectAutoBindings = (segments: PromptExploderSegment[]): PromptExploderBinding[] => {
  const bindings: PromptExploderBinding[] = [];
  const codeTargets = buildBindingCodeTargets(segments);
  const paramsSegment = segments.find((segment) => segment.type === 'parameter_block') ?? null;
  const paramPaths = collectParamPaths(paramsSegment?.paramsObject ?? null);
  const isKnownParamPath = (candidate: string): boolean =>
    paramPaths.some((path) => path === candidate || path.endsWith(`.${candidate}`));

  segments.forEach((segment) => {
    const rendered = renderSegment(segment);
    const sourceLabel = segment.title;

    extractReferenceCodes(rendered).forEach((code) => {
      const target = codeTargets.get(code.toUpperCase());
      if (!target) return;
      if (target.segmentId === segment.id) return;
      bindings.push({
        id: bindingId(),
        type: 'references',
        fromSegmentId: segment.id,
        toSegmentId: target.segmentId,
        fromSubsectionId: null,
        toSubsectionId: target.subsectionId,
        sourceLabel,
        targetLabel: `${target.code} ${target.label}`.trim(),
        origin: 'auto',
      });
    });

    if (!paramsSegment || paramsSegment.id === segment.id) {
      return;
    }

    const referencedParams = new Set<string>();
    for (const match of rendered.matchAll(PARAM_REFERENCE_RE)) {
      const paramPath = (match[1] ?? '').trim();
      if (!paramPath || !isKnownParamPath(paramPath)) continue;
      referencedParams.add(paramPath);
    }
    collectReferencedParamsFromItems(segment.listItems).forEach((paramPath) => {
      if (!isKnownParamPath(paramPath)) return;
      referencedParams.add(paramPath);
    });
    segment.subsections.forEach((subsection) => {
      collectReferencedParamsFromItems(subsection.items).forEach((paramPath) => {
        if (!isKnownParamPath(paramPath)) return;
        referencedParams.add(paramPath);
      });
    });

    referencedParams.forEach((paramPath) => {
      bindings.push({
        id: bindingId(),
        type: 'uses_param',
        fromSegmentId: segment.id,
        toSegmentId: paramsSegment.id,
        fromSubsectionId: null,
        toSubsectionId: null,
        sourceLabel,
        targetLabel: `params.${paramPath}`,
        origin: 'auto',
      });
    });
  });

  return bindings;
};

const dedupeBindings = (bindings: PromptExploderBinding[]): PromptExploderBinding[] => {
  const deduped = new Map<string, PromptExploderBinding>();
  bindings.forEach((binding) => {
    const key = `${binding.type}:${binding.fromSegmentId}:${binding.fromSubsectionId ?? ''}:${binding.toSegmentId}:${binding.toSubsectionId ?? ''}:${binding.targetLabel}`;
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, binding);
      return;
    }
    if (existing.origin === 'auto' && binding.origin === 'manual') {
      deduped.set(key, binding);
    }
  });
  return [...deduped.values()];
};

const buildBindings = (
  segments: PromptExploderSegment[],
  manualBindings: PromptExploderBinding[] = []
): PromptExploderBinding[] => {
  const autoBindings = detectAutoBindings(segments);
  const normalizedManual = normalizeManualBindings(manualBindings, segments);
  return dedupeBindings([...autoBindings, ...normalizedManual]);
};

const parseSegments = (prompt: string, runtime: PatternRuntime): PromptExploderSegment[] => {
  const lines = normalizeMultiline(prompt).split('\n');
  const cursor: ParseCursor = {
    lines,
    index: 0,
  };
  const segments: PromptExploderSegment[] = [];
  const studioRelightingBoundary = resolveBoundaryRegex(
    runtime,
    'segment.boundary.studio_relighting',
    STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE
  );
  const pipelineBoundary = resolveBoundaryRegex(
    runtime,
    'segment.boundary.pipeline',
    PIPELINE_BOUNDARY_FALLBACK_RE
  );
  const finalQaBoundary = resolveBoundaryRegex(
    runtime,
    'segment.boundary.final_qa',
    FINAL_QA_BOUNDARY_FALLBACK_RE
  );

  while (cursor.index < lines.length) {
    const line = toLine(lines[cursor.index]);
    const trimmed = line.trim();
    const normalizedHeading = normalizeHeadingLabel(trimmed);

    if (!trimmed) {
      cursor.index += 1;
      continue;
    }

    if (
      matchesBoundaryHeading(
        runtime,
        'segment.boundary.studio_relighting',
        STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE,
        trimmed
      ) ||
      matchesBoundaryHeading(
        runtime,
        'segment.boundary.studio_relighting',
        STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE,
        normalizedHeading
      )
    ) {
      const blockLines = consumeBlockUntilBoundary(cursor, [
        pipelineBoundary,
        finalQaBoundary,
      ]);
      const segmentTitle = blockLines[0]?.trim() || 'STUDIO RELIGHTING EXTENSION';
      const bodyLines = blockLines.slice(1);
      const firstBodyLine = bodyLines.find((line) => line.trim().length > 0) ?? '';
      const hasSectionRuleLine = /^RELIGHTING\s+RULES\b/i.test(normalizeHeadingLabel(firstBodyLine));
      const sectionRuleCondition = hasSectionRuleLine ? normalizeHeadingLabel(firstBodyLine) : null;
      const subsectionLines = hasSectionRuleLine
        ? bodyLines.slice(bodyLines.indexOf(firstBodyLine) + 1)
        : bodyLines;
      const subsections = parseSequenceSubsections(subsectionLines, runtime);
      segments.push(
        createSegment({
          runtime,
          type: 'sequence',
          lockType: true,
          title: segmentTitle,
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          subsections,
          condition: sectionRuleCondition,
          includeInOutput: true,
        })
      );
      continue;
    }

    if (testPattern(runtime, 'segment.metadata.banner', trimmed)) {
      segments.push(
        createSegment({
          runtime,
          type: 'metadata',
          lockType: true,
          title: trimmed,
          raw: trimmed,
          includeInOutput: false,
        })
      );
      cursor.index += 1;
      continue;
    }

    if (
      /^PARAMS\b/i.test(normalizedHeading) ||
      /^PARAMETERS\b/i.test(normalizedHeading) ||
      /^GLOBAL[_\s]SETTINGS\b/i.test(normalizedHeading) ||
      testPattern(runtime, 'segment.params.block', trimmed)
    ) {
      const blockLines = consumeParamsBlock(cursor, runtime);
      const raw = trimTrailingBlankLines(blockLines.join('\n'));
      const extracted = extractParamsFromPrompt(raw);
      const headingTitle = normalizeHeadingLabel(blockLines[0] ?? '') || 'PARAMS';
      segments.push(
        createSegment({
          runtime,
          type: 'parameter_block',
          lockType: true,
          title: headingTitle,
          raw,
          paramsText: raw,
          paramsObject: extracted.ok ? extracted.params : null,
        })
      );
      continue;
    }

    if (/^VALIDATION(?:_MODULE|\s+MODULE)\b/i.test(normalizedHeading)) {
      const blockLines = consumeBlockUntilBoundary(cursor, [
        BRACKET_SECTION_HEADING_RE,
        /^END\b/i,
      ]);
      const body = blockLines.slice(1);
      segments.push(
        createSegment({
          runtime,
          type: 'qa_matrix',
          lockType: true,
          title: normalizeHeadingLabel(blockLines[0] ?? '') || 'VALIDATION_MODULE',
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          listItems: parseListLines(body),
          subsections: parseQaSubsections(body, runtime),
          condition: /\bfix\s+until\b/i.test(blockLines.join('\n'))
            ? 'fix_until_all_pass'
            : null,
        })
      );
      continue;
    }

    if (/^DRY[_\s]RUN[_\s]BEHAVIOR\b/i.test(normalizedHeading)) {
      const blockLines = consumeBlockUntilBoundary(cursor, [
        BRACKET_SECTION_HEADING_RE,
        /^END\b/i,
      ]);
      const body = blockLines.slice(1);
      segments.push(
        createSegment({
          runtime,
          type: 'conditional_list',
          lockType: true,
          title: normalizeHeadingLabel(blockLines[0] ?? '') || 'DRY_RUN_BEHAVIOR',
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          listItems: parseListLines(body),
          condition: /\bDRY[_\s]RUN\b/i.test(blockLines.join('\n'))
            ? 'dry_run_branching'
            : null,
        })
      );
      continue;
    }

    const isRequirementsHeading =
      matchesBoundaryHeading(
        runtime,
        'segment.boundary.requirements',
        REQUIREMENTS_BOUNDARY_FALLBACK_RE,
        normalizedHeading
      ) ||
      matchesBoundaryHeading(
        runtime,
        'segment.boundary.requirements',
        REQUIREMENTS_BOUNDARY_FALLBACK_RE,
        trimmed
      );

    if (
      isRequirementsHeading ||
      /^PARSING\s*&\s*EXECUTION\s+RULES\b/i.test(normalizedHeading) ||
      /^MODULES\b/i.test(normalizedHeading) ||
      /^DATA\s+MODEL\b/i.test(normalizedHeading) ||
      /^LOGGING(?:_AND_AUDIT|\s+AND\s+AUDIT)\b/i.test(normalizedHeading) ||
      /^ERROR(?:_HANDLING|\s+HANDLING)\b/i.test(normalizedHeading) ||
      /^SECURITY(?:_NOTES|\s+NOTES)\b/i.test(normalizedHeading)
    ) {
      const blockLines = isRequirementsHeading
        ? consumeBlockUntilBoundary(cursor, [
          studioRelightingBoundary,
          pipelineBoundary,
          finalQaBoundary,
        ])
        : consumeParagraphBlock(
          cursor,
          [studioRelightingBoundary, pipelineBoundary, finalQaBoundary],
          runtime
        );
      const body = blockLines.slice(1);
      const subsections = parseSequenceSubsections(body, runtime);
      segments.push(
        createSegment({
          runtime,
          type: 'sequence',
          lockType: true,
          title: normalizeHeadingLabel(blockLines[0] ?? '') || 'REQUIREMENTS',
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          subsections,
        })
      );
      continue;
    }

    if (
      matchesBoundaryHeading(
        runtime,
        'segment.boundary.pipeline',
        PIPELINE_BOUNDARY_FALLBACK_RE,
        normalizedHeading
      ) ||
      matchesBoundaryHeading(
        runtime,
        'segment.boundary.pipeline',
        PIPELINE_BOUNDARY_FALLBACK_RE,
        trimmed
      )
    ) {
      const blockLines = consumeBlockUntilBoundary(cursor, [finalQaBoundary]);
      const title = normalizeHeadingLabel(blockLines[0] ?? '') || 'PIPELINE';
      const body = blockLines.slice(1);
      segments.push(
        createSegment({
          runtime,
          type: 'hierarchical_list',
          lockType: true,
          title,
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          listItems: parseListLines(body),
          condition: body.some((value) => /\bif\b|\bonly if\b/i.test(value))
            ? 'conditional'
            : null,
        })
      );
      continue;
    }

    if (
      matchesBoundaryHeading(
        runtime,
        'segment.boundary.final_qa',
        FINAL_QA_BOUNDARY_FALLBACK_RE,
        normalizedHeading
      ) ||
      matchesBoundaryHeading(
        runtime,
        'segment.boundary.final_qa',
        FINAL_QA_BOUNDARY_FALLBACK_RE,
        trimmed
      )
    ) {
      const blockLines = consumeQaBlock(cursor, runtime);
      const body = blockLines.slice(1);
      segments.push(
        createSegment({
          runtime,
          type: 'qa_matrix',
          lockType: true,
          title: normalizeHeadingLabel(blockLines[0] ?? '') || 'FINAL QA',
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          listItems: parseListLines(body),
          subsections: parseQaSubsections(body, runtime),
          condition: /\bfix\s+until\b/i.test(blockLines.join('\n'))
            ? 'fix_until_all_pass'
            : null,
        })
      );
      continue;
    }

    const parsedTitle = parseCodeFromLine(normalizedHeading);
    if (parsedTitle.code) {
      const blockLines = consumeParagraphBlock(cursor, [], runtime);
      const title =
        normalizeHeadingLabel(blockLines[0] ?? '') || parsedTitle.title;
      segments.push(
        createSegment({
          runtime,
          type: 'referential_list',
          lockType: true,
          title,
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          code: parsedTitle.code,
          listItems: parseListLines(blockLines.slice(1)),
        })
      );
      continue;
    }

    if (/^NON-NEGOTIABLE\s+GOAL\b/i.test(normalizedHeading)) {
      const blockLines = consumeParagraphBlock(
        cursor,
        [/^PARAMS\b/i, /^PARAMETERS\b/i, /^GLOBAL[_\s]SETTINGS\b/i],
        runtime
      );
      segments.push(
        createSegment({
          runtime,
          type: 'list',
          lockType: true,
          title: normalizeHeadingLabel(blockLines[0] ?? '') || 'NON-NEGOTIABLE GOAL',
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          listItems: parseListLines(blockLines.slice(1)),
        })
      );
      continue;
    }

    if (cursor.index === 0 && /^\s*[^|\n]+(?:\s*\|\s*[^|\n]+){2,}\s*$/.test(trimmed)) {
      segments.push(
        createSegment({
          runtime,
          type: 'metadata',
          lockType: true,
          title: trimmed,
          raw: trimmed,
          includeInOutput: false,
        })
      );
      cursor.index += 1;
      continue;
    }

    if (isLikelyHeading(trimmed, runtime)) {
      const blockLines = consumeParagraphBlock(cursor, [], runtime);
      const raw = trimTrailingBlankLines(blockLines.join('\n'));
      const body = blockLines.slice(1);
      const hasList = body.some((value) => /^\s*(\d+[.)]|[*-]|[A-Z]\))\s+/.test(value));
      segments.push(
        createSegment({
          runtime,
          type: hasList ? 'list' : 'assigned_text',
          title: normalizeHeadingLabel(blockLines[0] ?? '') || 'Section',
          raw,
          listItems: hasList ? parseListLines(body) : [],
        })
      );
      continue;
    }

    const blockLines = consumeParagraphBlock(cursor, [], runtime);
    segments.push(
      createSegment({
        runtime,
        type: 'assigned_text',
        title: normalizeHeadingLabel(blockLines[0] ?? '') || 'Section',
        raw: trimTrailingBlankLines(blockLines.join('\n')),
      })
    );
  }

  return segments;
};

const applyLearnedTemplateTypes = (
  segments: PromptExploderSegment[],
  templates: PromptExploderLearnedTemplate[],
  similarityThreshold: number
): PromptExploderSegment[] => {
  if (templates.length === 0) return segments;

  return segments.map((segment) => {
    const inferred = inferTypeFromLearnedTemplates(
      segment,
      templates,
      similarityThreshold
    );
    if (!inferred.matchedTemplateId && inferred.type === segment.type) {
      return segment;
    }
    const nextPatternIds = inferred.matchedTemplateId
      ? [
        ...new Set([
          ...segment.matchedPatternIds,
          `segment.learned.${inferred.type}.${inferred.matchedTemplateId}`,
        ]),
      ]
      : segment.matchedPatternIds;
    return {
      ...segment,
      type: inferred.type,
      confidence: inferred.confidence,
      matchedPatternIds: nextPatternIds,
    };
  });
};

export function explodePromptText(args: {
  prompt: string;
  validationRules?: PromptValidationRule[] | null;
  learnedTemplates?: PromptExploderLearnedTemplate[] | null;
  similarityThreshold?: number;
}): PromptExploderDocument {
  const prompt = normalizeMultiline(args.prompt);
  const runtime = compileRuntimePatterns(args.validationRules);
  const parsedSegments = parseSegments(prompt, runtime);
  const segments = applyLearnedTemplateTypes(
    parsedSegments,
    args.learnedTemplates ?? [],
    Math.min(0.95, Math.max(0.3, args.similarityThreshold ?? 0.68))
  );
  const bindings = buildBindings(segments);
  const warnings: string[] = [];

  if (segments.length === 0) {
    warnings.push('No segments were detected.');
  }

  if (!segments.some((segment) => segment.type === 'parameter_block')) {
    warnings.push('No PARAMS block was detected.');
  }

  if (!segments.some((segment) => segment.type === 'qa_matrix')) {
    warnings.push('No FINAL QA matrix was detected.');
  }

  const reassembledPrompt = reassemblePromptSegments(segments);

  return {
    version: 1,
    sourcePrompt: prompt,
    segments,
    bindings,
    warnings,
    reassembledPrompt,
  };
}

export function reassemblePromptSegments(segments: PromptExploderSegment[]): string {
  const rendered = segments
    .filter((segment) => segment.includeInOutput)
    .map((segment) => renderSegment(segment))
    .filter((value) => value.trim().length > 0);

  return trimTrailingBlankLines(rendered.join('\n\n'));
}

export function updatePromptExploderDocument(
  document: PromptExploderDocument,
  segments: PromptExploderSegment[],
  manualBindings: PromptExploderBinding[] = []
): PromptExploderDocument {
  const bindings = buildBindings(segments, manualBindings);
  const warnings = [...document.warnings];
  const reassembledPrompt = reassemblePromptSegments(segments);

  return {
    ...document,
    segments,
    bindings,
    reassembledPrompt,
    warnings,
  };
}

export function ensureSegmentTitle(segment: PromptExploderSegment): PromptExploderSegment {
  if (segment.title.trim().length > 0) return segment;
  return {
    ...segment,
    title: `Segment ${segment.id}`,
  };
}

export function moveByDelta<T>(items: T[], index: number, delta: number): T[] {
  const targetIndex = index + delta;
  if (index < 0 || index >= items.length) return items;
  if (targetIndex < 0 || targetIndex >= items.length) return items;
  const next = [...items];
  const [removed] = next.splice(index, 1);
  if (!removed) return items;
  next.splice(targetIndex, 0, removed);
  return next;
}

export function cloneListItems(items: PromptExploderListItem[]): PromptExploderListItem[] {
  return items.map((item) => ({
    ...item,
    logicalConditions: (item.logicalConditions ?? []).map((condition) => ({
      ...condition,
    })),
    children: cloneListItems(item.children),
  }));
}
