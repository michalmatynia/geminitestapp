export const extractTraderaCategoryPageChildren = ({
  currentCategory,
  stopTexts,
  blockedUrlHints,
  blockedTextHints,
}: {
  currentCategory: {
    id: string;
    name: string;
    ancestorIds?: string[];
  };
  stopTexts: string[];
  blockedUrlHints: string[];
  blockedTextHints: string[];
}): {
  blocked: boolean;
  children: Array<{
    id: string;
    name: string;
    parentId: string;
    url: string;
  }>;
} => {
  const toText = (value: unknown): string =>
    typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

  const toLowerText = (value: unknown): string => toText(value).toLowerCase();

  const includesStopText = (value: unknown, stopSet: Set<string>): boolean => {
    const text = toLowerText(value);
    if (!text) return false;
    for (const stopText of stopSet) {
      if (text === stopText || text.includes(stopText)) {
        return true;
      }
    }
    return false;
  };

  const normalizeCategoryId = (candidate: unknown): string => {
    if (candidate == null) return '';
    const normalized = toText(String(candidate));
    if (!normalized) return '';
    const match = normalized.match(/\/category\/(\d+)(?:[/?#]|$)/i);
    if (match?.[1]) return match[1];
    const digits = normalized.match(/\b(\d{2,})\b/);
    return digits?.[1] ?? normalized;
  };

  const resolveCategoryUrl = (href: string, baseUrl: string): string | null => {
    try {
      const url = new URL(href, baseUrl);
      if (!/\/category\/\d+/i.test(url.pathname)) return null;
      url.hash = '';
      return url.toString();
    } catch {
      return null;
    }
  };

  const isStopNode = (node: Node | null, stopSet: Set<string>): boolean => {
    if (node?.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node as Element;
    const text = toLowerText(element.textContent ?? '');
    if (!text || !includesStopText(text, stopSet)) return false;
    const tag = element.tagName?.toLowerCase() ?? '';
    return (
      tag === 'button' ||
      tag === 'label' ||
      tag === 'h1' ||
      tag === 'h2' ||
      tag === 'h3' ||
      tag === 'h4' ||
      tag === 'span' ||
      tag === 'div' ||
      tag === 'p' ||
      element.getAttribute('role') === 'button'
    );
  };

  const getAbsoluteTop = (element: Element | null): number | null => {
    if (!element || typeof element.getBoundingClientRect !== 'function') return null;
    const rect = element.getBoundingClientRect();
    if (!Number.isFinite(rect.top)) return null;
    const scrollY =
      typeof window.scrollY === 'number'
        ? window.scrollY
        : typeof window.pageYOffset === 'number'
          ? window.pageYOffset
          : 0;
    return rect.top + scrollY;
  };

  const isLikelyVisible = (element: Element | null): boolean => {
    if (!element || typeof element.getBoundingClientRect !== 'function') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0;
  };

  const isHeadingElement = (element: Element | null): boolean => {
    if (!element) return false;
    const tag = (element.tagName || '').toLowerCase();
    return tag === 'h1' || tag === 'h2' || tag === 'h3' || element.getAttribute('role') === 'heading';
  };

  const findCategoryStartMarker = ({
    main,
    normalizedCurrentName,
  }: {
    main: Element;
    normalizedCurrentName: string;
  }): Element | null => {
    const candidates = Array.from(
      main.querySelectorAll('h1, h2, h3, [role="heading"], div, p, span, li, strong')
    );

    const exactMatches: Array<{ element: Element; top: number }> = [];
    const fuzzyHeadingMatches: Array<{ element: Element; top: number }> = [];
    const headingMatches: Array<{ element: Element; top: number }> = [];

    for (const candidate of candidates) {
      const text = toLowerText(candidate.textContent || '');
      const top = getAbsoluteTop(candidate);
      if (!text || top === null || !isLikelyVisible(candidate)) {
        continue;
      }

      if (text === normalizedCurrentName) {
        exactMatches.push({ element: candidate, top });
      }

      if (isHeadingElement(candidate) && text.includes(normalizedCurrentName)) {
        fuzzyHeadingMatches.push({ element: candidate, top });
      }

      if (isHeadingElement(candidate)) {
        headingMatches.push({ element: candidate, top });
      }
    }

    exactMatches.sort((a, b) => a.top - b.top);
    fuzzyHeadingMatches.sort((a, b) => a.top - b.top);
    headingMatches.sort((a, b) => a.top - b.top);

    return (
      exactMatches[0]?.element ??
      fuzzyHeadingMatches[0]?.element ??
      headingMatches[0]?.element ??
      null
    );
  };

  const collectChildrenByVisualBand = ({
    main,
    startMarker,
    stopSet,
    normalizedCurrentName,
    ancestorIds,
  }: {
    main: Element;
    startMarker: Element | null;
    stopSet: Set<string>;
    normalizedCurrentName: string;
    ancestorIds: Set<string>;
  }): Array<{ id: string; name: string; parentId: string; url: string }> => {
    if (!startMarker) return [];

    const startTop = getAbsoluteTop(startMarker);
    if (startTop === null) return [];

    let stopTop = Number.POSITIVE_INFINITY;
    const stopCandidates = Array.from(
      main.querySelectorAll('button, label, h1, h2, h3, h4, span, div, p, [role="button"]')
    );

    for (const candidate of stopCandidates) {
      if (!isStopNode(candidate, stopSet)) continue;
      const top = getAbsoluteTop(candidate);
      if (top === null || top <= startTop + 8) continue;
      stopTop = Math.min(stopTop, top);
    }

    const maxCandidateTop = Number.isFinite(stopTop) ? stopTop + 80 : startTop + 1200;
    const children: Array<{ id: string; name: string; parentId: string; url: string }> = [];
    const seenIds = new Set<string>();

    const anchors = Array.from(main.querySelectorAll('a[href*="/category/"]'));
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href') || '';
      const url = resolveCategoryUrl(href, window.location.href);
      const id = normalizeCategoryId(url);
      const name = toText(anchor.textContent || '');
      const anchorTop = getAbsoluteTop(anchor);

      if (
        !url ||
        !id ||
        !name ||
        anchorTop === null ||
        anchorTop < startTop - 16 ||
        anchorTop > maxCandidateTop ||
        ancestorIds.has(id) ||
        id === currentCategory.id ||
        toLowerText(name) === normalizedCurrentName ||
        seenIds.has(id)
      ) {
        continue;
      }

      seenIds.add(id);
      children.push({ id, name, parentId: currentCategory.id, url });
    }

    return children;
  };

  const baseUrl = window.location.href;
  const normalizedUrl = toLowerText(baseUrl);
  if (blockedUrlHints.some((hint) => normalizedUrl.includes(hint))) {
    return { blocked: true, children: [] };
  }

  const main = document.querySelector('main') || document.body;
  if (!main) return { blocked: false, children: [] };

  const mainText = toLowerText(main.textContent || '').slice(0, 4000);
  const hasCategoryLinks = Boolean(main.querySelector('a[href*="/category/"]'));
  if (!hasCategoryLinks && mainText && blockedTextHints.some((hint) => mainText.includes(hint))) {
    return { blocked: true, children: [] };
  }

  const stopSet = new Set(stopTexts.map((s) => toLowerText(s)));
  const normalizedCurrentName = toLowerText(currentCategory.name);
  const ancestorIds = new Set([currentCategory.id, ...(currentCategory.ancestorIds || [])]);
  const startMarker = findCategoryStartMarker({
    main,
    normalizedCurrentName,
  });

  const childrenByVisualBand = collectChildrenByVisualBand({
    main,
    startMarker,
    stopSet,
    normalizedCurrentName,
    ancestorIds,
  });
  if (childrenByVisualBand.length > 0) {
    return {
      blocked: false,
      children: childrenByVisualBand,
    };
  }

  const children: Array<{ id: string; name: string; parentId: string; url: string }> = [];
  const seenIds = new Set<string>();
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT);
  let collecting = startMarker === null;
  let node: Node | null = walker.currentNode;

  while (node) {
    if (!collecting) {
      if (node === startMarker) collecting = true;
      node = walker.nextNode();
      continue;
    }

    if (node !== startMarker && isStopNode(node, stopSet)) break;

    const element = node as Element;
    if ((element.tagName || '').toLowerCase() === 'a') {
      const href = element.getAttribute('href') || '';
      const url = resolveCategoryUrl(href, baseUrl);
      const id = normalizeCategoryId(url);
      const name = toText(element.textContent || '');

      if (
        url &&
        id &&
        name &&
        !ancestorIds.has(id) &&
        id !== currentCategory.id &&
        toLowerText(name) !== normalizedCurrentName &&
        !seenIds.has(id)
      ) {
        seenIds.add(id);
        children.push({ id, name, parentId: currentCategory.id, url });
      }
    }

    node = walker.nextNode();
  }

  return { blocked: false, children };
};
