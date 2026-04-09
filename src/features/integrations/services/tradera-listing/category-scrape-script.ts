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
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    const element = node as Element;
    const text = toLowerText(element.textContent || '');
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
  const hasCategoryLinks = !!main.querySelector('a[href*="/category/"]');
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

export const DEFAULT_TRADERA_CATEGORY_SCRAPE_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
  artifacts,
  log,
}) {
  const DEFAULT_CATEGORIES_URL = 'https://www.tradera.com/en/categories';
  const ROOT_SECTION_SUFFIXES = ['show more', 'visa fler'];
  const STOP_TEXTS = ['all filters', 'alla filter', 'newest', 'senaste', 'sort by', 'sortera'];
  const BLOCKED_URL_HINTS = ['/login', '/captcha', '/challenge', '/verification', '/verify'];
  const BLOCKED_TEXT_HINTS = [
    'log in',
    'login',
    'sign in',
    'captcha',
    'verification',
    'security check',
    'two-factor',
    'two factor',
    '2fa',
  ];
  const configuredCategoriesUrl =
    typeof input?.traderaConfig?.categoriesUrl === 'string' &&
    input.traderaConfig.categoriesUrl.trim()
      ? input.traderaConfig.categoriesUrl.trim()
      : DEFAULT_CATEGORIES_URL;

  const MAX_PAGES = 600;
  const MAX_CATEGORIES = 5000;
  const TOTAL_BUDGET_MS = 270_000;
  const NAV_TIMEOUT_MS = 15_000;
  const SETTLE_DELAY_MS = 1200;

  const wait = async (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, Math.trunc(ms)));
    });

  const captureDebugArtifacts = async (label, state) => {
    if (!artifacts) return;
    if (typeof artifacts.json === 'function') {
      await artifacts.json(label + '-state', state).catch(() => undefined);
    }
    if (typeof artifacts.screenshot === 'function') {
      await artifacts.screenshot(label).catch(() => undefined);
    }
    if (typeof artifacts.html === 'function') {
      await artifacts.html(label).catch(() => undefined);
    }
  };

  const COOKIE_ACCEPT_SELECTORS = [
    '#onetrust-accept-btn-handler',
    'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept all")',
    'button:has-text("Acceptera alla cookies")',
    'button:has-text("Acceptera alla kakor")',
    'button:has-text("Godkänn alla cookies")',
    'button:has-text("Tillåt alla cookies")',
  ];

  const acceptCookiesIfPresent = async () => {
    for (const selector of COOKIE_ACCEPT_SELECTORS) {
      const locator = page.locator(selector).first();
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;
      await locator.click().catch(() => undefined);
      await wait(600);
      return true;
    }
    return false;
  };

  // --- Navigate to the categories page and wait for CSR to render ---
  await page.goto(configuredCategoriesUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await wait(1500);
  await acceptCookiesIfPresent();

  // --- Phase 1: extract root categories + immediate children from the rendered seed page ---
  const seedData = await page.evaluate(
    ({ rootSectionSuffixes, stopTexts, blockedUrlHints, blockedTextHints }) => {
      const toText = (value) =>
        typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

      const toLowerText = (value) => toText(value).toLowerCase();

      const normalizeCategoryId = (candidate) => {
        if (candidate == null) return '';
        const normalized = toText(String(candidate));
        if (!normalized) return '';
        const match = normalized.match(/\/category\/(\d+)(?:[/?#]|$)/i);
        if (match && match[1]) return match[1];
        const digits = normalized.match(/\b(\d{2,})\b/);
        return digits && digits[1] ? digits[1] : normalized;
      };

      const resolveCategoryUrl = (href, baseUrl) => {
        try {
          const url = new URL(href, baseUrl);
          if (!/\/category\/\d+/i.test(url.pathname)) return null;
          url.hash = '';
          return url.toString();
        } catch {
          return null;
        }
      };

      const cleanRootSectionName = (value) => {
        let name = toText(value);
        for (const suffix of rootSectionSuffixes) {
          const escaped = suffix.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
          name = name.replace(new RegExp('\\s*' + escaped + '\\s*$', 'i'), '').trim();
        }
        return name;
      };

      const baseUrl = window.location.href;
      const pageTitle = document.title;

      // Blocked page detection — check URL for login/captcha redirects
      const normalizedUrl = toLowerText(baseUrl);
      if (blockedUrlHints.some((hint) => normalizedUrl.includes(hint))) {
        return {
          blocked: true,
          categories: [],
          rootCategories: [],
          diagnostics: { seedUrl: baseUrl, seedFinalUrl: baseUrl, seedStatus: 0, seedTitle: pageTitle },
        };
      }
      // Check main content area only (not nav header which normally contains "Log in" links)
      const mainContent = document.querySelector('main') || document.querySelector('#site-main');
      const mainText = toLowerText(mainContent?.textContent ?? '').slice(0, 4000);
      const hasCategoryLinks = !!document.querySelector('a[href*="/category/"]');
      if (!hasCategoryLinks && mainText && blockedTextHints.some((hint) => mainText.includes(hint))) {
        return {
          blocked: true,
          categories: [],
          rootCategories: [],
          diagnostics: { seedUrl: baseUrl, seedFinalUrl: baseUrl, seedStatus: 0, seedTitle: pageTitle },
        };
      }

      // Extract root categories (anchors whose text ends with "show more" / "visa fler")
      const allAnchors = Array.from(document.querySelectorAll('a[href*="/category/"]'));
      const rootSuffixLower = rootSectionSuffixes.map((s) => s.toLowerCase());
      const rootCategories = [];
      const rootAnchors = [];

      for (const anchor of allAnchors) {
        const rawText = toText(anchor.textContent || '');
        const normalizedText = toLowerText(rawText);
        if (!rootSuffixLower.some((suffix) => normalizedText.endsWith(suffix))) continue;

        const url = resolveCategoryUrl(anchor.getAttribute('href') || '', baseUrl);
        const id = normalizeCategoryId(url);
        const name = cleanRootSectionName(rawText);
        if (!id || !name || name.length > 120) continue;

        rootCategories.push({ id, name, parentId: '0', url });
        rootAnchors.push({ id, anchor });
      }

      // Build final category list (roots + immediate children)
      const allCategories = [];
      const seenIds = new Set();

      for (const root of rootCategories) {
        if (seenIds.has(root.id)) continue;
        seenIds.add(root.id);
        allCategories.push(root);
      }

      // Iterate all category anchors in document order.
      // Track "current root" — when we pass a root anchor, switch the parent context.
      const rootIdSet = new Set(rootCategories.map((r) => r.id));
      let currentRootId = '0';

      for (const anchor of allAnchors) {
        const url = resolveCategoryUrl(anchor.getAttribute('href') || '', baseUrl);
        const id = normalizeCategoryId(url);
        if (!id) continue;

        // If this is a root category anchor, update current root context
        if (rootIdSet.has(id)) {
          currentRootId = id;
          continue;
        }

        if (seenIds.has(id)) continue;

        const rawText = toText(anchor.textContent || '');
        // Skip "show more" / "visa fler" suffixed text (could be secondary root mentions)
        const normalizedText = toLowerText(rawText);
        if (rootSuffixLower.some((suffix) => normalizedText.endsWith(suffix))) continue;

        const name = rawText;
        if (!name || name.length > 200) continue;

        const stopSet = new Set(stopTexts.map((s) => s.toLowerCase()));
        if (stopSet.has(normalizedText)) continue;

        seenIds.add(id);
        allCategories.push({
          id,
          name,
          parentId: currentRootId,
          url,
        });
      }

      return {
        blocked: false,
        categories: allCategories,
        rootCategories,
        diagnostics: {
          seedUrl: baseUrl,
          seedFinalUrl: baseUrl,
          seedStatus: 200,
          seedTitle: pageTitle,
        },
      };
    },
    {
      rootSectionSuffixes: ROOT_SECTION_SUFFIXES,
      stopTexts: STOP_TEXTS,
      blockedUrlHints: BLOCKED_URL_HINTS,
      blockedTextHints: BLOCKED_TEXT_HINTS,
    }
  );

  if (seedData.blocked) {
    const state = {
      configuredCategoriesUrl,
      currentUrl: page.url(),
      blocked: true,
      diagnostics: seedData.diagnostics,
    };
    log('tradera.category.scrape.blocked', state);
    await captureDebugArtifacts('tradera-category-blocked', state);
    const result = {
      categories: [],
      categorySource: 'public-categories',
      scrapedFrom: page.url(),
      diagnostics: seedData.diagnostics,
      crawlStats: { pagesVisited: 1, rootCount: 0 },
    };
    emit('result', result);
    return result;
  }

  log('tradera.category.scrape.seed', {
    rootCount: seedData.rootCategories.length,
    totalFromSeed: seedData.categories.length,
    sampleRoots: seedData.rootCategories.slice(0, 5).map(({ url, ...r }) => r),
    sampleChildren: seedData.categories.filter((c) => c.parentId !== '0').slice(0, 5).map(({ url, ...c }) => c),
  });

  // --- Phase 2: BFS deep crawl via page.goto() + page.evaluate() ---
  const categoriesById = new Map();
  const queue = [];
  const visitedPages = new Set();
  const pageErrors = [];
  const emptyChildPages = [];
  let pagesVisited = 1;
  const startTime = Date.now();

  for (const cat of seedData.categories) {
    categoriesById.set(cat.id, cat);
  }

  // Enqueue root categories first (to discover Level 2 children)
  for (const root of seedData.rootCategories) {
    if (root.url) {
      queue.push({ id: root.id, name: root.name, url: root.url, ancestorIds: [], depth: 0 });
    }
  }

  // Then enqueue Level 1 children that may have sub-children
  for (const cat of seedData.categories) {
    if (cat.parentId !== '0' && cat.url && !visitedPages.has(cat.id)) {
      queue.push({ id: cat.id, name: cat.name, url: cat.url, ancestorIds: [cat.parentId], depth: 1 });
    }
  }

  while (queue.length > 0 && visitedPages.size < MAX_PAGES && categoriesById.size < MAX_CATEGORIES) {
    if (Date.now() - startTime > TOTAL_BUDGET_MS) {
      log('tradera.category.scrape.budget_exhausted', {
        pagesVisited,
        categoriesFound: categoriesById.size,
        queueRemaining: queue.length,
      });
      break;
    }

    const current = queue.shift();
    if (!current?.url || visitedPages.has(current.id)) continue;
    if (current.depth > 3) continue;
    visitedPages.add(current.id);

    try {
      await page.goto(current.url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
      await wait(SETTLE_DELAY_MS);
      await acceptCookiesIfPresent();
    } catch (err) {
      pageErrors.push({
        categoryId: current.id,
        categoryName: current.name,
        error: String(err),
      });
      continue;
    }

    pagesVisited += 1;

    const pageResult = await page.evaluate(
      ({ currentCategory, stopTexts, blockedUrlHints, blockedTextHints }) => {
        const extractTraderaCategoryPageChildren = ${extractTraderaCategoryPageChildren.toString()};
        return extractTraderaCategoryPageChildren({
          currentCategory,
          stopTexts,
          blockedUrlHints,
          blockedTextHints,
        });
      },
      {
        currentCategory: {
          id: current.id,
          name: current.name,
          ancestorIds: current.ancestorIds || [],
        },
        stopTexts: STOP_TEXTS,
        blockedUrlHints: BLOCKED_URL_HINTS,
        blockedTextHints: BLOCKED_TEXT_HINTS,
      }
    );

    if (pageResult.blocked) {
      pageErrors.push({ categoryId: current.id, categoryName: current.name, blocked: true });
      continue;
    }

    if (pageResult.children.length === 0) {
      const emptyPageState = {
        categoryId: current.id,
        categoryName: current.name,
        categoryUrl: page.url(),
        depth: current.depth || 0,
      };
      emptyChildPages.push(emptyPageState);
      if (emptyChildPages.length <= 2) {
        await captureDebugArtifacts('tradera-category-no-children-' + current.id, emptyPageState);
      }
    }

    for (const child of pageResult.children) {
      if (!categoriesById.has(child.id)) {
        categoriesById.set(child.id, child);
        queue.push({
          id: child.id,
          name: child.name,
          url: child.url,
          ancestorIds: [...(current.ancestorIds || []), current.id],
          depth: (current.depth || 0) + 1,
        });
      } else {
        const existing = categoriesById.get(child.id);
        if (
          existing &&
          (!existing.parentId || existing.parentId === '0') &&
          child.parentId &&
          child.parentId !== '0'
        ) {
          categoriesById.set(child.id, {
            ...existing,
            parentId: child.parentId,
            url: existing.url || child.url,
          });
        }
      }
    }
  }

  // --- Build result ---
  const crawlResult = {
    categories: Array.from(categoriesById.values()).map(({ url, ...category }) => category),
    categorySource: 'public-categories',
    scrapedFrom: seedData.diagnostics.seedUrl || page.url(),
    diagnostics: seedData.diagnostics,
    crawlStats: {
      pagesVisited,
      rootCount: seedData.rootCategories.length,
      pageErrors: pageErrors.slice(0, 20),
      emptyChildPages: emptyChildPages.slice(0, 20),
    },
  };

  if (!crawlResult || !Array.isArray(crawlResult.categories)) {
    const state = {
      configuredCategoriesUrl,
      currentUrl: page.url(),
      crawlResult,
    };
    log('tradera.category.scrape.invalid', state);
    await captureDebugArtifacts('tradera-category-invalid', state);
    const result = {
      categories: [],
      categorySource: 'public-categories',
      scrapedFrom: page.url(),
      diagnostics: state,
    };
    emit('result', result);
    return result;
  }

  const withParent = crawlResult.categories.filter((category) => category.parentId && category.parentId !== '0');
  const roots = crawlResult.categories.filter((category) => !category.parentId || category.parentId === '0');

  log('tradera.category.scrape.result', {
    source: crawlResult.categorySource,
    total: crawlResult.categories.length,
    withParentCount: withParent.length,
    rootCount: roots.length,
    crawlStats: crawlResult.crawlStats,
    sampleRoots: roots.slice(0, 5),
    sampleChildren: withParent.slice(0, 5),
  });

  if (crawlResult.categories.length === 0) {
    const state = {
      configuredCategoriesUrl,
      currentUrl: page.url(),
      diagnostics: crawlResult.diagnostics,
      crawlStats: crawlResult.crawlStats,
    };
    log('tradera.category.scrape.empty', state);
    await captureDebugArtifacts('tradera-category-empty', state);
  }

  const result = {
    categories: crawlResult.categories,
    categorySource: crawlResult.categorySource || 'public-categories',
    scrapedFrom: crawlResult.scrapedFrom || page.url(),
    diagnostics: crawlResult.diagnostics || null,
    crawlStats: crawlResult.crawlStats || null,
  };
  emit('result', result);
  return result;
}
`;
