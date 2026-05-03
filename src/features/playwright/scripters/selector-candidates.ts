export type SelectorElementInfo = {
  tagName: string;
  id: string | null;
  classNames: string[];
  attributes: Record<string, string>;
  textContent: string | null;
  parentTagName: string | null;
  indexAmongSiblings: number;
  siblingsOfSameTag: number;
};

export type SelectorCandidate = {
  selector: string;
  rationale: string;
  stability: 'high' | 'medium' | 'low';
};

const STABLE_DATA_ATTRS = ['data-testid', 'data-test-id', 'data-test', 'data-cy', 'data-qa'];

const ID_LIKE_RE = /^[a-zA-Z][\w-]{0,63}$/;

const escapeIdent = (value: string): string => value.replace(/(["\\])/g, '\\$1');

const escapeAttrValue = (value: string): string => `"${value.replace(/(["\\])/g, '\\$1')}"`;

const escapeClass = (value: string): string => value.replace(/([^A-Za-z0-9_-])/g, '\\$1');

const looksLikeUtilityClass = (className: string): boolean => {
  if (className.length === 0) return true;
  if (/^\d/.test(className)) return true;
  if (/^(css|sc|jsx|module)-/.test(className)) return true;
  if (/^[a-z]{1,3}-?\d/.test(className)) return true;
  return false;
};

export const buildSelectorCandidates = (info: SelectorElementInfo): SelectorCandidate[] => {
  const candidates: SelectorCandidate[] = [];
  const tag = info.tagName.toLowerCase();

  for (const attr of STABLE_DATA_ATTRS) {
    const value = info.attributes[attr];
    if (value && value.trim().length > 0) {
      candidates.push({
        selector: `[${attr}=${escapeAttrValue(value)}]`,
        rationale: `Stable test attribute "${attr}"`,
        stability: 'high',
      });
    }
  }

  if (info.id && ID_LIKE_RE.test(info.id)) {
    candidates.push({
      selector: `#${escapeIdent(info.id)}`,
      rationale: 'Element id',
      stability: 'high',
    });
  }

  const role = info.attributes['role'];
  if (role && role.trim().length > 0) {
    candidates.push({
      selector: `${tag}[role=${escapeAttrValue(role)}]`,
      rationale: 'Tag + role',
      stability: 'medium',
    });
  }

  const ariaLabel = info.attributes['aria-label'];
  if (ariaLabel && ariaLabel.trim().length > 0 && ariaLabel.length < 64) {
    candidates.push({
      selector: `${tag}[aria-label=${escapeAttrValue(ariaLabel)}]`,
      rationale: 'Tag + aria-label',
      stability: 'medium',
    });
  }

  const stableClasses = info.classNames.filter((cls) => !looksLikeUtilityClass(cls));
  if (stableClasses.length > 0) {
    const single = stableClasses[0]!;
    candidates.push({
      selector: `${tag}.${escapeClass(single)}`,
      rationale: 'Tag + first stable class',
      stability: 'medium',
    });
    if (stableClasses.length > 1) {
      candidates.push({
        selector: `${tag}.${escapeClass(stableClasses[0]!)}.${escapeClass(stableClasses[1]!)}`,
        rationale: 'Tag + two stable classes',
        stability: 'medium',
      });
    }
  }

  if (info.parentTagName) {
    const parent = info.parentTagName.toLowerCase();
    if (info.siblingsOfSameTag === 1) {
      candidates.push({
        selector: `${parent} > ${tag}`,
        rationale: 'Unique child of parent',
        stability: 'medium',
      });
    } else {
      candidates.push({
        selector: `${parent} > ${tag}:nth-of-type(${info.indexAmongSiblings + 1})`,
        rationale: 'Structural nth-of-type',
        stability: 'low',
      });
    }
  }

  if (candidates.length === 0) {
    candidates.push({ selector: tag, rationale: 'Tag only', stability: 'low' });
  }

  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.selector)) return false;
    seen.add(c.selector);
    return true;
  });
};
