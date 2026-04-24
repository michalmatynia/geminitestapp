const STABLE_DATA_ATTRS = ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa'];
const ID_LIKE_RE = /^[a-zA-Z][\w-]{0,63}$/;

const isUtilityClass = (className: string): boolean => {
  if (className.length === 0) return true;
  if (/^\d/.test(className)) return true;
  if (/^(css|sc|jsx|module)-/.test(className)) return true;
  if (/^[a-z]{1,3}-?\d/.test(className)) return true;
  return false;
};

const escapeCssIdent = (value: string): string =>
  value.replace(/([^A-Za-z0-9_-])/g, '\\$1');

const stableClassesOf = (element: Element): string[] =>
  Array.from(element.classList).filter((cls) => !isUtilityClass(cls));

const indexAmongSameTagSiblings = (element: Element): number => {
  const parent = element.parentElement;
  if (!parent) return 0;
  let index = 0;
  for (const child of Array.from(parent.children)) {
    if (child === element) return index;
    if (child.tagName === element.tagName) index += 1;
  }
  return index;
};

const ambiguousAmongSiblings = (element: Element, segment: string): boolean => {
  const parent = element.parentElement;
  if (!parent) return false;
  try {
    return parent.querySelectorAll(`:scope > ${segment}`).length > 1;
  } catch {
    return false;
  }
};

const segmentForElement = (element: Element, includeStructural: boolean): string => {
  const tag = element.tagName.toLowerCase();
  for (const attr of STABLE_DATA_ATTRS) {
    const value = element.getAttribute(attr);
    if (value && value.trim().length > 0) {
      return `[${attr}="${value.replace(/(["\\])/g, '\\$1')}"]`;
    }
  }
  if (element.id && ID_LIKE_RE.test(element.id)) {
    return `#${escapeCssIdent(element.id)}`;
  }
  const stable = stableClassesOf(element).slice(0, 2);
  let segment: string;
  if (stable.length > 0) {
    segment = `${tag}.${stable.map(escapeCssIdent).join('.')}`;
  } else if (includeStructural && element.parentElement) {
    const sameTag = Array.from(element.parentElement.children).filter(
      (child) => child.tagName === element.tagName
    ).length;
    segment = sameTag === 1 ? tag : `${tag}:nth-of-type(${indexAmongSameTagSiblings(element) + 1})`;
  } else {
    segment = tag;
  }
  if (ambiguousAmongSiblings(element, segment)) {
    segment = `${segment}:nth-of-type(${indexAmongSameTagSiblings(element) + 1})`;
  }
  return segment;
};

export const computeSelectorForElement = (element: Element): string => {
  for (const attr of STABLE_DATA_ATTRS) {
    const value = element.getAttribute(attr);
    if (value && value.trim().length > 0) {
      return `[${attr}="${value.replace(/(["\\])/g, '\\$1')}"]`;
    }
  }
  if (element.id && ID_LIKE_RE.test(element.id)) {
    return `#${escapeCssIdent(element.id)}`;
  }
  const segments: string[] = [];
  let current: Element | null = element;
  let depth = 0;
  while (current && current.tagName.toLowerCase() !== 'html' && depth < 6) {
    segments.unshift(segmentForElement(current, true));
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    const tentative = segments.join(' > ');
    const ownerDocument = current.ownerDocument;
    if (!ownerDocument) break;
    try {
      if (ownerDocument.querySelectorAll(tentative).length === 1) return tentative;
    } catch {
      // selector not yet specific enough — keep walking up
    }
    current = parent;
    depth += 1;
  }
  return segments.join(' > ') || element.tagName.toLowerCase();
};
