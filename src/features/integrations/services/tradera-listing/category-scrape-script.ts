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

  await page.goto(configuredCategoriesUrl, { waitUntil: 'domcontentloaded' });
  await wait(600);

  const crawlResult = await page.evaluate(
    async ({ seedUrl, rootSectionSuffixes, stopTexts, blockedUrlHints, blockedTextHints }) => {
      const MAX_PAGES = 1200;
      const MAX_CATEGORIES = 5000;
      const parser = new DOMParser();

      const toText = (value) =>
        typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

      const toLowerText = (value) => toText(value).toLowerCase();

      const normalizeCategoryId = (candidate) => {
        if (candidate == null) return '';
        const normalized = toText(String(candidate));
        if (!normalized) return '';
        const match = normalized.match(/\/category\/(\d+)(?:[/?#]|$)/i);
        if (match && match[1]) {
          return match[1];
        }
        const digits = normalized.match(/\b(\d{2,})\b/);
        return digits && digits[1] ? digits[1] : normalized;
      };

      const resolveCategoryUrl = (href, baseUrl) => {
        try {
          const url = new URL(href, baseUrl);
          if (!/\/category\/\d+/i.test(url.pathname)) {
            return null;
          }
          url.hash = '';
          return url.toString();
        } catch {
          return null;
        }
      };

      const isBlockedDocument = (doc, currentUrl) => {
        const normalizedUrl = toLowerText(currentUrl);
        if (blockedUrlHints.some((hint) => normalizedUrl.includes(hint))) {
          return true;
        }

        const title = toLowerText(doc.title);
        const heading = toLowerText(
          doc.querySelector('h1, [role="heading"]')?.textContent ?? ''
        );
        const bodyText = toLowerText(doc.body?.textContent ?? '').slice(0, 4000);
        const haystack = [title, heading, bodyText].filter(Boolean).join(' ');
        return blockedTextHints.some((hint) => haystack.includes(hint));
      };

      const dedupeCategories = (categories) => {
        const byId = new Map();
        for (const category of categories) {
          const id = normalizeCategoryId(category?.id);
          const name = toText(category?.name);
          const parentId = toText(category?.parentId || '') || '0';
          const url = typeof category?.url === 'string' ? category.url : null;
          if (!id || !name) continue;
          if (!byId.has(id)) {
            byId.set(id, { id, name, parentId, url });
          }
        }
        return Array.from(byId.values());
      };

      const fetchDocument = async (url) => {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          redirect: 'follow',
          cache: 'no-store',
        });
        const html = await response.text();
        return {
          requestedUrl: url,
          finalUrl: response.url || url,
          status: response.status,
          html,
          doc: parser.parseFromString(html, 'text/html'),
        };
      };

      const cleanRootSectionName = (value) => {
        let name = toText(value);
        for (const suffix of rootSectionSuffixes) {
          const escaped = suffix.replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
          name = name.replace(new RegExp('\\s*' + escaped + '\\s*$', 'i'), '').trim();
        }
        return name;
      };

      const extractRootCategories = (doc, baseUrl) => {
        const anchors = Array.from(doc.querySelectorAll('a[href*="/category/"]'));
        const results = [];

        for (const anchor of anchors) {
          const rawText = toText(anchor.textContent || '');
          const normalizedText = toLowerText(rawText);
          if (!rootSectionSuffixes.some((suffix) => normalizedText.endsWith(suffix))) {
            continue;
          }

          const url = resolveCategoryUrl(anchor.getAttribute('href') || '', baseUrl);
          const id = normalizeCategoryId(url);
          const name = cleanRootSectionName(rawText);
          if (!id || !name || name.length > 120) {
            continue;
          }

          results.push({
            id,
            name,
            parentId: '0',
            url,
          });
        }

        return dedupeCategories(results);
      };

      const isStopNode = (node, stopSet) => {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
          return false;
        }
        const element = node;
        const text = toLowerText(element.textContent || '');
        if (!text || !stopSet.has(text)) {
          return false;
        }

        const tag = (element.tagName || '').toLowerCase();
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

      const extractDirectChildren = (doc, baseUrl, currentCategory) => {
        const main = doc.querySelector('main') || doc.body;
        if (!main) {
          return [];
        }

        const stopSet = new Set(stopTexts.map((value) => toLowerText(value)));
        const normalizedCurrentName = toLowerText(currentCategory.name);
        const ancestorIds = new Set([currentCategory.id, ...(currentCategory.ancestorIds || [])]);
        const headingCandidates = Array.from(main.querySelectorAll('h1, [role="heading"]'));
        const targetHeading =
          headingCandidates.find(
            (heading) => toLowerText(heading.textContent || '') === normalizedCurrentName
          ) ||
          headingCandidates[0] ||
          null;

        const children = [];
        const seenIds = new Set();
        const walker = doc.createTreeWalker(main, NodeFilter.SHOW_ELEMENT);
        let collecting = targetHeading === null;
        let node = walker.currentNode;

        while (node) {
          if (!collecting) {
            if (node === targetHeading) {
              collecting = true;
            }
            node = walker.nextNode();
            continue;
          }

          if (node !== targetHeading && isStopNode(node, stopSet)) {
            break;
          }

          const element = node;
          if ((element.tagName || '').toLowerCase() === 'a') {
            const href = element.getAttribute('href') || '';
            const url = resolveCategoryUrl(href, baseUrl);
            const id = normalizeCategoryId(url);
            const name = toText(element.textContent || '');

            if (
              id &&
              name &&
              !ancestorIds.has(id) &&
              toLowerText(name) !== normalizedCurrentName &&
              !seenIds.has(id)
            ) {
              seenIds.add(id);
              children.push({
                id,
                name,
                parentId: currentCategory.id,
                url,
              });
            }
          }

          node = walker.nextNode();
        }

        return dedupeCategories(children);
      };

      const seed = await fetchDocument(seedUrl);
      const diagnostics = {
        seedUrl,
        seedFinalUrl: seed.finalUrl,
        seedStatus: seed.status,
        seedTitle: toText(seed.doc.title),
      };

      if (seed.status >= 400 || isBlockedDocument(seed.doc, seed.finalUrl)) {
        return {
          categories: [],
          categorySource: 'public-categories',
          scrapedFrom: seed.finalUrl,
          diagnostics: {
            ...diagnostics,
            blocked: true,
          },
          crawlStats: {
            pagesVisited: 1,
            rootCount: 0,
          },
        };
      }

      const rootCategories = extractRootCategories(seed.doc, seed.finalUrl);
      const categoriesById = new Map();
      const queue = [];
      const visitedPages = new Set();

      for (const rootCategory of rootCategories) {
        categoriesById.set(rootCategory.id, rootCategory);
        queue.push({
          id: rootCategory.id,
          name: rootCategory.name,
          url: rootCategory.url,
          ancestorIds: [],
        });
      }

      let pagesVisited = 1;
      const pageErrors = [];

      while (queue.length > 0 && visitedPages.size < MAX_PAGES && categoriesById.size < MAX_CATEGORIES) {
        const currentCategory = queue.shift();
        if (!currentCategory?.url || visitedPages.has(currentCategory.id)) {
          continue;
        }

        visitedPages.add(currentCategory.id);

        let pageResult;
        try {
          pageResult = await fetchDocument(currentCategory.url);
        } catch (error) {
          pageErrors.push({
            categoryId: currentCategory.id,
            categoryName: currentCategory.name,
            error: String(error),
          });
          continue;
        }

        pagesVisited += 1;

        if (pageResult.status >= 400 || isBlockedDocument(pageResult.doc, pageResult.finalUrl)) {
          pageErrors.push({
            categoryId: currentCategory.id,
            categoryName: currentCategory.name,
            finalUrl: pageResult.finalUrl,
            blocked: true,
            status: pageResult.status,
          });
          continue;
        }

        const children = extractDirectChildren(pageResult.doc, pageResult.finalUrl, currentCategory);
        for (const child of children) {
          if (!categoriesById.has(child.id)) {
            categoriesById.set(child.id, child);
            queue.push({
              id: child.id,
              name: child.name,
              url: child.url,
              ancestorIds: [...currentCategory.ancestorIds, currentCategory.id],
            });
            continue;
          }

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

      return {
        categories: dedupeCategories(Array.from(categoriesById.values())).map(({ url, ...category }) => category),
        categorySource: 'public-categories',
        scrapedFrom: seed.finalUrl,
        diagnostics,
        crawlStats: {
          pagesVisited,
          rootCount: rootCategories.length,
          pageErrors: pageErrors.slice(0, 20),
        },
      };
    },
    {
      seedUrl: configuredCategoriesUrl,
      rootSectionSuffixes: ROOT_SECTION_SUFFIXES,
      stopTexts: STOP_TEXTS,
      blockedUrlHints: BLOCKED_URL_HINTS,
      blockedTextHints: BLOCKED_TEXT_HINTS,
    }
  );

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
