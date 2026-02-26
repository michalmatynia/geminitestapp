import { sanitizeHtml } from '@/shared/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { DocumentEditorMode } from './types';

export type DocumentPersistenceMode = DocumentEditorMode;

export type DocumentContentCanonical = {
  mode: DocumentPersistenceMode;
  html: string;
  markdown: string;
  plainText: string;
  warnings: string[];
};

type DeriveDocumentContentInput = {
  mode: DocumentPersistenceMode;
  value: string;
  previousMarkdown?: string | null | undefined;
  previousHtml?: string | null | undefined;
};

const MAX_DOCUMENT_INPUT_CHARS = 400_000;
const MAX_PLAIN_TEXT_CHARS = 300_000;
const LINE_BREAK_TOKEN = '__CR_BR__';

const ENTITY_MAP: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
};

const decodeHtmlEntity = (value: string): string => {
  if (!value || !value.includes('&')) return value;
  
  // Fast path for common entities
  let result = value.replace(/&[a-z0-9#]+;/gi, (match) => ENTITY_MAP[match.toLowerCase()] || match);
  
  if (!result.includes('&')) return result;

  // Fallback to DOM only if there are still potential entities and we're in browser
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return result;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = result;
    return textarea.value;
  } catch {
    return result;
  }
};

const stripHtmlTagsPreserveBreaks = (value: string): string =>
  value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote|tr)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/td>\s*<td>/gi, '\t')
    .replace(/<[^>]+>/g, '');

const normalizePlainText = (value: string): string =>
  value
    .split('\n')
    .map((line: string) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const ensureContentWithinLimit = (
  value: string,
  warnings: string[]
): string => {
  if (value.length <= MAX_DOCUMENT_INPUT_CHARS) return value;
  warnings.push(
    `Content exceeded ${MAX_DOCUMENT_INPUT_CHARS.toLocaleString()} chars and was truncated.`
  );
  return value.slice(0, MAX_DOCUMENT_INPUT_CHARS);
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderInlineMarkdown = (value: string): string => {
  const escaped = escapeHtml(value);
  const withCode = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  const withStrong = withCode.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const withEm = withStrong.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  const withImages = withEm.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" />'
  );
  return withImages.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  );
};

const markdownToHtml = (value: string): string => {
  const lines = value.split(/\r?\n/);
  const htmlParts: string[] = [];
  let inList = false;
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];

  const closeList = (): void => {
    if (!inList) return;
    htmlParts.push('</ul>');
    inList = false;
  };

  const closeCodeBlock = (): void => {
    if (!inCodeBlock) return;
    const code = codeBlockBuffer.join('\n');
    htmlParts.push(`<pre><code>${escapeHtml(code)}</code></pre>`);
    codeBlockBuffer = [];
    inCodeBlock = false;
  };

  lines.forEach((line: string): void => {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      closeList();
      if (inCodeBlock) {
        closeCodeBlock();
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      return;
    }

    if (!trimmed) {
      closeList();
      return;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      closeList();
      const level = headingMatch[1]?.length ?? 1;
      const headingLevel = Math.max(1, Math.min(6, level));
      htmlParts.push(`<h${headingLevel}>${renderInlineMarkdown(headingMatch[2] ?? '')}</h${headingLevel}>`);
      return;
    }

    if (trimmed === '---') {
      closeList();
      htmlParts.push('<hr />');
      return;
    }

    if (trimmed.startsWith('> ')) {
      closeList();
      htmlParts.push(`<blockquote>${renderInlineMarkdown(trimmed.slice(2).trim())}</blockquote>`);
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      if (!inList) {
        htmlParts.push('<ul>');
        inList = true;
      }
      htmlParts.push(`<li>${renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
      return;
    }

    closeList();
    htmlParts.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  });

  closeList();
  closeCodeBlock();
  return htmlParts.join('');
};

const htmlToMarkdownFallback = (value: string): string => {
  const plain = stripHtmlToPlainText(value);
  if (!plain) return '';
  return plain
    .split('\n')
    .map((line: string) => line.trimEnd())
    .join('\n');
};

const normalizeMarkdown = (value: string): string =>
  value.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

const hasBlockTag = (value: string): boolean =>
  /<(h1|h2|h3|h4|h5|h6|p|ul|ol|li|table|pre|blockquote|hr)\b/i.test(value);

export const hasHtmlMarkup = (value: string): boolean =>
  /<\/?[a-z][^>]*>/i.test(value);

export const stripHtmlToPlainText = (html: string): string => {
  const decoded = decodeHtmlEntity(html);
  const stripped = stripHtmlTagsPreserveBreaks(decoded);
  const normalized = stripHtmlTagsPreserveBreaks(decodeHtmlEntity(stripped));
  const compact = normalizePlainText(normalized);
  if (compact.length <= MAX_PLAIN_TEXT_CHARS) return compact;
  return compact.slice(0, MAX_PLAIN_TEXT_CHARS);
};

const toParagraphHtml = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) return '';
  return `<p>${escapeHtml(normalized).replace(/\n/g, '<br/>')}</p>`;
};

const normalizeEditorMode = (mode: string | null | undefined): DocumentPersistenceMode => {
  if (mode === 'markdown' || mode === 'wysiwyg' || mode === 'code') return mode;
  return 'markdown';
};

const deriveFromMarkdown = (
  value: string,
  mode: DocumentPersistenceMode,
  warnings: string[]
): DocumentContentCanonical => {
  const normalizedMarkdown = normalizeMarkdown(value);
  const html = sanitizeHtml(markdownToHtml(normalizedMarkdown));
  const plainText = stripHtmlToPlainText(html);
  return {
    mode,
    markdown: normalizedMarkdown,
    html,
    plainText,
    warnings,
  };
};

const deriveFromHtmlSync = (
  value: string,
  mode: DocumentPersistenceMode,
  input: DeriveDocumentContentInput,
  warnings: string[]
): DocumentContentCanonical => {
  const sanitizedHtml = sanitizeHtml(value);
  const plainText = stripHtmlToPlainText(sanitizedHtml);
  const markdown =
    typeof input.previousMarkdown === 'string' && input.previousMarkdown.trim().length > 0
      ? normalizeMarkdown(input.previousMarkdown)
      : htmlToMarkdownFallback(sanitizedHtml);
  if (!hasBlockTag(sanitizedHtml) && sanitizedHtml.trim().length > 0) {
    warnings.push('HTML had limited structure; markdown fallback may be lossy.');
  }
  return {
    mode,
    html: sanitizedHtml,
    markdown,
    plainText,
    warnings,
  };
};

export const deriveDocumentContentSync = (
  input: DeriveDocumentContentInput
): DocumentContentCanonical => {
  const mode = normalizeEditorMode(input.mode);
  const warnings: string[] = [];
  const normalizedValue = ensureContentWithinLimit(input.value ?? '', warnings);

  if (mode === 'markdown' || mode === 'code') {
    return deriveFromMarkdown(normalizedValue, mode, warnings);
  }

  return deriveFromHtmlSync(normalizedValue, mode, input, warnings);
};

export const convertHtmlToMarkdown = async (
  html: string
): Promise<{ markdown: string; warnings: string[] }> => {
  const warnings: string[] = [];
  const sanitizedHtml = sanitizeHtml(html);
  try {
    const TurndownService = (await import('turndown')).default;
    const service = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
    return {
      markdown: normalizeMarkdown(service.turndown(sanitizedHtml)),
      warnings,
    };
  } catch (error) {
    warnings.push('Could not fully convert HTML to Markdown; fallback to plain text.');
    logClientError(error, {
      context: {
        source: 'document-editor.content-format.convertHtmlToMarkdown',
      },
    });
    return {
      markdown: htmlToMarkdownFallback(sanitizedHtml),
      warnings,
    };
  }
};

export const deriveDocumentContent = async (
  input: DeriveDocumentContentInput
): Promise<DocumentContentCanonical> => {
  const mode = normalizeEditorMode(input.mode);
  const warnings: string[] = [];
  const normalizedValue = ensureContentWithinLimit(input.value ?? '', warnings);

  if (mode === 'markdown' || mode === 'code') {
    return deriveFromMarkdown(normalizedValue, mode, warnings);
  }

  const sanitizedHtml = sanitizeHtml(normalizedValue);
  const plainText = stripHtmlToPlainText(sanitizedHtml);
  const conversion = await convertHtmlToMarkdown(sanitizedHtml);
  return {
    mode,
    html: sanitizedHtml,
    markdown: conversion.markdown,
    plainText,
    warnings: [...warnings, ...conversion.warnings],
  };
};

export const normalizeRawDocumentModeFromContent = (
  input: {
    mode?: string | null | undefined;
    rawContent?: string | null | undefined;
    rawMarkdown?: string | null | undefined;
    rawHtml?: string | null | undefined;
  }
): DocumentPersistenceMode => {
  const fromMode = normalizeEditorMode(input.mode);
  if (input.mode === 'markdown' || input.mode === 'wysiwyg' || input.mode === 'code') {
    return fromMode;
  }

  const rawHtml = typeof input.rawHtml === 'string' ? input.rawHtml : '';
  if (hasHtmlMarkup(rawHtml)) return 'wysiwyg';

  const rawMarkdown = typeof input.rawMarkdown === 'string' ? input.rawMarkdown : '';
  if (rawMarkdown.trim().length > 0) return 'markdown';

  const rawContent = typeof input.rawContent === 'string' ? input.rawContent : '';
  if (hasHtmlMarkup(rawContent)) return 'wysiwyg';
  if (rawContent.trim().length > 0) return 'markdown';
  return 'markdown';
};

export const toStorageDocumentValue = (
  canonical: DocumentContentCanonical
): string => (canonical.mode === 'wysiwyg' ? canonical.html : canonical.markdown);

export const restoreDisplayValueForMode = (
  canonical: DocumentContentCanonical,
  mode: DocumentPersistenceMode
): string => (mode === 'wysiwyg' ? canonical.html : canonical.markdown);

export const ensureHtmlForPreview = (value: string, mode: DocumentPersistenceMode): string => {
  if (!value.trim()) return '';
  if (mode === 'wysiwyg') {
    return sanitizeHtml(value);
  }
  return sanitizeHtml(markdownToHtml(normalizeMarkdown(value)));
};

export const ensureSafeDocumentHtml = (value: string): string => {
  if (!value.trim()) return '';
  if (hasHtmlMarkup(value)) return sanitizeHtml(value);
  return toParagraphHtml(value);
};

export const withPreservedLineBreaks = (value: string): string =>
  value.replace(/\n/g, LINE_BREAK_TOKEN);

export const restorePreservedLineBreaks = (value: string): string =>
  value.replace(new RegExp(LINE_BREAK_TOKEN, 'g'), '\n');
