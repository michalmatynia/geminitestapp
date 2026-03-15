import { logClientError } from '@/shared/utils/observability/client-error-logger';
/**
 * Autoformat markdown content:
 * - Trim leading/trailing whitespace
 * - Normalize multiple blank lines to single blank line
 * - Convert bare URLs to markdown links
 * - Normalize list markers
 * - Clean up excessive spaces within lines
 */
export const autoformatMarkdown = (text: string): string => {
  let result = text;

  // Trim leading and trailing whitespace
  result = result.trim();

  // Normalize line endings to \n
  result = result.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Replace 3+ consecutive blank lines with 2 (one blank line)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Clean up excessive spaces within lines efficiently
  // Handle trailing spaces first
  result = result.replace(/[ \t]+\n/g, '\n');
  // Handle multiple spaces within lines but preserve indentation
  // This regex matches spaces that are NOT at the start of a line
  result = result.replace(/([^ \n\t])[ \t]{2,}/g, '$1 ');

  // Convert bare URLs to markdown links (but not if already in markdown format)
  // Match URLs that are not already in [text](url) or <url> format
  const urlRegex = new RegExp('(?<![([])(https?://[^\\s<>\\[\\]]+)(?![)\\]])', 'g');
  result = result.replace(urlRegex, (url: string) => {
    // Try to extract a readable title from the URL
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1] || urlObj.hostname;

      // Clean up the title (remove file extensions, decode URI components)
      const title =
        decodeURIComponent(lastPart)
          .replace(/\.[^.]+$/, '') // Remove file extension
          .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
          .trim() || urlObj.hostname;

      return `[${title}](${url})`;
    } catch (error) {
      logClientError(error);
      return `[link](${url})`;
    }
  });

  // Normalize bullet list markers (convert * and + to -)
  result = result.replace(/^(\s*)[*+]\s+/gm, '$1- ');

  // Ensure proper spacing after list markers
  result = result.replace(/^(\s*)-(?!\s)/gm, '$1- ');

  // Normalize numbered list format (ensure period after number)
  result = result.replace(/^(\s*)(\d+)[.)]\s*/gm, '$1$2. ');

  return result;
};
