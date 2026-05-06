import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const decodeBasicHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&apos;|&#39;/gi, '\'')
    .replace(/&quot;/gi, '"')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&');

export const decodeHtmlEntity = (value: string): string => {
  const basicDecoded = decodeBasicHtmlEntities(value);
  try {
    if (typeof window === 'undefined') return basicDecoded;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = basicDecoded;
    return decodeBasicHtmlEntities(textarea.value);
  } catch (error) {
    logClientError(error);
    return basicDecoded;
  }
};

export const stripHtmlTagsPreserveBreaks = (value: string): string =>
  value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/?[a-z][^>]*>/gi, '');

export const stripHtml = (html: string): string => {
  const decoded = decodeHtmlEntity(html);
  const stripped = stripHtmlTagsPreserveBreaks(decoded);
  const normalized = stripHtmlTagsPreserveBreaks(decodeHtmlEntity(stripped));
  return normalized
    .split('\n')
    .map((line: string) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
