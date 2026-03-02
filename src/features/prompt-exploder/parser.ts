import { extractParamsFromPrompt } from '@/shared/utils/prompt-params';
import type { PromptValidationRule } from '@/shared/contracts/prompt-engine';

import { buildPromptExploderBindings } from './parser-bindings';
import { collectReferencedParamsFromItems, parseListLines } from './parser-list-items';
import {
  collectMatchedRules,
  matchesBoundaryHeading,
  normalizeRuntimeValidationScope,
  resolveBoundaryRegex,
  resolveRuntimePatterns,
  testPattern,
} from './parser-runtime-patterns';
import {
  consumeBlockUntilBoundary,
  consumeParagraphBlock,
  consumeParamsBlock,
  consumeQaBlock,
  isLikelyHeading,
  parseQaSubsections,
  parseSequenceSubsections,
  type ParseCursor,
} from './parser-section-parsing';
import { createPromptExploderSegment, renderPromptExploderSegment } from './parser-segment-factory';
import { normalizeHeadingLabel, parseCodeFromLine, toLine } from './parser-text-utils';
import {
  inferTypeFromLearnedTemplates,
  inferTypeFromRuleSequence,
  shouldKeepEmptyTitleForCaseResolver,
} from './parser-type-inference';

import type { PatternRuntime, RuntimeRegexRule } from './parser-runtime-patterns';
import type {
  PromptExploderBinding,
  PromptExploderDocument,
  PromptExploderLearnedTemplate,
  PromptExploderListItem,
  PromptExploderSegment,
} from './types';
import type { PromptExploderRuntimeValidationScope } from './validation-stack';

export {
  getPromptExploderRuntimePatternCacheSnapshot,
  invalidatePromptExploderRuntimePatternCacheByRuntime,
  prewarmPromptExploderRuntimePatterns,
  resetPromptExploderRuntimePatternCache,
} from './parser-runtime-patterns';

const BRACKET_SECTION_HEADING_RE = /^\s*\[[A-Z0-9 _()\-/:&+.,]{2,}]$/i;
const STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE =
  /^(===\s*STUDIO\s+RELIGHTING|STUDIO\s+RELIGHTING\b)/i;
const REQUIREMENTS_BOUNDARY_FALLBACK_RE = /^(REQUIREMENTS|COMPOSITING\s+REQUIREMENTS)\b/i;
const PIPELINE_BOUNDARY_FALLBACK_RE = /^(PIPELINE|WORKFLOW|PROCESS|EXECUTION\s+TEMPLATE)\b/i;
const FINAL_QA_BOUNDARY_FALLBACK_RE = /^FINAL\s+QA\b/i;

type IdFactory = {
  next: () => string;
  reset: () => void;
};

const createIdFactory = (prefix: string): IdFactory => {
  let count = 0;
  return {
    next: (): string => {
      count += 1;
      return `${prefix}_${count.toString(36)}`;
    },
    reset: (): void => {
      count = 0;
    },
  };
};

const listItemIdFactory = createIdFactory('item');
const logicalConditionIdFactory = createIdFactory('condition');
const segmentIdFactory = createIdFactory('segment');
const subsectionIdFactory = createIdFactory('subsection');
const bindingIdFactory = createIdFactory('binding');

const listItemId = (): string => listItemIdFactory.next();
const logicalConditionId = (): string => logicalConditionIdFactory.next();
const segmentId = (): string => segmentIdFactory.next();
const subsectionId = (): string => subsectionIdFactory.next();
const bindingId = (): string => bindingIdFactory.next();
const parseListLinesWithRuntimeIds = (lines: string[]): PromptExploderListItem[] =>
  parseListLines({
    lines,
    createListItemId: listItemId,
    createLogicalConditionId: logicalConditionId,
  });

const resetParserRuntimeIds = (): void => {
  listItemIdFactory.reset();
  logicalConditionIdFactory.reset();
  segmentIdFactory.reset();
  subsectionIdFactory.reset();
  bindingIdFactory.reset();
};

const trimTrailingBlankLines = (value: string): string =>
  value.replace(/\n{3,}$/g, '\n\n').trimEnd();

const normalizeMultiline = (value: string): string => value.replace(/\r\n/g, '\n');

const containsLikelyHtmlMarkup = (value: string): boolean => /<\/?[a-z][^>]*>/i.test(value);

const decodeHtmlEntities = (value: string): string => {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: '\'',
    nbsp: ' ',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (full, entity): string => {
    const normalized = String(entity ?? '')
      .trim()
      .toLowerCase();
    if (!normalized) return full;
    if (normalized.startsWith('#x')) {
      const code = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    if (normalized.startsWith('#')) {
      const code = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : full;
    }
    return named[normalized] ?? full;
  });
};

const normalizePromptSource = (value: string): string => {
  const normalized = normalizeMultiline(value ?? '');
  if (!containsLikelyHtmlMarkup(normalized)) {
    return normalized;
  }

  const plain = normalized
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote|section|article|tr|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '* ')
    .replace(/<[^>]+>/g, '');

  const decoded = decodeHtmlEntities(plain)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return decoded.trim();
};

const CASE_RESOLVER_LABEL_ONLY_SEGMENT_IDS = new Set<string>([
  'segment.case_resolver.heading.addresser_label',
  'segment.case_resolver.heading.addressee_label',
]);
const CASE_RESOLVER_LABEL_ONLY_LINE_RE =
  /^\s*(?:from|od|nadawca|sender|addresser|wnioskodawca|to|do|adresat|recipient|addressee|odbiorca|organ)\s*:\s*$/iu;

const mergeCaseResolverLabeledPartySegments = (
  segments: PromptExploderSegment[]
): PromptExploderSegment[] => {
  if (segments.length === 0) return segments;

  const mergedSegments: PromptExploderSegment[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    const current = segments[index];
    if (!current) continue;
    const currentRaw = (current.raw || current.text || '').trim();
    const isLabelOnlySegment =
      currentRaw.length > 0 &&
      CASE_RESOLVER_LABEL_ONLY_LINE_RE.test(currentRaw) &&
      current.matchedPatternIds.some((patternId: string): boolean =>
        CASE_RESOLVER_LABEL_ONLY_SEGMENT_IDS.has(patternId)
      );

    if (!isLabelOnlySegment) {
      mergedSegments.push(current);
      continue;
    }

    const next = segments[index + 1];
    if (!next) {
      mergedSegments.push(current);
      continue;
    }

    const nextRaw = next.raw || next.text || '';
    if (!nextRaw.trim()) {
      mergedSegments.push(current);
      continue;
    }

    mergedSegments.push({
      ...next,
      title: '',
      raw: `${currentRaw}\n${nextRaw}`.trim(),
      text: `${currentRaw}\n${nextRaw}`.trim(),
      matchedPatternIds: [...new Set([...(current.matchedPatternIds ?? []), ...next.matchedPatternIds])],
      matchedPatternLabels: [
        ...new Set([...(current.matchedPatternLabels ?? []), ...(next.matchedPatternLabels ?? [])]),
      ],
      matchedSequenceLabels: [
        ...new Set([
          ...(current.matchedSequenceLabels ?? []),
          ...(next.matchedSequenceLabels ?? []),
        ]),
      ],
      confidence: Math.max(current.confidence ?? 0, next.confidence ?? 0),
    });
    index += 1;
  }

  return mergedSegments;
};

const createSegment = (
  args: Omit<Parameters<typeof createPromptExploderSegment>[0], 'createSegmentId'>
): PromptExploderSegment =>
  createPromptExploderSegment({
    ...args,
    createSegmentId: segmentId,
  });

const renderSegment = (segment: PromptExploderSegment): string =>
  renderPromptExploderSegment(segment);

const buildBindings = (
  segments: PromptExploderSegment[],
  manualBindings: PromptExploderBinding[] = []
): PromptExploderBinding[] => {
  return buildPromptExploderBindings({
    segments,
    manualBindings,
    renderSegment,
    createBindingId: bindingId,
    collectReferencedParamsFromItems,
  });
};

const selectHeadingRuleForLine = (
  runtime: PatternRuntime,
  line: string
): RuntimeRegexRule | null => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Let explicit non-heading guard rules veto heading classification.
  if (runtime.nonHeadingRules.some((rule) => rule.regex.test(trimmed))) return null;
  const matches = runtime.headingRules.filter((rule) => rule.regex.test(trimmed));
  if (matches.length === 0) return null;
  matches.sort((left, right) => {
    if (left.sequence !== right.sequence) return left.sequence - right.sequence;
    if (right.priority !== left.priority) return right.priority - left.priority;
    if (right.confidenceBoost !== left.confidenceBoost) {
      return right.confidenceBoost - left.confidenceBoost;
    }
    return left.id.localeCompare(right.id);
  });
  return matches[0] ?? null;
};

const createRuleDrivenSegment = (args: {
  runtime: PatternRuntime;
  blockLines: string[];
  headingLine: string | null;
  headingRule: RuntimeRegexRule | null;
}): PromptExploderSegment => {
  const raw = trimTrailingBlankLines(args.blockLines.join('\n'));
  const headingTitle = normalizeHeadingLabel(args.headingLine ?? '');
  const parsedTitle = parseCodeFromLine(headingTitle || (args.headingLine ?? '').trim());
  const title =
    parsedTitle.title ||
    headingTitle ||
    normalizeHeadingLabel(args.blockLines[0] ?? '') ||
    'Section';
  const matchedRules = collectMatchedRules(args.runtime, raw);
  const matchedRuleIds = matchedRules.map((rule) => rule.id);
  const keepEmptyTitle = shouldKeepEmptyTitleForCaseResolver(
    matchedRuleIds,
    title || headingTitle || raw
  );
  const fallbackType = args.headingRule?.segmentTypeHint ?? 'assigned_text';
  const type = inferTypeFromRuleSequence(matchedRules, fallbackType);
  const contentLines = args.headingLine ? args.blockLines.slice(1) : args.blockLines;
  const contentRaw = trimTrailingBlankLines(contentLines.join('\n'));
  const hasBodyContent = contentRaw.trim().length > 0;

  if (type === 'metadata') {
    return createSegment({
      runtime: args.runtime,
      type,
      lockType: true,
      title,
      raw,
      includeInOutput: false,
    });
  }

  if (type === 'parameter_block') {
    return createSegment({
      runtime: args.runtime,
      type,
      lockType: true,
      title,
      raw,
      paramsText: raw,
    });
  }

  if (type === 'sequence') {
    return createSegment({
      runtime: args.runtime,
      type,
      lockType: true,
      title,
      raw,
      subsections: parseSequenceSubsections({
        lines: contentLines,
        runtime: args.runtime,
        createSubsectionId: subsectionId,
        parseListLines: parseListLinesWithRuntimeIds,
      }),
    });
  }

  if (type === 'qa_matrix') {
    return createSegment({
      runtime: args.runtime,
      type,
      lockType: true,
      title,
      raw,
      listItems: parseListLinesWithRuntimeIds(contentLines),
      subsections: parseQaSubsections({
        lines: contentLines,
        runtime: args.runtime,
        createSubsectionId: subsectionId,
        parseListLines: parseListLinesWithRuntimeIds,
        finalQaBoundaryFallback: FINAL_QA_BOUNDARY_FALLBACK_RE,
      }),
    });
  }

  if (
    type === 'list' ||
    type === 'referential_list' ||
    type === 'hierarchical_list' ||
    type === 'conditional_list'
  ) {
    return createSegment({
      runtime: args.runtime,
      type,
      lockType: true,
      title,
      raw,
      code: type === 'referential_list' ? parsedTitle.code : null,
      listItems: parseListLinesWithRuntimeIds(contentLines),
    });
  }

  return createSegment({
    runtime: args.runtime,
    type,
    lockType: true,
    title,
    raw: args.headingLine && !keepEmptyTitle && hasBodyContent ? contentRaw : raw,
  });
};

const parseSegmentsRuleDriven = (
  prompt: string,
  runtime: PatternRuntime
): PromptExploderSegment[] => {
  const lines = normalizeMultiline(prompt).split('\n');
  const headingRuleByIndex = new Map<number, RuntimeRegexRule>();

  lines.forEach((line, index) => {
    const rule = selectHeadingRuleForLine(runtime, line);
    if (rule) {
      headingRuleByIndex.set(index, rule);
    }
  });

  const segments: PromptExploderSegment[] = [];
  let index = 0;

  while (index < lines.length) {
    while (index < lines.length && toLine(lines[index]).trim().length === 0) {
      index += 1;
    }
    if (index >= lines.length) break;

    const headingRule = headingRuleByIndex.get(index) ?? null;
    const start = index;

    if (headingRule) {
      index += 1;
      while (index < lines.length) {
        const trimmed = toLine(lines[index]).trim();
        if (!trimmed) {
          index += 1;
          continue;
        }
        if (headingRuleByIndex.has(index)) break;
        index += 1;
      }
      const blockLines = lines.slice(start, index);
      if (blockLines.length > 0) {
        segments.push(
          createRuleDrivenSegment({
            runtime,
            blockLines,
            headingLine: toLine(lines[start]),
            headingRule,
          })
        );
      }
      continue;
    }

    index += 1;
    while (index < lines.length) {
      const trimmed = toLine(lines[index]).trim();
      if (!trimmed) {
        let next = index + 1;
        while (next < lines.length && toLine(lines[next]).trim().length === 0) {
          next += 1;
        }
        index = next;
        break;
      }
      if (headingRuleByIndex.has(index)) break;
      index += 1;
    }

    const blockLines = lines.slice(start, index);
    if (blockLines.length > 0) {
      segments.push(
        createRuleDrivenSegment({
          runtime,
          blockLines,
          headingLine: null,
          headingRule: null,
        })
      );
    }
  }

  return segments;
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
      const blockLines = consumeBlockUntilBoundary(cursor, [pipelineBoundary, finalQaBoundary]);
      const segmentTitle = blockLines[0]?.trim() || 'STUDIO RELIGHTING EXTENSION';
      const bodyLines = blockLines.slice(1);
      const firstBodyLine = bodyLines.find((line) => line.trim().length > 0) ?? '';
      const hasSectionRuleLine = /^RELIGHTING\s+RULES\b/i.test(
        normalizeHeadingLabel(firstBodyLine)
      );
      const sectionRuleCondition = hasSectionRuleLine ? normalizeHeadingLabel(firstBodyLine) : null;
      const subsectionLines = hasSectionRuleLine
        ? bodyLines.slice(bodyLines.indexOf(firstBodyLine) + 1)
        : bodyLines;
      const subsections = parseSequenceSubsections({
        lines: subsectionLines,
        runtime,
        createSubsectionId: subsectionId,
        parseListLines: parseListLinesWithRuntimeIds,
      });
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
      const blockLines = consumeBlockUntilBoundary(cursor, [BRACKET_SECTION_HEADING_RE, /^END\b/i]);
      const body = blockLines.slice(1);
      segments.push(
        createSegment({
          runtime,
          type: 'qa_matrix',
          lockType: true,
          title: normalizeHeadingLabel(blockLines[0] ?? '') || 'VALIDATION_MODULE',
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          listItems: parseListLinesWithRuntimeIds(body),
          subsections: parseQaSubsections({
            lines: body,
            runtime,
            createSubsectionId: subsectionId,
            parseListLines: parseListLinesWithRuntimeIds,
            finalQaBoundaryFallback: FINAL_QA_BOUNDARY_FALLBACK_RE,
          }),
          condition: /\bfix\s+until\b/i.test(blockLines.join('\n')) ? 'fix_until_all_pass' : null,
        })
      );
      continue;
    }

    if (/^DRY[_\s]RUN[_\s]BEHAVIOR\b/i.test(normalizedHeading)) {
      const blockLines = consumeBlockUntilBoundary(cursor, [BRACKET_SECTION_HEADING_RE, /^END\b/i]);
      const body = blockLines.slice(1);
      segments.push(
        createSegment({
          runtime,
          type: 'conditional_list',
          lockType: true,
          title: normalizeHeadingLabel(blockLines[0] ?? '') || 'DRY_RUN_BEHAVIOR',
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          listItems: parseListLinesWithRuntimeIds(body),
          condition: /\bDRY[_\s]RUN\b/i.test(blockLines.join('\n')) ? 'dry_run_branching' : null,
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
      const subsections = parseSequenceSubsections({
        lines: body,
        runtime,
        createSubsectionId: subsectionId,
        parseListLines: parseListLinesWithRuntimeIds,
      });
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
          listItems: parseListLinesWithRuntimeIds(body),
          condition: body.some((value) => /\bif\b|\bonly if\b/i.test(value)) ? 'conditional' : null,
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
          listItems: parseListLinesWithRuntimeIds(body),
          subsections: parseQaSubsections({
            lines: body,
            runtime,
            createSubsectionId: subsectionId,
            parseListLines: parseListLinesWithRuntimeIds,
            finalQaBoundaryFallback: FINAL_QA_BOUNDARY_FALLBACK_RE,
          }),
          condition: /\bfix\s+until\b/i.test(blockLines.join('\n')) ? 'fix_until_all_pass' : null,
        })
      );
      continue;
    }

    const parsedTitle = parseCodeFromLine(normalizedHeading);
    if (parsedTitle.code) {
      const blockLines = consumeParagraphBlock(cursor, [], runtime);
      const title = normalizeHeadingLabel(blockLines[0] ?? '') || parsedTitle.title;
      segments.push(
        createSegment({
          runtime,
          type: 'referential_list',
          lockType: true,
          title,
          raw: trimTrailingBlankLines(blockLines.join('\n')),
          code: parsedTitle.code,
          listItems: parseListLinesWithRuntimeIds(blockLines.slice(1)),
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
          listItems: parseListLinesWithRuntimeIds(blockLines.slice(1)),
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
          listItems: hasList ? parseListLinesWithRuntimeIds(body) : [],
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
    const inferred = inferTypeFromLearnedTemplates(segment, templates, similarityThreshold);
    if (!inferred.matchedTemplateId && inferred.type === segment.type) {
      return segment;
    }
    const nextPatternLabels = inferred.matchedTemplateId
      ? [
        ...new Set([
          ...(segment.matchedPatternLabels ?? []),
          `Learned Template: ${inferred.type.replaceAll('_', ' ')}`,
        ]),
      ]
      : (segment.matchedPatternLabels ?? []);
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
      matchedPatternLabels: nextPatternLabels,
      matchedSequenceLabels: segment.matchedSequenceLabels ?? [],
    };
  });
};

export function explodePromptText(args: {
  prompt: string;
  validationRules?: PromptValidationRule[] | null;
  learnedTemplates?: PromptExploderLearnedTemplate[] | null;
  similarityThreshold?: number;
  validationScope?: PromptExploderRuntimeValidationScope | null;
  runtimeCacheKey?: string | null;
  correlationId?: string | null;
}): PromptExploderDocument {
  resetParserRuntimeIds();
  const prompt = normalizePromptSource(args.prompt);
  const validationScope = normalizeRuntimeValidationScope(args.validationScope);
  const runtime = resolveRuntimePatterns(args.validationRules, validationScope, {
    runtimeCacheKey: args.runtimeCacheKey,
    correlationId: args.correlationId,
  });
  const parsedSegments =
    validationScope === 'case_resolver_prompt_exploder'
      ? parseSegmentsRuleDriven(prompt, runtime)
      : parseSegments(prompt, runtime);
  const postProcessedSegments =
    validationScope === 'case_resolver_prompt_exploder'
      ? mergeCaseResolverLabeledPartySegments(parsedSegments)
      : parsedSegments;
  const segments = applyLearnedTemplateTypes(
    postProcessedSegments,
    args.learnedTemplates ?? [],
    Math.min(0.95, Math.max(0.3, args.similarityThreshold ?? 0.68))
  );
  const bindings = buildBindings(segments);
  const warnings: string[] = [];

  if (segments.length === 0) {
    warnings.push('No segments were detected.');
  }

  if (validationScope === 'prompt_exploder') {
    if (!segments.some((segment) => segment.type === 'parameter_block')) {
      warnings.push('No PARAMS block was detected.');
    }

    if (!segments.some((segment) => segment.type === 'qa_matrix')) {
      warnings.push('No FINAL QA matrix was detected.');
    }
  }

  const reassembledPrompt = reassemblePromptSegments(segments);

  return {
    version: 1,
    sourcePrompt: prompt,
    segments,
    bindings,
    warnings,
    reassembledPrompt,
    sections: [],
    subsections: [],
    variables: [],
    dependencies: [],
    rules: [],
    tags: [],
    errors: [],
    diagnostics: [],
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
  const hasSameSegmentsReference = segments === document.segments;
  const bindings = buildBindings(segments, manualBindings);
  const warnings = [...(document.warnings ?? [])];
  const reassembledPrompt = hasSameSegmentsReference
    ? document.reassembledPrompt
    : reassemblePromptSegments(segments);

  return {
    ...document,
    segments,
    bindings,
    reassembledPrompt,
    warnings,
  };
}

export function ensureSegmentTitle(segment: PromptExploderSegment): PromptExploderSegment {
  if (
    shouldKeepEmptyTitleForCaseResolver(
      segment.matchedPatternIds ?? [],
      segment.title || segment.raw || segment.text || ''
    )
  ) {
    if (!segment.title || segment.title.length === 0) return segment;
    return {
      ...segment,
      title: '',
    };
  }
  if (segment.title && segment.title.trim().length > 0) return segment;
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
