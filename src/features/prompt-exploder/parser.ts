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
};
const BRACKET_SECTION_HEADING_RE = /^\s*\[[A-Z0-9 _()\-/:&+.,]{2,}]$/i;

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

const isLikelyHeading = (line: string, runtime?: PatternRuntime): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^`{3,}/.test(trimmed)) return false;
  if (/^={3,}.+={3,}$/.test(trimmed)) return true;
  if (/^#{1,6}\s+\S+/.test(trimmed)) return true;
  if (/^\[[A-Z0-9 _()\-/:&+.,]{2,}]$/i.test(trimmed)) return true;
  if (/^[^|\n]+(?:\s*\|\s*[^|\n]+){2,}$/.test(trimmed)) return true;
  if (runtime?.headingRules.some((rule) => rule.regex.test(trimmed))) return true;
  if (/^\d+[.)]\s+/.test(trimmed)) return false;
  if (/^[*-]\s+/.test(trimmed)) return false;
  if (/^[A-Z]\)\s+/.test(trimmed)) return false;
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
): PromptExploderListItem['logicalOperator'] => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'only if') return 'only_if';
  if (normalized === 'if') return 'if';
  if (normalized === 'unless') return 'unless';
  if (normalized === 'when') return 'when';
  return null;
};

const normalizeLogicalComparator = (
  raw: string | null | undefined
): PromptExploderListItem['referencedComparator'] => {
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

const parseLogicalListItemPrefix = (text: string): {
  text: string;
  logicalOperator: PromptExploderListItem['logicalOperator'];
  referencedParamPath: string;
  referencedComparator: PromptExploderListItem['referencedComparator'];
  referencedValue: unknown;
} | null => {
  const trimmed = text.trim();
  const prefixMatch = /^(if|only if|unless|when)\s+(.+?)(?::|,\s+)(.+)$/i.exec(trimmed);
  if (!prefixMatch) return null;

  const operator = normalizeLogicalOperator(prefixMatch[1] ?? '');
  const expression = (prefixMatch[2] ?? '').trim();
  const statement = (prefixMatch[3] ?? '').trim();
  if (!operator || !expression || !statement) return null;

  const expressionMatch = /^([A-Za-z_][A-Za-z0-9_.[\]]*)(?:\s*(==|=|!=|>=|<=|>|<|contains)\s*(.+))?$/i.exec(
    expression
  );
  if (!expressionMatch) return null;

  const paramPath = normalizeLogicalParamPath(expressionMatch[1] ?? '');
  if (!paramPath) return null;
  const rawComparator = expressionMatch[2] ?? null;
  const comparator = normalizeLogicalComparator(rawComparator);
  const referencedComparator: PromptExploderListItem['referencedComparator'] =
    comparator ?? (operator === 'unless' ? 'falsy' : 'truthy');
  const referencedValue =
    comparator ? parseLogicalReferenceValue(expressionMatch[3]) : null;

  return {
    text: statement,
    logicalOperator: operator,
    referencedParamPath: paramPath,
    referencedComparator,
    referencedValue,
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
    const cleaned = raw
      .replace(/^\s*(\d+[.)]|[A-Z]\)|[*-])\s+/, '')
      .trim();

    if (!cleaned) return;

    const logicalPrefix = parseLogicalListItemPrefix(cleaned);
    const item: PromptExploderListItem = {
      id: listItemId(),
      text: logicalPrefix?.text ?? cleaned,
      logicalOperator: logicalPrefix?.logicalOperator ?? null,
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

const formatLogicalListItemPrefix = (item: PromptExploderListItem): string | null => {
  const operator = item.logicalOperator ?? null;
  const paramPath = (item.referencedParamPath ?? '').trim();
  if (!operator || !paramPath) return null;

  const operatorLabel =
    operator === 'only_if' ? 'Only if' : `${operator.slice(0, 1).toUpperCase()}${operator.slice(1)}`;
  const comparator = item.referencedComparator ?? (operator === 'unless' ? 'falsy' : 'truthy');

  if (comparator === 'truthy') return `${operatorLabel} ${paramPath}`;
  if (comparator === 'falsy') return `${operatorLabel} ${paramPath}=false`;
  if (comparator === 'equals') return `${operatorLabel} ${paramPath}=${formatLogicalReferenceValue(item.referencedValue)}`;
  if (comparator === 'not_equals') return `${operatorLabel} ${paramPath}!=${formatLogicalReferenceValue(item.referencedValue)}`;
  if (comparator === 'gt') return `${operatorLabel} ${paramPath}>${formatLogicalReferenceValue(item.referencedValue)}`;
  if (comparator === 'gte') return `${operatorLabel} ${paramPath}>=${formatLogicalReferenceValue(item.referencedValue)}`;
  if (comparator === 'lt') return `${operatorLabel} ${paramPath}<${formatLogicalReferenceValue(item.referencedValue)}`;
  if (comparator === 'lte') return `${operatorLabel} ${paramPath}<=${formatLogicalReferenceValue(item.referencedValue)}`;
  if (comparator === 'contains') {
    return `${operatorLabel} ${paramPath} contains ${formatLogicalReferenceValue(item.referencedValue)}`;
  }
  return `${operatorLabel} ${paramPath}`;
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
      const path = (item.referencedParamPath ?? '').trim();
      if (path) out.add(path);
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

const parseSequenceSubsections = (lines: string[]): PromptExploderSubsection[] => {
  const subsections: PromptExploderSubsection[] = [];
  let currentTitle: string | null = null;
  let currentCode: string | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (!currentTitle && buffer.length === 0) return;
    const headingAndBody = `${currentTitle ?? ''}\n${buffer.join('\n')}`;
    const conditionMatch =
      /\bonly if\b[^\n.]*/i.exec(headingAndBody) ??
      /\bif\b[^\n.]*/i.exec(headingAndBody) ??
      /\bunless\b[^\n.]*/i.exec(headingAndBody);
    subsections.push({
      id: subsectionId(),
      title: currentTitle ?? 'Section',
      code: currentCode,
      condition: conditionMatch?.[0]?.trim() || null,
      items: parseListLines(buffer),
    });
    currentTitle = null;
    currentCode = null;
    buffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const normalizedHeading = normalizeHeadingLabel(trimmed);
    const alphaMatch = /^([A-Z])\)\s+(.+)$/.exec(trimmed);
    const refMatch = /^(RL\d+|P\d+|QA(?:_R)?\d+)\b\s*[—:-]?\s*(.*)$/i.exec(trimmed);
    const numericBracketHeadingMatch = /^\d+\.\s+\[([A-Z0-9 _()\-/:&+.,]{2,})]$/.exec(trimmed);
    const bracketHeadingMatch = /^\[([A-Z0-9 _()\-/:&+.,]{2,})]$/.exec(trimmed);
    const markdownHeadingMatch = /^#{1,6}\s+(.+)$/.exec(trimmed);

    if (alphaMatch) {
      flush();
      currentTitle = `${alphaMatch[1] ?? ''}) ${(alphaMatch[2] ?? '').trim()}`;
      currentCode = null;
      return;
    }

    if (refMatch) {
      flush();
      currentCode = (refMatch[1] ?? '').toUpperCase();
      currentTitle = (refMatch[2] ?? '').trim() || currentCode;
      return;
    }

    if (numericBracketHeadingMatch) {
      flush();
      currentTitle = `[${(numericBracketHeadingMatch[1] ?? '').trim()}]`;
      currentCode = null;
      return;
    }

    if (bracketHeadingMatch) {
      flush();
      currentTitle = `[${(bracketHeadingMatch[1] ?? '').trim()}]`;
      currentCode = null;
      return;
    }

    if (markdownHeadingMatch) {
      flush();
      currentTitle = normalizeHeadingLabel(markdownHeadingMatch[0] ?? '') || normalizedHeading;
      currentCode = null;
      return;
    }

    buffer.push(line);
  });

  flush();
  return subsections;
};

const parseQaSubsections = (lines: string[]): PromptExploderSubsection[] => {
  const subsections: PromptExploderSubsection[] = [];
  let currentTitle: string | null = null;
  let currentCode: string | null = null;
  let buffer: string[] = [];

  const flush = (): void => {
    if (!currentTitle && !currentCode && buffer.length === 0) return;
    const headingAndBody = `${currentTitle ?? ''}\n${buffer.join('\n')}`;
    const conditionMatch =
      /\bonly if\b[^\n.]*/i.exec(headingAndBody) ??
      /\bif\b[^\n.]*/i.exec(headingAndBody) ??
      /\bfix\s+until\b[^\n.]*/i.exec(headingAndBody);
    subsections.push({
      id: subsectionId(),
      title: currentTitle ?? currentCode ?? 'QA',
      code: currentCode,
      condition: conditionMatch?.[0]?.trim() || null,
      items: parseListLines(buffer),
    });
    currentTitle = null;
    currentCode = null;
    buffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const normalizedHeading = normalizeHeadingLabel(trimmed);

    const qaMatch = /^(QA(?:_R)?\d+)\b\s*[—:-]?\s*(.*)$/i.exec(trimmed);
    if (qaMatch) {
      flush();
      currentCode = (qaMatch[1] ?? '').toUpperCase();
      currentTitle = (qaMatch[2] ?? '').trim() || currentCode;
      return;
    }

    if (/^FINAL\s+QA\b/i.test(normalizedHeading)) {
      flush();
      currentTitle = normalizedHeading;
      currentCode = null;
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
        lines.push(segment.paramsText.trim());
      } else if (segment.text.trim().length > 0) {
        lines.push(segment.text.trim());
      }
      break;
    case 'sequence':
      appendTitle();
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
      if (segment.text.trim().length > 0 && segment.text.trim() !== segment.title.trim()) {
        lines.push(segment.text.trim());
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

  while (cursor.index < lines.length) {
    const line = toLine(lines[cursor.index]);
    const trimmed = line.trim();
    const normalizedHeading = normalizeHeadingLabel(trimmed);

    if (!trimmed) {
      cursor.index += 1;
      continue;
    }

    if (
      /^===\s*STUDIO\s+RELIGHTING/i.test(trimmed) ||
      /^STUDIO\s+RELIGHTING\b/i.test(normalizedHeading)
    ) {
      const blockLines = consumeBlockUntilBoundary(cursor, [
        /^PIPELINE\b/i,
        /^FINAL\s+QA\b/i,
      ]);
      const segmentTitle = blockLines[0]?.trim() || 'STUDIO RELIGHTING EXTENSION';
      const subsections = parseSequenceSubsections(blockLines.slice(1));
      segments.push(
        createSegment({
          runtime,
          type: 'sequence',
          lockType: true,
          title: segmentTitle,
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          subsections,
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
          subsections: parseQaSubsections(body),
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

    if (
      /^REQUIREMENTS\b/i.test(normalizedHeading) ||
      /^COMPOSITING\s+REQUIREMENTS\b/i.test(normalizedHeading) ||
      /^PARSING\s*&\s*EXECUTION\s+RULES\b/i.test(normalizedHeading) ||
      /^MODULES\b/i.test(normalizedHeading) ||
      /^DATA\s+MODEL\b/i.test(normalizedHeading) ||
      /^LOGGING(?:_AND_AUDIT|\s+AND\s+AUDIT)\b/i.test(normalizedHeading) ||
      /^ERROR(?:_HANDLING|\s+HANDLING)\b/i.test(normalizedHeading) ||
      /^SECURITY(?:_NOTES|\s+NOTES)\b/i.test(normalizedHeading)
    ) {
      const blockLines = consumeParagraphBlock(
        cursor,
        [/^===\s*STUDIO\s+RELIGHTING/i, /^PIPELINE\b/i, /^FINAL\s+QA\b/i],
        runtime
      );
      const body = blockLines.slice(1);
      const subsections = parseSequenceSubsections(body);
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
      /^PIPELINE\b/i.test(normalizedHeading) ||
      /^WORKFLOW\b/i.test(normalizedHeading) ||
      /^PROCESS\b/i.test(normalizedHeading) ||
      /^EXECUTION\s+TEMPLATE\b/i.test(normalizedHeading)
    ) {
      const blockLines = consumeParagraphBlock(cursor, [/^FINAL\s+QA\b/i], runtime);
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

    if (/^FINAL\s+QA\b/i.test(normalizedHeading)) {
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
          subsections: parseQaSubsections(body),
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
    children: cloneListItems(item.children),
  }));
}
