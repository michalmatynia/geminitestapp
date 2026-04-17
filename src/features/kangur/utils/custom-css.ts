const KANGUR_CUSTOM_CSS_ROOT = '[data-kangur-appearance]';

const NESTED_AT_RULES = new Set(['@media', '@supports', '@layer', '@container', '@scope']);

const ROOT_SELECTOR_PATTERN = /^(?:\s*)(:root|html|body)\b/i;

const getScopeSelector = (
  customSelectors: string | null | undefined,
  rootSelector: string
): string => {
  const t = typeof customSelectors === 'string' ? customSelectors.trim() : '';
  if (t === '') return rootSelector;
  return `${rootSelector} :is(${t})`;
};

const handleCommentToken = (
  css: string,
  i: number,
  inC: boolean
): { nextI: number; nextC: boolean; handled: boolean } => {
  const c = css[i] ?? '';
  const n = css[i + 1];
  if (inC) {
    if (c === '*' && n === '/') return { nextI: i + 2, nextC: false, handled: true };
    return { nextI: i + 1, nextC: true, handled: true };
  }
  if (c === '/' && n === '*') return { nextI: i + 2, nextC: true, handled: true };
  return { nextI: i, nextC: false, handled: false };
};

const handleStringToken = (
  css: string,
  i: number,
  inS: '\x22' | '\x27' | null
): { nextI: number; nextS: '\x22' | '\x27' | null; handled: boolean } => {
  const c = css[i] ?? '';
  if (inS !== null) {
    const nS = (c === inS && css[i - 1] !== '\\') ? null : inS;
    return { nextI: i + 1, nextS: nS, handled: true };
  }
  if (c === '\x22' || c === '\x27') {
    return { nextI: i + 1, nextS: c, handled: true };
  }
  return { nextI: i, nextS: null, handled: false };
};

const readHeader = (css: string, start: number): { header: string; end: number; terminator: string | null } => {
  let i = start;
  let inS: '\x22' | '\x27' | null = null;
  let inC = false;

  while (i < css.length) {
    const c = handleCommentToken(css, i, inC);
    if (c.handled) {
      i = c.nextI;
      inC = c.nextC;
      continue;
    }
    const s = handleStringToken(css, i, inS);
    if (s.handled) {
      i = s.nextI;
      inS = s.nextS;
      continue;
    }
    const char = css[i] ?? '';
    if (char === '{' || char === ';') return { header: css.slice(start, i), end: i, terminator: char };
    i += 1;
  }
  return { header: css.slice(start), end: css.length, terminator: null };
};

const readBlock = (css: string, start: number): { body: string; end: number } => {
  let i = start + 1;
  let d = 1;
  let inS: '\x22' | '\x27' | null = null;
  let inC = false;

  while (i < css.length) {
    const c = handleCommentToken(css, i, inC);
    if (c.handled) {
      i = c.nextI;
      inC = c.nextC;
      continue;
    }
    const s = handleStringToken(css, i, inS);
    if (s.handled) {
      i = s.nextI;
      inS = s.nextS;
      continue;
    }
    const char = css[i] ?? '';
    if (char === '{') d += 1;
    else if (char === '}') {
      d -= 1;
      if (d === 0) return { body: css.slice(start + 1, i), end: i + 1 };
    }
    i += 1;
  }
  return { body: css.slice(start + 1), end: css.length };
};

const updateDepth = (char: string, depth: number): number => {
  if (char === '(' || char === '[' || char === '{') return depth + 1;
  if (char === ')' || char === ']' || char === '}') return Math.max(0, depth - 1);
  return depth;
};

class SelectorSplitter {
  parts: string[] = [];
  inS: '\x22' | '\x27' | null = null;
  cur = '';
  dP = 0;
  dB = 0;
  dS = 0;

  split(text: string): string[] {
    for (let i = 0; i < text.length; i += 1) {
      this.processChar(text[i] ?? '', text[i - 1]);
    }
    if (this.cur !== '') this.parts.push(this.cur);
    return this.parts;
  }

  processChar(c: string, p: string | undefined): void {
    if (this.inS !== null) {
      this.handleInS(c, p);
    } else if (this.isS(c)) {
      this.inS = c as '\x22' | '\x27';
      this.cur += c;
    } else if (this.isD(c)) {
      this.handleD(c);
    } else {
      this.handleO(c);
    }
  }

  isS(c: string): boolean {
    return c === '\x22' || c === '\x27';
  }

  isD(c: string): boolean {
    return c === '(' || c === ')' || c === '[' || c === ']' || c === '{' || c === '}';
  }

  handleInS(c: string, p: string | undefined): void {
    this.cur += c;
    if (c === this.inS && p !== '\\') this.inS = null;
  }

  handleD(c: string): void {
    if (c === '(' || c === ')') this.dP = updateDepth(c, this.dP);
    else if (c === '[' || c === ']') this.dB = updateDepth(c, this.dB);
    else this.dS = updateDepth(c, this.dS);
    this.cur += c;
  }

  handleO(c: string): void {
    if (c === ',' && this.dP === 0 && this.dB === 0 && this.dS === 0) {
      this.parts.push(this.cur);
      this.cur = '';
    } else {
      this.cur += c;
    }
  }
}

const splitSelectors = (selectorText: string): string[] => {
  const splitter = new SelectorSplitter();
  return splitter.split(selectorText);
};

const processBlock = (
  header: string,
  body: string,
  scope: string,
  rootSelector: string
): string => {
  const atRuleName = getAtRuleName(header);
  if (atRuleName !== null && NESTED_AT_RULES.has(atRuleName)) {
    return `${header}{${scopeCss(body, scope, rootSelector)}}`;
  }
  if (atRuleName !== null) {
    return `${header}{${body}}`;
  }
  const scopedHeader = scopeSelectorText(header, scope, rootSelector);
  return `${scopedHeader}{${body}}`;
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
    if (terminator === ';') { out += `${header};`; i = end + 1; continue; }
    if (terminator === '{') {
      const { body, end: blockEnd } = readBlock(css, end);
      out += processBlock(header, body, scope, rootSelector);
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
  const t = raw.trim();
  if (t === '') return null;
  const scope = getScopeSelector(customSelectors, rootSelector);
  return scopeCss(t, scope, rootSelector);
};

const scopeSelector = (selector: string, scope: string, rootSelector: string): string => {
  const t = selector.trim();
  if (t === '' || t.includes(rootSelector)) return t;
  if (ROOT_SELECTOR_PATTERN.test(t)) {
    return t.replace(ROOT_SELECTOR_PATTERN, scope);
  }
  return `${scope} ${t}`;
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
  const t = header.trimStart();
  if (t.startsWith('@') === false) return null;
  const match = t.match(/^@[\w-]+/);
  return match !== null ? match[0].toLowerCase() : null;
};

const skipWhitespaceAndComments = (css: string, start: number): { out: string; i: number } => {
  let i = start;
  let out = '';
  while (i < css.length) {
    const c = css[i] ?? '';
    const n = css[i + 1];
    if (c === '/' && n === '*') {
      const e = css.indexOf('*/', i + 2);
      if (e === -1) {
        out += css.slice(i);
        return { out, i: css.length };
      }
      out += css.slice(i, e + 2);
      i = e + 2;
      continue;
    }
    if (/\s/.test(c)) {
      out += c;
      i += 1;
      continue;
    }
    break;
  }
  return { out, i };
};
