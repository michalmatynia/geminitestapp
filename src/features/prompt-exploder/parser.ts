import { extractParamsFromPrompt } from '@/features/prompt-engine/prompt-params';
import type { PromptValidationRule } from '@/features/prompt-engine/settings';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
  PromptExploderListItem,
  PromptExploderSegment,
  PromptExploderSegmentType,
  PromptExploderSubsection,
} from './types';

const REFERENCE_CODE_RE = /\b(P\d+|RL\d+|QA(?:_R)?\d+)\b/g;
const PARAM_REFERENCE_RE = /\b([a-z_]+(?:\.[a-z_]+)+)\b/g;

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

type PatternRuntime = {
  byId: Map<string, RegExp>;
  scopedRules: PromptValidationRule[];
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

const isLikelyHeading = (line: string): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^={3,}.+={3,}$/.test(trimmed)) return true;
  if (/^\d+[.)]\s+/.test(trimmed)) return false;
  if (/^[*-]\s+/.test(trimmed)) return false;
  if (/^[A-Z]\)\s+/.test(trimmed)) return false;
  if (/^(P\d+|RL\d+|QA(?:_R)?\d+)\b/i.test(trimmed)) return true;
  if (/^[A-Z][A-Z0-9 _()\-/:&+.,]{2,}$/.test(trimmed)) return true;
  return /^(ROLE|PARAMS|REQUIREMENTS|PIPELINE|FINAL QA)\b/i.test(trimmed);
};

const compileRuntimePatterns = (rules: PromptValidationRule[] | null | undefined): PatternRuntime => {
  const byId = new Map<string, RegExp>();
  Object.entries(DEFAULT_PATTERN_IDS).forEach(([id, regex]) => {
    byId.set(id, regex);
  });

  const scopedRules = (rules ?? []).filter((rule) => {
    if (!rule.enabled) return false;
    if (rule.kind !== 'regex') return false;
    const scopes = rule.appliesToScopes ?? [];
    return scopes.length === 0 || scopes.includes('prompt_exploder') || scopes.includes('global');
  });

  scopedRules.forEach((rule) => {
    if (rule.kind !== 'regex') return;
    try {
      byId.set(rule.id, new RegExp(rule.pattern, rule.flags || undefined));
      if (DEFAULT_PATTERN_IDS[rule.id]) {
        byId.set(rule.id, new RegExp(rule.pattern, rule.flags || undefined));
      }
    } catch {
      // Keep default/fallback regex when a custom rule is invalid.
    }
  });

  return {
    byId,
    scopedRules,
  };
};

const testPattern = (runtime: PatternRuntime, patternId: string, value: string): boolean => {
  const regex = runtime.byId.get(patternId) ?? DEFAULT_PATTERN_IDS[patternId];
  if (!regex) return false;
  return regex.test(value);
};

const collectMatchedPatternIds = (
  runtime: PatternRuntime,
  text: string,
  defaults: string[] = []
): string[] => {
  const matched = new Set<string>(defaults);
  runtime.scopedRules.forEach((rule) => {
    if (rule.kind !== 'regex') return;
    try {
      const regex = new RegExp(rule.pattern, rule.flags || undefined);
      if (regex.test(text)) {
        matched.add(rule.id);
      }
    } catch {
      // Ignore invalid regex.
    }
  });
  Object.entries(DEFAULT_PATTERN_IDS).forEach(([id, regex]) => {
    if (regex.test(text)) {
      matched.add(id);
    }
  });
  return [...matched];
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

    const item: PromptExploderListItem = {
      id: listItemId(),
      text: cleaned,
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
    lines.push(`${indent}${marker} ${item.text}`);
    lines.push(...flattenItemsToTextLines(item.children, { ordered: false, level: level + 1 }));
  });

  return lines;
};

const findNextHeadingIndex = (
  lines: string[],
  startIndex: number,
  boundaryHeadings: RegExp[] = []
): number => {
  for (let i = startIndex; i < lines.length; i += 1) {
    const line = toLine(lines[i]);
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (boundaryHeadings.some((pattern) => pattern.test(trimmed))) {
      return i;
    }
    if (isLikelyHeading(trimmed)) {
      return i;
    }
  }
  return lines.length;
};

const consumeParagraphBlock = (
  cursor: ParseCursor,
  boundaryHeadings: RegExp[] = []
): string[] => {
  const start = cursor.index;
  const end = findNextHeadingIndex(cursor.lines, start + 1, boundaryHeadings);
  cursor.index = end;
  return cursor.lines.slice(start, end);
};

const consumeTailBlock = (cursor: ParseCursor): string[] => {
  const start = cursor.index;
  cursor.index = cursor.lines.length;
  return cursor.lines.slice(start);
};

const consumeParamsBlock = (cursor: ParseCursor): string[] => {
  const start = cursor.index;
  let i = start;
  while (i < cursor.lines.length && !/^\s*params\s*=\s*\{/i.test(toLine(cursor.lines[i]))) {
    i += 1;
  }
  if (i >= cursor.lines.length) {
    const fallback = consumeParagraphBlock(cursor);
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
    const alphaMatch = /^([A-Z])\)\s+(.+)$/.exec(trimmed);
    const refMatch = /^(RL\d+|P\d+|QA(?:_R)?\d+)\b\s*[—:-]?\s*(.*)$/i.exec(trimmed);

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

    const qaMatch = /^(QA(?:_R)?\d+)\b\s*[—:-]?\s*(.*)$/i.exec(trimmed);
    if (qaMatch) {
      flush();
      currentCode = (qaMatch[1] ?? '').toUpperCase();
      currentTitle = (qaMatch[2] ?? '').trim() || currentCode;
      return;
    }

    if (/^FINAL\s+QA\b/i.test(trimmed)) {
      flush();
      currentTitle = trimmed;
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
  const normalizedTitle = title.trim().toLowerCase();
  const normalizedRaw = raw.trim().toLowerCase();

  if (/^={3,}.+={3,}$/.test(title.trim())) return 'metadata';
  if (/\bparams\b/.test(normalizedTitle) && /\bparams\s*=\s*\{/.test(normalizedRaw)) {
    return 'parameter_block';
  }
  if (/^(p\d+|rl\d+|qa(?:_r)?\d+)/i.test(title.trim())) return 'referential_list';
  if (/\bfinal qa\b/.test(normalizedTitle)) return 'qa_matrix';
  if (/\bpipeline\b/.test(normalizedTitle)) return 'hierarchical_list';
  if (/\brequirements\b/.test(normalizedTitle)) return 'sequence';
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
}): PromptExploderSegment => {
  const type = args.type ?? inferSegmentType(args.title, args.raw);
  const matchedPatternIds = collectMatchedPatternIds(args.runtime, args.raw);
  const confidenceBase = 0.45;
  const confidence = Math.min(0.99, confidenceBase + matchedPatternIds.length * 0.06);

  return {
    id: segmentId(),
    type,
    title: args.title.trim() || 'Untitled Segment',
    includeInOutput: args.includeInOutput ?? (type !== 'metadata'),
    text: trimTrailingBlankLines(args.raw),
    raw: trimTrailingBlankLines(args.raw),
    code: args.code ?? null,
    condition: args.condition ?? null,
    listItems: args.listItems ?? [],
    subsections: args.subsections ?? [],
    paramsText: args.paramsText ?? '',
    paramsObject: args.paramsObject ?? null,
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

    for (const match of rendered.matchAll(PARAM_REFERENCE_RE)) {
      const paramPath = (match[1] ?? '').trim();
      if (!paramPath) continue;
      if (!paramPaths.some((path) => path === paramPath || path.endsWith(paramPath))) {
        continue;
      }
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
    }
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

    if (!trimmed) {
      cursor.index += 1;
      continue;
    }

    if (testPattern(runtime, 'segment.metadata.banner', trimmed)) {
      segments.push(
        createSegment({
          runtime,
          type: 'metadata',
          title: trimmed,
          raw: trimmed,
          includeInOutput: false,
        })
      );
      cursor.index += 1;
      continue;
    }

    if (/^PARAMS\b/i.test(trimmed) || testPattern(runtime, 'segment.params.block', trimmed)) {
      const blockLines = consumeParamsBlock(cursor);
      const raw = trimTrailingBlankLines(blockLines.join('\n'));
      const extracted = extractParamsFromPrompt(raw);
      segments.push(
        createSegment({
          runtime,
          type: 'parameter_block',
          title: 'PARAMS',
          raw,
          paramsText: raw,
          paramsObject: extracted.ok ? extracted.params : null,
        })
      );
      continue;
    }

    if (/^REQUIREMENTS\b/i.test(trimmed)) {
      const blockLines = consumeParagraphBlock(cursor, [/^===\s*STUDIO\s+RELIGHTING/i, /^PIPELINE\b/i, /^FINAL\s+QA\b/i]);
      const body = blockLines.slice(1);
      const subsections = parseSequenceSubsections(body);
      segments.push(
        createSegment({
          runtime,
          type: 'sequence',
          title: 'REQUIREMENTS',
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          subsections,
        })
      );
      continue;
    }

    if (/^PIPELINE\b/i.test(trimmed)) {
      const blockLines = consumeParagraphBlock(cursor, [/^FINAL\s+QA\b/i]);
      const title = blockLines[0]?.trim() || 'PIPELINE';
      const body = blockLines.slice(1);
      segments.push(
        createSegment({
          runtime,
          type: 'hierarchical_list',
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

    if (/^FINAL\s+QA\b/i.test(trimmed)) {
      const blockLines = consumeTailBlock(cursor);
      const body = blockLines.slice(1);
      segments.push(
        createSegment({
          runtime,
          type: 'qa_matrix',
          title: blockLines[0]?.trim() || 'FINAL QA',
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

    if (/^===\s*STUDIO\s+RELIGHTING/i.test(trimmed)) {
      const blockLines = consumeParagraphBlock(cursor, [/^PIPELINE\b/i, /^FINAL\s+QA\b/i]);
      const segmentTitle = blockLines[0]?.trim() || 'STUDIO RELIGHTING EXTENSION';
      const subsections = parseSequenceSubsections(blockLines.slice(2));
      segments.push(
        createSegment({
          runtime,
          type: 'sequence',
          title: segmentTitle,
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          subsections,
          includeInOutput: true,
        })
      );
      continue;
    }

    const parsedTitle = parseCodeFromLine(trimmed);
    if (parsedTitle.code) {
      const blockLines = consumeParagraphBlock(cursor);
      const title = blockLines[0]?.trim() || parsedTitle.title;
      segments.push(
        createSegment({
          runtime,
          type: 'referential_list',
          title,
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          code: parsedTitle.code,
          listItems: parseListLines(blockLines.slice(1)),
        })
      );
      continue;
    }

    if (/^NON-NEGOTIABLE\s+GOAL\b/i.test(trimmed)) {
      const blockLines = consumeParagraphBlock(cursor, [/^PARAMS\b/i]);
      segments.push(
        createSegment({
          runtime,
          type: 'list',
          title: blockLines[0]?.trim() || 'NON-NEGOTIABLE GOAL',
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          listItems: parseListLines(blockLines.slice(1)),
        })
      );
      continue;
    }

    if (isLikelyHeading(trimmed)) {
      const blockLines = consumeParagraphBlock(cursor);
      const raw = trimTrailingBlankLines(blockLines.join('\n'));
      const body = blockLines.slice(1);
      const hasList = body.some((value) => /^\s*(\d+[.)]|[*-]|[A-Z]\))\s+/.test(value));
      segments.push(
        createSegment({
          runtime,
          type: hasList ? 'list' : 'assigned_text',
          title: blockLines[0]?.trim() || 'Section',
          raw,
          listItems: hasList ? parseListLines(body) : [],
        })
      );
      continue;
    }

    const blockLines = consumeParagraphBlock(cursor);
    segments.push(
      createSegment({
        runtime,
        type: 'assigned_text',
        title: blockLines[0]?.trim() || 'Section',
        raw: trimTrailingBlankLines(blockLines.join('\n')),
      })
    );
  }

  return segments;
};

export function explodePromptText(args: {
  prompt: string;
  validationRules?: PromptValidationRule[] | null;
}): PromptExploderDocument {
  const prompt = normalizeMultiline(args.prompt);
  const runtime = compileRuntimePatterns(args.validationRules);
  const segments = parseSegments(prompt, runtime);
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
