export const MAX_KANGUR_SOCIAL_VISUAL_SUMMARY_CHARS = 1200;

const NON_VISUAL_HIGHLIGHT_PATTERN =
  /\b(linkedin post|documentation update|doc update|release note|blog post|communication narrative|internal documentation|support email|future update)\b/i;

const NON_VISUAL_SECTION_BREAK_PATTERNS = [
  /\bpotential documentation(?:\/communication)? narrative\b/i,
  /\bpotential communication narrative\b/i,
  /\bhere(?:'s| is) a draft you could use\b/i,
  /^subject:\s*/im,
  /^what'?s new:\s*/im,
  /^how to experience the changes:\s*/im,
  /^feedback:\s*/im,
  /\bkey takeaways for future updates\b/i,
  /\blet me know if you'?d like me to\b/i,
] as const;

const truncateText = (value: string, maxChars: number): string =>
  value.length <= maxChars ? value : value.slice(0, maxChars).trimEnd();

export const sanitizeKangurSocialVisualSummary = (value: string | null | undefined): string => {
  let sanitized = (value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\*\*/g, '')
    .trim();

  for (const pattern of NON_VISUAL_SECTION_BREAK_PATTERNS) {
    const match = pattern.exec(sanitized);
    if (typeof match?.index === 'number' && match.index >= 0) {
      sanitized = sanitized.slice(0, match.index).trim();
      break;
    }
  }

  const firstParagraph = sanitized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .find((paragraph) => paragraph.length > 0);

  sanitized = (firstParagraph ?? sanitized)
    .replace(/\s+/g, ' ')
    .replace(
      /^(?:okay[,! ]*|sure[,! ]*|i(?:'ve| have) reviewed the provided (?:text and )?images\.?\s*)+/i,
      ''
    )
    .replace(
      /^here(?:'s| is) (?:a )?(?:summary|concise summary|visual summary)(?: of (?:the )?(?:key )?(?:information|changes))?[:.\s-]*/i,
      ''
    )
    .trim();

  return truncateText(sanitized, MAX_KANGUR_SOCIAL_VISUAL_SUMMARY_CHARS);
};

export const sanitizeKangurSocialVisualHighlights = (
  value: string[] | null | undefined
): string[] =>
  (value ?? [])
    .map((item) => item.trim().replace(/^[-*•]\s*/, ''))
    .filter((item) => item.length > 0)
    .filter((item) => !NON_VISUAL_HIGHLIGHT_PATTERN.test(item))
    .slice(0, 24);

export const normalizeKangurSocialVisualAnalysis = ({
  summary,
  highlights,
}: {
  summary?: string | null;
  highlights?: string[] | null;
}): { summary: string; highlights: string[] } => ({
  summary: sanitizeKangurSocialVisualSummary(summary),
  highlights: sanitizeKangurSocialVisualHighlights(highlights),
});
