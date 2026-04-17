const KANGUR_CUSTOM_CSS_ROOT = '[data-kangur-appearance]';

const NESTED_AT_RULES = new Set(['@media', '@supports', '@layer', '@container', '@scope']);

const ROOT_SELECTOR_PATTERN = /^(?:\s*)(:root|html|body)\b/i;

const getScopeSelector = (
  customSelectors: string | null | undefined,
  rootSelector: string
): string => {
  const trimmed = typeof customSelectors === 'string' ? customSelectors.trim() : '';
  if (trimmed === '') return rootSelector;
  return `${rootSelector} :is(${trimmed})`;
};

const splitSelectors = (selectorText: string): string[] => {
  const parts: string[] = [];
  const depths = { paren: 0, bracket: 0, brace: 0 };
  let inString: '\"' | '\'' | null = null;
  let current = '';

  for (let i = 0; i < selectorText.length; i += 1) {
    const char = selectorText[i] ?? '';
    const prev = selectorText[i - 1];

    if (inString !== null) {
      current += char;
      if (char === inString && prev !== '\\') inString = null;
      continue;
    }

    if (char === '\"' || char === '\'') {
      inString = char;
      current += char;
      continue;
    }

    if (char === '(') depths.paren += 1;
    if (char === ')') depths.paren = Math.max(0, depths.paren - 1);
    if (char === '[') depths.bracket += 1;
    if (char === ']') depths.bracket = Math.max(0, depths.bracket - 1);
    if (char === '{') depths.brace += 1;
    if (char === '}') depths.brace = Math.max(0, depths.brace - 1);

    if (char === ',' && depths.paren === 0 && depths.bracket === 0 && depths.brace === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (current !== '') parts.push(current);
  return parts;
};

const scopeSelector = (selector: string, scope: string, rootSelector: string): string => {
  const trimmed = selector.trim();
  if (trimmed === '') return trimmed;
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
  const scoped = parts
    .map((part) => scopeSelector(part, scope, rootSelector))
    .filter((s) => s !== '');
  return scoped.join(', ');
};

const getAtRuleName = (header: string): string | null => {
  const trimmed = header.trimStart();
  if (trimmed.startsWith('@') === false) return null;
  const match = trimmed.match(/^@[\w-]+/);
  return match !== null ? match[0].toLowerCase() : null;
};

const readHeader = (css: string, start: number): { header: string; end: number; terminator: string | null } => {
  let i = start;
  let inString: '\"' | '\'' | null = null;
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

    if (inString !== null) {
      if (char === inString && css[i - 1] !== '\\') inString = null;
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inComment = true;
      i += 2;
      continue;
    }

    if (char === '\"' || char === '\'') {
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
  let inString: '\"' | '\'' | null = null;
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

    if (inString !== null) {
      if (char === inString && css[i - 1] !== '\\') inString = null;
      i += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inComment = true;
      i += 2;
      continue;
    }

    if (char === '\"' || char === '\'') {
      inString = char;
      i += 1;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { body: css.slice(start + 1, i), end: i + 1 };
    }
    i += 1;
  }

  return { body: css.slice(start + 1), end: css.length };
};

const skipWhitespaceAndComments = (css: string, start: number): { out: string; i: number } => {
  let i = start;
  let out = '';
  while (i < css.length) {
    const char = css[i] ?? '';
    const next = css[i + 1];
    if (char === '/' && next === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) {
        out += css.slice(i);
        return { out, i: css.length };
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
  return { out, i };
};

const scopeCss = (css: string, scope: string, rootSelector: string): string => {
  let i = 0;
  let out = '';

  while (i < css.length) {
    const skip = skipWhitespaceAndComments(css, i);
    out += skip.out;
    i = skip.i;

    if (i >= css.length) break;

    const { header, end, terminator } = readHeader(css, i);
    if (terminator === ';') {
      out += `${header};`;
      i = end + 1;
      continue;
    }

    if (terminator === '{') {
      const { body, end: blockEnd } = readBlock(css, end);
      const atRuleName = getAtRuleName(header);
      if (atRuleName !== null && NESTED_AT_RULES.has(atRuleName)) {
        out += `${header}{${scopeCss(body, scope, rootSelector)}}`;
      } else if (atRuleName !== null) {
        out += `${header}{${body}}`;
      } else {
        const scopedHeader = scopeSelectorText(header, scope, rootSelector);
        out += `${scopedHeader}{${body}}`;
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
  if (trimmed === '') return null;
  const scope = getScopeSelector(customSelectors, rootSelector);
  return scopeCss(trimmed, scope, rootSelector);
};
