const DANGEROUS_PAIRED_TAGS = ['script', 'style', 'noscript', 'iframe', 'object', 'embed'];
const DANGEROUS_VOID_TAGS = ['link', 'meta'];

const buildPairedRemovalRegex = (tag: string): RegExp =>
  new RegExp(`<\\s*${tag}\\b[\\s\\S]*?<\\s*/\\s*${tag}\\s*>`, 'gi');
const ON_ATTR_RE = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_HREF_RE = /(href|src|action|formaction)\s*=\s*("[\s]*javascript:[^"]*"|'[\s]*javascript:[^']*')/gi;
const SRCDOC_ATTR_RE = /\ssrcdoc\s*=\s*("[^"]*"|'[^']*')/gi;

export type SanitizeOptions = {
  baseUrl?: string;
  rebasePaths?: boolean;
};

const ABSOLUTE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|mailto:|tel:|data:)/i;

const rebaseAttribute = (
  html: string,
  attribute: 'href' | 'src',
  baseUrl: string
): string => {
  const re = new RegExp(`\\s${attribute}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'gi');
  return html.replace(re, (match, _quoted, dQuoted, sQuoted) => {
    const value = (dQuoted ?? sQuoted ?? '').trim();
    if (value.length === 0) return ` ${attribute}="#"`;
    if (ABSOLUTE_RE.test(value)) {
      return ` ${attribute}="${value.replace(/(["])/g, '&quot;')}"`;
    }
    try {
      const resolved = new URL(value, baseUrl).toString();
      return ` ${attribute}="${resolved.replace(/(["])/g, '&quot;')}"`;
    } catch {
      return ` ${attribute}="#"`;
    }
  });
};

export const sanitizeHtmlForProbe = (html: string, options: SanitizeOptions = {}): string => {
  let cleaned = html;
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of DANGEROUS_PAIRED_TAGS) {
    cleaned = cleaned.replace(buildPairedRemovalRegex(tag), '');
  }
  const allDangerous = [...DANGEROUS_PAIRED_TAGS, ...DANGEROUS_VOID_TAGS].join('|');
  cleaned = cleaned.replace(new RegExp(`<\\s*/?\\s*(${allDangerous})\\b[^>]*>`, 'gi'), '');
  cleaned = cleaned.replace(ON_ATTR_RE, '');
  cleaned = cleaned.replace(JAVASCRIPT_HREF_RE, '$1="#"');
  cleaned = cleaned.replace(SRCDOC_ATTR_RE, '');
  if (options.baseUrl && options.rebasePaths !== false) {
    cleaned = rebaseAttribute(cleaned, 'href', options.baseUrl);
    cleaned = rebaseAttribute(cleaned, 'src', options.baseUrl);
  }
  cleaned = cleaned.replace(/<a\s/gi, '<a target="_blank" rel="noopener noreferrer nofollow" ');
  cleaned = cleaned.replace(
    /<form\b/gi,
    '<form onsubmit="return false" '
  );
  return cleaned;
};
