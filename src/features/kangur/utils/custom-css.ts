const KANGUR_CUSTOM_CSS_ROOT = '[data-kangur-appearance]';

const NESTED_AT_RULES = new Set(['@media', '@supports', '@layer', '@container', '@scope']);
const UNSCOPED_AT_RULES = new Set([
  '@keyframes',
  '@-webkit-keyframes',
  '@font-face',
  '@page',
  '@property',
  '@counter-style',
  '@font-feature-values',
  '@viewport',
]);

const ROOT_SELECTOR_PATTERN = /^(?:\s*)(:root|html|body)\b/i;

const getScopeSelector = (
  customSelectors: string | null | undefined,
  rootSelector: string
): string => {
  const trimmed = typeof customSelectors === 'string' ? customSelectors.trim() : '';
  if (!trimmed) return rootSelector;
  return `${rootSelector} :is(${trimmed})`;
};

const splitSelectors = (selectorText: string): string[] => {
  const parts: string[] = [];
  let depthParen = 0;
  let depthBracket = 0;
  let depthBrace = 0;
  let inString: '"' | '\'' | null = null;
  let current = '';

  for (let i = 0; i < selectorText.length; i += 1) {
    const char = selectorText[i] ?? '';
    const prev = selectorText[i - 1];

    if (inString) {
      current += char;
      if (char === inString && prev !== '\\') {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === '\'') {
      inString = char;
      current += char;
      continue;
    }

    if (char === '(') depthParen += 1;
    if (char === ')') depthParen = Math.max(0, depthParen - 1);
    if (char === '[') depthBracket += 1;
    if (char === ']') depthBracket = Math.max(0, depthBracket - 1);
    if (char === '{') depthBrace += 1;
    if (char === '}') depthBrace = Math.max(0, depthBrace - 1);

    if (char === ',' && depthParen === 0 && depthBracket === 0 && depthBrace === 0) {
      parts.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current) parts.push(current);
  return parts;
};

const scopeSelector = (selector: string, scope: string, rootSelector: string): string => {
  const trimmed = selector.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes(rootSelector)) return trimmed;
  if (ROOT_SELECTOR_PATTERN.test(trimmed)) {
    return trimmed.replace(ROOT_SELECTOR_PATTERN, scope);
  }
  return `${scope} ${trimmed}`;
};

const scopeSelectorText = (
  selectorText: string,
  scope: string,
  rootSelector: string
): string => {
  const parts = splitSelectors(selectorText);
  const scoped = parts.map((part) => scopeSelector(part, scope, rootSelector)).filter(Boolean);
  return scoped.join(', ');
};

const getAtRuleName = (header: string): string | null => {
  const trimmed = header.trimStart();
  if (!trimmed.startsWith('@')) return null;
  const match = trimmed.match(/^@[\w-]+/);
  return match ? match[0].toLowerCase() : null;
};

const readHeader = (css: string, start: number): { header: string; end: number; terminator: string | null } => {
  let i = start;
  let inString: '"' | '\'' | null = null;
  let inComment = false;

  while (i < css.length) {
    const char = css[i] ?? '';
    const next = css[i + 1];

    if (inComment) {
      if (char === '*' && next === '/') {
        inComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (inString) {
      if (char === inString && css[i - 1] !== '\\') {
        inString = null;
      }
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inComment = true;
      i += 2;
      continue;
    }

    if (char === '"' || char === '\'') {
      inString = char;
      i += 1;
      continue;
    }

    if (char === '{' || char === ';') {
      return { header: css.slice(start, i), end: i, terminator: char };
    }

    i += 1;
  }

  return { header: css.slice(start), end: css.length, terminator: null };
};

const readBlock = (css: string, start: number): { body: string; end: number } => {
  let i = start + 1;
  let depth = 1;
  let inString: '"' | '\'' | null = null;
  let inComment = false;

  while (i < css.length) {
    const char = css[i] ?? '';
    const next = css[i + 1];

    if (inComment) {
      if (char === '*' && next === '/') {
        inComment = false;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }

    if (inString) {
      if (char === inString && css[i - 1] !== '\\') {
        inString = null;
      }
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inComment = true;
      i += 2;
      continue;
    }

    if (char === '"' || char === '\'') {
      inString = char;
      i += 1;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return { body: css.slice(start + 1, i), end: i + 1 };
      }
    }

    i += 1;
  }

  return { body: css.slice(start + 1), end: css.length };
};

const scopeCss = (css: string, scope: string, rootSelector: string): string => {
  let i = 0;
  let out = '';

  while (i < css.length) {
    while (i < css.length) {
      const char = css[i] ?? '';
      const next = css[i + 1];
      if (char === '/' && next === '*') {
        const end = css.indexOf('*/', i + 2);
        if (end === -1) {
          out += css.slice(i);
          i = css.length;
          break;
        }
        out += css.slice(i, end + 2);
        i = end + 2;
        continue;
      }
      if (/\s/.test(char)) {
        out += char;
        i += 1;
        continue;
      }
      break;
    }

    if (i >= css.length) break;

    const { header, end, terminator } = readHeader(css, i);
    if (terminator === ';') {
      out += header + ';';
      i = end + 1;
      continue;
    }

    if (terminator === '{') {
      const { body, end: blockEnd } = readBlock(css, end);
      const atRuleName = getAtRuleName(header);
      if (atRuleName) {
        if (UNSCOPED_AT_RULES.has(atRuleName)) {
          out += header + '{' + body + '}';
        } else if (NESTED_AT_RULES.has(atRuleName)) {
          out += header + '{' + scopeCss(body, scope, rootSelector) + '}';
        } else {
          out += header + '{' + body + '}';
        }
      } else {
        const scopedHeader = scopeSelectorText(header, scope, rootSelector);
        out += scopedHeader + '{' + body + '}';
      }
      i = blockEnd;
      continue;
    }

    out += header;
    break;
  }

  return out;
};

export const resolveKangurCustomCssScopeSelector = (
  customSelectors?: string | null,
  rootSelector: string = KANGUR_CUSTOM_CSS_ROOT
): string => getScopeSelector(customSelectors, rootSelector);

export const buildKangurScopedCustomCss = (
  raw: unknown,
  customSelectors?: string | null,
  rootSelector: string = KANGUR_CUSTOM_CSS_ROOT
): string | null => {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const scope = getScopeSelector(customSelectors, rootSelector);
  return scopeCss(trimmed, scope, rootSelector);
};
