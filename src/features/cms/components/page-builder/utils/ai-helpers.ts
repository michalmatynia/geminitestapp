import { logClientError } from '@/shared/utils/observability/client-error-logger';
/**
 * Utility functions for AI generation in the CMS inspector.
 */

const extractFencedCodeBlock = (raw: string, language?: string): string | null => {
  const languagePattern = language ? `(?:${language})?` : '(?:[a-z]+)?';
  const fenceMatch = raw.match(new RegExp(String.raw`^\`\`\`${languagePattern}\s*([\s\S]*?)\`\`\`$`, 'i'));
  return fenceMatch?.[1]?.trim() ?? null;
};

const stripMarkdownCodeFences = (raw: string): string => raw.replace(/```/g, '').trim();

const trimAiResponse = (raw: string): string => raw.trim();

const resolveCodeBlockContent = (raw: string, language: string): string | null =>
  extractFencedCodeBlock(raw, language) ?? stripMarkdownCodeFences(raw);

const extractJsonCandidateText = (raw: string): string =>
  extractFencedCodeBlock(raw, 'json') ?? raw;

const resolveJsonObjectText = (candidate: string): string => {
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  return first >= 0 && last > first ? candidate.slice(first, last + 1) : candidate;
};

const parseJsonObjectText = (jsonText: string): Record<string, unknown> | null => {
  const parsed = JSON.parse(jsonText) as unknown;
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
};

const pushDiffLine = (
  lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }>,
  type: 'add' | 'remove' | 'same',
  text: string | undefined
): void => {
  if (text !== undefined) {
    lines.push({ type, text });
  }
};

const appendDiffLinePair = (args: {
  lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }>;
  prevLine: string | undefined;
  nextLine: string | undefined;
}): void => {
  if (args.prevLine === args.nextLine) {
    pushDiffLine(args.lines, 'same', args.prevLine);
    return;
  }

  pushDiffLine(args.lines, 'remove', args.prevLine);
  pushDiffLine(args.lines, 'add', args.nextLine);
};

export function extractCssFromResponse(raw: string): string {
  const trimmed = trimAiResponse(raw);
  if (!trimmed) return '';

  return resolveCodeBlockContent(trimmed, 'css') ?? '';
}

export function extractJsonFromResponse(raw: string): Record<string, unknown> | null {
  const trimmed = trimAiResponse(raw);
  if (!trimmed) return null;
  try {
    return parseJsonObjectText(resolveJsonObjectText(extractJsonCandidateText(trimmed)));
  } catch (error) {
    logClientError(error);
    return null;
  }
}

export function buildDiffLines(
  prev: string,
  next: string,
  limit: number = 220
): { lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }>; truncated: boolean } {
  const prevLines = prev.split('\n');
  const nextLines = next.split('\n');
  const max = Math.max(prevLines.length, nextLines.length);
  const lines: Array<{ type: 'add' | 'remove' | 'same'; text: string }> = [];
  let truncated = false;
  for (let index = 0; index < max; index += 1) {
    appendDiffLinePair({ lines, prevLine: prevLines[index], nextLine: nextLines[index] });
    if (lines.length >= limit) {
      truncated = true;
      break;
    }
  }
  return { lines, truncated };
}
