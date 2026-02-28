import { DEFAULT_PATTERN_IDS } from './parser-default-patterns';
import { resolveBoundaryRegexOptional, type PatternRuntime } from './parser-runtime-patterns';
import { normalizeHeadingLabel, toLine } from './parser-text-utils';

import type { PromptExploderListItem, PromptExploderSubsection } from './types';

export type ParseCursor = {
  lines: string[];
  index: number;
};

export const isLikelyHeading = (line: string, runtime?: PatternRuntime): boolean => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^`{3,}/.test(trimmed)) return false;
  if (/^={3,}.+={3,}$/.test(trimmed)) return true;
  if (/^#{1,6}\s+\S+/.test(trimmed)) return true;
  if (/^\[[A-Z0-9 _()\-/:&+.,]{2,}]$/i.test(trimmed)) return true;
  if (/^[^|\n]+(?:\s*\|\s*[^|\n]+){2,}$/.test(trimmed)) return true;
  if (/^[*-]\s+/.test(trimmed)) return false;
  if (/^[A-Z]\)\s+/.test(trimmed)) return false;
  if (runtime?.nonHeadingRules.some((rule) => rule.regex.test(trimmed))) return false;
  if (runtime?.headingRules.some((rule) => rule.regex.test(trimmed))) return true;
  if (/^\d+[.)]\s+/.test(trimmed)) return false;
  if (/^(P\d+|RL\d+|QA(?:_R)?\d+)\b/i.test(trimmed)) return true;
  if (/^[A-Z][A-Z0-9 _()\-/:&+.,]{2,}$/.test(trimmed)) return true;
  return /^(ROLE|PARAMS|REQUIREMENTS|PIPELINE|FINAL QA)\b/i.test(trimmed);
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

export const consumeParagraphBlock = (
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

export const consumeQaBlock = (cursor: ParseCursor, runtime?: PatternRuntime): string[] => {
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

export const consumeBlockUntilBoundary = (
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

export const consumeParamsBlock = (cursor: ParseCursor, runtime?: PatternRuntime): string[] => {
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

export const parseSequenceSubsections = (args: {
  lines: string[];
  runtime?: PatternRuntime;
  createSubsectionId: () => string;
  parseListLines: (lines: string[]) => PromptExploderListItem[];
}): PromptExploderSubsection[] => {
  const subsections: PromptExploderSubsection[] = [];
  let currentTitle: string | null = null;
  let currentCode: string | null = null;
  let currentCondition: string | null = null;
  let currentGuidance: string | null = null;
  let buffer: string[] = [];
  const alphaHeadingRegex = resolveBoundaryRegexOptional(
    args.runtime,
    'segment.subsection.alpha_heading',
    DEFAULT_PATTERN_IDS['segment.subsection.alpha_heading']!
  );
  const referenceNamedRegex = resolveBoundaryRegexOptional(
    args.runtime,
    'segment.subsection.reference_named',
    DEFAULT_PATTERN_IDS['segment.subsection.reference_named']!
  );
  const referencePlainRegex = resolveBoundaryRegexOptional(
    args.runtime,
    'segment.subsection.reference_plain',
    DEFAULT_PATTERN_IDS['segment.subsection.reference_plain']!
  );
  const numericBracketRegex = resolveBoundaryRegexOptional(
    args.runtime,
    'segment.subsection.numeric_bracket_heading',
    DEFAULT_PATTERN_IDS['segment.subsection.numeric_bracket_heading']!
  );
  const bracketRegex = resolveBoundaryRegexOptional(
    args.runtime,
    'segment.subsection.bracket_heading',
    DEFAULT_PATTERN_IDS['segment.subsection.bracket_heading']!
  );
  const markdownHeadingRegex = resolveBoundaryRegexOptional(
    args.runtime,
    'segment.subsection.markdown_heading',
    DEFAULT_PATTERN_IDS['segment.subsection.markdown_heading']!
  );

  const flush = (): void => {
    if (!currentTitle && buffer.length === 0) return;
    subsections.push({
      id: args.createSubsectionId(),
      title: currentTitle ?? 'Section',
      code: currentCode,
      condition: currentCondition,
      guidance: currentGuidance,
      items: args.parseListLines(buffer),
    });
    currentTitle = null;
    currentCode = null;
    currentCondition = null;
    currentGuidance = null;
    buffer = [];
  };

  args.lines.forEach((line) => {
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
        alphaCode && alphaTitle ? `${alphaCode}) ${alphaTitle}` : normalizedHeading || trimmed;
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

export const parseQaSubsections = (args: {
  lines: string[];
  runtime?: PatternRuntime;
  createSubsectionId: () => string;
  parseListLines: (lines: string[]) => PromptExploderListItem[];
  finalQaBoundaryFallback: RegExp;
}): PromptExploderSubsection[] => {
  const subsections: PromptExploderSubsection[] = [];
  let currentTitle: string | null = null;
  let currentCode: string | null = null;
  let currentCondition: string | null = null;
  let buffer: string[] = [];
  const qaCodeRegex = resolveBoundaryRegexOptional(
    args.runtime,
    'segment.subsection.qa_code',
    DEFAULT_PATTERN_IDS['segment.subsection.qa_code']!
  );
  const finalQaBoundaryRegex = resolveBoundaryRegexOptional(
    args.runtime,
    'segment.boundary.final_qa',
    args.finalQaBoundaryFallback
  );

  const flush = (): void => {
    if (!currentTitle && !currentCode && buffer.length === 0) return;
    subsections.push({
      id: args.createSubsectionId(),
      title: currentTitle ?? currentCode ?? 'QA',
      code: currentCode,
      condition: currentCondition,
      items: args.parseListLines(buffer),
    });
    currentTitle = null;
    currentCode = null;
    currentCondition = null;
    buffer = [];
  };

  args.lines.forEach((line) => {
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
