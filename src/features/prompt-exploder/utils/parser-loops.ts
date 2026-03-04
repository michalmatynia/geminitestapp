/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { extractParamsFromPrompt } from '@/shared/utils/prompt-params';
import {
  matchesBoundaryHeading,
  resolveBoundaryRegex,
  testPattern,
  type PatternRuntime,
  type RuntimeRegexRule,
  collectMatchedRules,
} from '../parser-runtime-patterns';
import {
  consumeBlockUntilBoundary,
  consumeParagraphBlock,
  consumeParamsBlock,
  consumeQaBlock,
  isLikelyHeading,
  parseQaSubsections,
  parseSequenceSubsections,
  type ParseCursor,
} from '../parser-section-parsing';
import { normalizeHeadingLabel, parseCodeFromLine, toLine } from '../parser-text-utils';
import {
  shouldKeepEmptyTitleForCaseResolver,
  inferTypeFromRuleSequence,
} from '../parser-type-inference';
import { trimTrailingBlankLines } from './parser-utils';
import { createPromptExploderSegment } from '../parser-segment-factory';
import { PromptExploderSegment } from '../types';

export type LoopParserArgs = {
  runtime: PatternRuntime;
  segmentId: () => string;
  subsectionId: () => string;
  parseListLinesWithRuntimeIds: (lines: string[]) => any[];
  BRACKET_SECTION_HEADING_RE: RegExp;
  STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE: RegExp;
  REQUIREMENTS_BOUNDARY_FALLBACK_RE: RegExp;
  PIPELINE_BOUNDARY_FALLBACK_RE: RegExp;
  FINAL_QA_BOUNDARY_FALLBACK_RE: RegExp;
};

export function selectHeadingRuleForLine(
  runtime: PatternRuntime,
  line: string
): RuntimeRegexRule | null {
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
}

export function createRuleDrivenSegment(args: {
  runtime: PatternRuntime;
  blockLines: string[];
  headingLine: string | null;
  headingRule: RuntimeRegexRule | null;
  segmentId: () => string;
  subsectionId: () => string;
  parseListLinesWithRuntimeIds: (lines: string[]) => any[];
  FINAL_QA_BOUNDARY_FALLBACK_RE: RegExp;
}): PromptExploderSegment {
  const {
    runtime,
    blockLines,
    headingLine,
    headingRule,
    segmentId,
    subsectionId,
    parseListLinesWithRuntimeIds,
    FINAL_QA_BOUNDARY_FALLBACK_RE,
  } = args;

  const raw = trimTrailingBlankLines(blockLines.join('\n'));
  const headingTitle = normalizeHeadingLabel(headingLine ?? '');
  const parsedTitle = parseCodeFromLine(headingTitle || (headingLine ?? '').trim());
  const title =
    parsedTitle.title || headingTitle || normalizeHeadingLabel(blockLines[0] ?? '') || 'Section';
  const matchedRules = collectMatchedRules(runtime, raw);
  const matchedRuleIds = matchedRules.map((rule) => rule.id);
  const keepEmptyTitle = shouldKeepEmptyTitleForCaseResolver(
    matchedRuleIds,
    title || headingTitle || raw
  );
  const fallbackType = headingRule?.segmentTypeHint ?? 'assigned_text';
  const type = inferTypeFromRuleSequence(matchedRules, fallbackType);
  const contentLines = headingLine ? blockLines.slice(1) : blockLines;
  const contentRaw = trimTrailingBlankLines(contentLines.join('\n'));
  const hasBodyContent = contentRaw.trim().length > 0;

  const createSegment = (opts: any): PromptExploderSegment =>
    createPromptExploderSegment({ ...opts, createSegmentId: segmentId });

  if (type === 'metadata') {
    return createSegment({
      runtime,
      type,
      lockType: true,
      title,
      raw,
      includeInOutput: false,
    });
  }

  if (type === 'parameter_block') {
    return createSegment({
      runtime,
      type,
      lockType: true,
      title,
      raw,
      paramsText: raw,
    });
  }

  if (type === 'sequence') {
    return createSegment({
      runtime,
      type,
      lockType: true,
      title,
      raw,
      subsections: parseSequenceSubsections({
        lines: contentLines,
        runtime,
        createSubsectionId: subsectionId,
        parseListLines: parseListLinesWithRuntimeIds,
      }),
    });
  }

  if (type === 'qa_matrix') {
    return createSegment({
      runtime,
      type,
      lockType: true,
      title,
      raw,
      listItems: parseListLinesWithRuntimeIds(contentLines),
      subsections: parseQaSubsections({
        lines: contentLines,
        runtime,
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
      runtime,
      type,
      lockType: true,
      title,
      raw,
      code: type === 'referential_list' ? parsedTitle.code : null,
      listItems: parseListLinesWithRuntimeIds(contentLines),
    });
  }

  return createSegment({
    runtime,
    type,
    lockType: true,
    title,
    raw: headingLine && !keepEmptyTitle && hasBodyContent ? contentRaw : raw,
  });
}

export function parseSegmentsRuleDriven(
  prompt: string,
  runtime: PatternRuntime,
  args: LoopParserArgs
): PromptExploderSegment[] {
  const { segmentId, subsectionId, parseListLinesWithRuntimeIds, FINAL_QA_BOUNDARY_FALLBACK_RE } =
    args;
  const lines = prompt.replace(/\r\n/g, '\n').split('\n');
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
            segmentId,
            subsectionId,
            parseListLinesWithRuntimeIds,
            FINAL_QA_BOUNDARY_FALLBACK_RE,
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
          segmentId,
          subsectionId,
          parseListLinesWithRuntimeIds,
          FINAL_QA_BOUNDARY_FALLBACK_RE,
        })
      );
    }
  }

  return segments;
}

export function parseSegmentsLoop(
  prompt: string,
  runtime: PatternRuntime,
  args: LoopParserArgs
): PromptExploderSegment[] {
  const {
    segmentId,
    subsectionId,
    parseListLinesWithRuntimeIds,
    BRACKET_SECTION_HEADING_RE,
    STUDIO_RELIGHTING_BOUNDARY_FALLBACK_RE,
    REQUIREMENTS_BOUNDARY_FALLBACK_RE,
    PIPELINE_BOUNDARY_FALLBACK_RE,
    FINAL_QA_BOUNDARY_FALLBACK_RE,
  } = args;

  const lines = prompt.replace(/\r\n/g, '\n').split('\n');
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

  const createSegment = (opts: any): PromptExploderSegment =>
    createPromptExploderSegment({ ...opts, createSegmentId: segmentId });

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

    cursor.index += 1;
  }

  return segments;
}
