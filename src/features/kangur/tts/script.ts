import type {
  KangurLessonDocument,
  KangurLessonGridBlock,
  KangurLessonInlineBlock,
  KangurLessonRootBlock,
} from '@/shared/contracts/kangur';
import { stripHtmlToPlainText } from '@/features/document-editor/content-format';

import type { KangurLessonNarrationScript, KangurLessonNarrationSegment } from './contracts';
import { KANGUR_TTS_DEFAULT_LOCALE } from './contracts';

const DEFAULT_SEGMENT_MAX_CHARS = 900;
const DEFAULT_MAX_SEGMENTS = 24;

const normalizeWhitespace = (value: string): string =>
  (() => {
    const normalizedLines = value
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trim());

    const compactLines: string[] = [];
    let previousWasBlank = false;

    for (const line of normalizedLines) {
      if (!line) {
        if (!previousWasBlank && compactLines.length > 0) {
          compactLines.push('');
        }
        previousWasBlank = true;
        continue;
      }

      compactLines.push(line);
      previousWasBlank = false;
    }

    return compactLines.join('\n').trim();
  })();

const dedupeAdjacentParts = (parts: string[]): string[] => {
  const next: string[] = [];
  let lastNormalized = '';
  for (const part of parts) {
    const normalized = normalizeWhitespace(part);
    if (!normalized) continue;
    if (normalized.toLowerCase() === lastNormalized.toLowerCase()) {
      continue;
    }
    next.push(normalized);
    lastNormalized = normalized;
  }
  return next;
};

const splitByWords = (value: string, maxChars: number): string[] => {
  const words = normalizeWhitespace(value).split(' ');
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    if (!word) continue;
    if (!current) {
      current = word;
      continue;
    }
    const candidate = `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    chunks.push(current);
    current = word;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
};

const splitOversizedPart = (value: string, maxChars: number): string[] => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const sentenceChunks = normalized
    .split(/(?<=[.!?])\s+/)
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean);
  if (sentenceChunks.length <= 1) {
    return splitByWords(normalized, maxChars);
  }

  const next: string[] = [];
  let current = '';

  for (const sentence of sentenceChunks) {
    if (sentence.length > maxChars) {
      if (current) {
        next.push(current);
        current = '';
      }
      next.push(...splitByWords(sentence, maxChars));
      continue;
    }

    if (!current) {
      current = sentence;
      continue;
    }

    const candidate = `${current} ${sentence}`;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    next.push(current);
    current = sentence;
  }

  if (current) {
    next.push(current);
  }

  return next;
};

const toNarrationSegments = (
  lessonId: string,
  parts: string[],
  maxChars: number = DEFAULT_SEGMENT_MAX_CHARS,
  maxSegments: number = DEFAULT_MAX_SEGMENTS
): KangurLessonNarrationSegment[] => {
  const normalizedParts = dedupeAdjacentParts(parts);
  const segments: KangurLessonNarrationSegment[] = [];
  let current = '';

  const flush = (): void => {
    const text = normalizeWhitespace(current);
    if (!text) return;
    segments.push({
      id: `${lessonId}-segment-${segments.length + 1}`,
      text,
    });
    current = '';
  };

  for (const part of normalizedParts) {
    for (const fragment of splitOversizedPart(part, maxChars)) {
      if (!fragment) continue;
      if (!current) {
        current = fragment;
        continue;
      }

      const candidate = `${current}\n\n${fragment}`;
      if (candidate.length <= maxChars) {
        current = candidate;
        continue;
      }

      flush();
      current = fragment;
      if (segments.length >= maxSegments) {
        break;
      }
    }

    if (segments.length >= maxSegments) {
      break;
    }
  }

  if (segments.length < maxSegments) {
    flush();
  }

  return segments.slice(0, maxSegments);
};

const collectInlineBlockParts = (block: KangurLessonInlineBlock): string[] => {
  if (block.type === 'svg') {
    const description = block.ttsDescription?.trim();
    if (description) {
      return [description];
    }

    return block.title ? [`Ilustracja. ${block.title}.`] : [];
  }

  const plainText = block.ttsText?.trim() || stripHtmlToPlainText(block.html);
  return plainText ? [plainText] : [];
};

const collectGridBlockParts = (block: KangurLessonGridBlock): string[] =>
  block.items.flatMap((item) => collectInlineBlockParts(item.block));

const collectRootBlockParts = (block: KangurLessonRootBlock): string[] => {
  if (block.type === 'grid') {
    return collectGridBlockParts(block);
  }
  return collectInlineBlockParts(block);
};

const collectDocumentParts = (document: KangurLessonDocument): string[] =>
  document.blocks.flatMap((block) => collectRootBlockParts(block));

export const buildKangurLessonNarrationScriptFromText = (input: {
  lessonId: string;
  title: string;
  description?: string | null;
  text: string;
  locale?: string | null;
}): KangurLessonNarrationScript => {
  const normalizedText = normalizeWhitespace(input.text);
  const parts = [
    input.title,
    input.description ?? '',
    normalizedText,
  ].filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);

  const segments = toNarrationSegments(input.lessonId, parts);
  return {
    lessonId: input.lessonId,
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    locale: input.locale?.trim() || KANGUR_TTS_DEFAULT_LOCALE,
    segments,
  };
};

export const buildKangurLessonDocumentNarrationScript = (input: {
  lessonId: string;
  title: string;
  description?: string | null;
  document: KangurLessonDocument;
  locale?: string | null;
}): KangurLessonNarrationScript => {
  const parts = [input.title, input.description ?? '', ...collectDocumentParts(input.document)];
  const segments = toNarrationSegments(input.lessonId, parts);
  return {
    lessonId: input.lessonId,
    title: input.title.trim(),
    description: (input.description ?? '').trim(),
    locale: input.locale?.trim() || KANGUR_TTS_DEFAULT_LOCALE,
    segments,
  };
};

export const hasKangurLessonNarrationContent = (
  script: Pick<KangurLessonNarrationScript, 'segments'> | null | undefined
): boolean =>
  Boolean(script?.segments.some((segment) => normalizeWhitespace(segment.text).length > 0));

export const normalizeKangurLessonNarrationText = normalizeWhitespace;
