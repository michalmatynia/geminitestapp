import { extractTraderaCategoryPageChildren } from '@/features/integrations/services/tradera-listing/category-scrape-script';
import { type StepId } from '../step-registry';
import { PlaywrightSequencer, type PlaywrightSequencerContext } from './PlaywrightSequencer';

// ─── Constants ──────────────────────────────────────────────────────────────

const ROOT_SECTION_SUFFIXES = ['show more', 'visa fler'] as const;
const STOP_TEXTS = ['all filters', 'alla filter', 'newest', 'senaste', 'sort by', 'sortera'] as const;
const BLOCKED_URL_HINTS = ['/login', '/captcha', '/challenge', '/verification', '/verify'] as const;
const BLOCKED_TEXT_HINTS = [
  'log in', 'login', 'sign in', 'captcha', 'verification',
  'security check', 'two-factor', 'two factor', '2fa',
] as const;

const COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  'button:has-text("Accept all cookies")',
  'button:has-text("Accept all")',
  'button:has-text("Acceptera alla cookies")',
  'button:has-text("Acceptera alla kakor")',
  'button:has-text("Godkänn alla cookies")',
  'button:has-text("Tillåt alla cookies")',
] as const;

const MAX_PAGES = 600;
const MAX_CATEGORIES = 5000;
const TOTAL_BUDGET_MS = 270_000;
const NAV_TIMEOUT_MS = 15_000;
const SETTLE_DELAY_MS = 1200;

// ─── Types ──────────────────────────────────────────────────────────────────

type CategoryNode = {
  id: string;
  name: string;
  parentId: string;
  url: string;
};

type CrawlQueueItem = {
  id: string;
  name: string;
  url: string;
  ancestorIds: string[];
  depth: number;
};

type SeedData = {
  blocked: boolean;
  categories: CategoryNode[];
  rootCategories: CategoryNode[];
  diagnostics: Record<string, unknown>;
};

export type TraderaCategorySequencerResult = {
  categories: Array<{ id: string; name: string; parentId: string }>;
  categorySource: string;
  scrapedFrom: string;
  diagnostics: Record<string, unknown> | null;
  crawlStats: Record<string, unknown> | null;
};

export type TraderaCategorySequencerInput = {
  categoriesUrl: string;
};

// ─── Sequencer ──────────────────────────────────────────────────────────────

export class TraderaCategorySequencer extends PlaywrightSequencer {
  private readonly categoriesUrl: string;

  private seedData: SeedData | null = null;
  private categoriesById = new Map<string, CategoryNode>();
  private crawlQueue: CrawlQueueItem[] = [];
  private visitedPages = new Set<string>();
  private pageErrors: Array<Record<string, unknown>> = [];
  private emptyChildPages: Array<Record<string, unknown>> = [];
  private pagesVisited = 1;
  private crawlStartTime = 0;

  public result: TraderaCategorySequencerResult | null = null;

  constructor(context: PlaywrightSequencerContext, input: TraderaCategorySequencerInput) {
    super(context);
    this.categoriesUrl = input.categoriesUrl;
  }

  protected async executeStep(stepId: StepId): Promise<void> {
    switch (stepId) {
      case 'browser_preparation': await this.stepBrowserPreparation(); return;
      case 'browser_open': await this.stepBrowserOpen(); return;
      case 'cookie_accept': await this.stepCookieAccept(); return;
      case 'categories_seed_extract': await this.stepSeedExtract(); return;
      case 'categories_crawl': await this.stepCrawl(); return;
      case 'categories_finalize': await this.stepFinalize(); return;
      case 'browser_close': this.stepBrowserClose(); return;
      default: throw new Error(`TraderaCategorySequencer: unknown step "${String(stepId)}"`);
    }
  }

  private note(stepId: StepId, message: string): void {
    this.context.tracker.start(stepId, message);
  }

  private complete(stepId: StepId, message: string): void {
    this.context.tracker.succeed(stepId, message);
  }

  private skip(stepId: StepId, message: string): void {
    this.context.tracker.skip(stepId, message);
  }

  private async stepBrowserPreparation(): Promise<void> {
    const config = this.getStepConfig('browser_preparation');
    const { page } = this.context;
    if (typeof page.setViewportSize === 'function') {
      await page.setViewportSize({
        width: config.viewportWidth ?? 1_280,
        height: config.viewportHeight ?? 800,
      });
      if (config.settleDelayMs !== null && config.settleDelayMs !== undefined && config.settleDelayMs > 0) {
        await this.wait(config.settleDelayMs);
      }
    }
    this.complete('browser_preparation', 'Browser settings were prepared.');
  }

  private async stepBrowserOpen(): Promise<void> {
    const { page } = this.context;
    await page.goto(this.categoriesUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await this.wait(1500);
    this.complete('browser_open', 'Tradera categories page opened.');
  }

  private async stepCookieAccept(): Promise<void> {
    const { page } = this.context;
    let accepted = false;
    for (const selector of COOKIE_ACCEPT_SELECTORS) {
      const locator = page.locator(selector).first();
      const visible = await locator.isVisible().catch(() => false);
      if (!visible) continue;
      await locator.click().catch(() => undefined);
      await this.wait(600);
      accepted = true;
      break;
    }
    this.complete(
      'cookie_accept',
      accepted ? 'Cookie consent was handled.' : 'No cookie banner detected.'
    );
  }

  private async stepSeedExtract(): Promise<void> {
    const { page } = this.context;
    this.note('categories_seed_extract', 'Extracting category roots from the seed page.');

    const seedData = await page.evaluate(
      ({
        rootSectionSuffixes,
        stopTexts,
        blockedUrlHints,
        blockedTextHints,
      }: {
        rootSectionSuffixes: string[];
        stopTexts: string[];
        blockedUrlHints: string[];
        blockedTextHints: string[];
      }) => {
        const toText = (value: unknown): string =>
          typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
        const toLowerText = (value: unknown): string => toText(value).toLowerCase();

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

        const cleanRootSectionName = (value: string): string => {
          let name = toText(value);
          for (const suffix of rootSectionSuffixes) {
            const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            name = name.replace(new RegExp(`\\s*${escaped}\\s*$`, 'i'), '').trim();
          }
          return name;
        };

        const baseUrl = window.location.href;
        const pageTitle = document.title;
        const normalizedUrl = toLowerText(baseUrl);

        if (blockedUrlHints.some((hint) => normalizedUrl.includes(hint))) {
          return {
            blocked: true,
            categories: [] as Array<{ id: string; name: string; parentId: string; url: string }>,
            rootCategories: [] as Array<{ id: string; name: string; parentId: string; url: string }>,
            diagnostics: { seedUrl: baseUrl, seedFinalUrl: baseUrl, seedStatus: 0, seedTitle: pageTitle },
          };
        }

        const mainContent = document.querySelector('main') ?? document.querySelector('#site-main');
        const mainText = toLowerText(mainContent?.textContent ?? '').slice(0, 4000);
        const hasCategoryLinks = Boolean(document.querySelector('a[href*="/category/"]'));
        if (!hasCategoryLinks && mainText && blockedTextHints.some((hint) => mainText.includes(hint))) {
          return {
            blocked: true,
            categories: [] as Array<{ id: string; name: string; parentId: string; url: string }>,
            rootCategories: [] as Array<{ id: string; name: string; parentId: string; url: string }>,
            diagnostics: { seedUrl: baseUrl, seedFinalUrl: baseUrl, seedStatus: 0, seedTitle: pageTitle },
          };
        }

        const allAnchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/category/"]'));
        const rootSuffixLower = rootSectionSuffixes.map((s) => s.toLowerCase());
        const rootCategories: Array<{ id: string; name: string; parentId: string; url: string }> = [];

        for (const anchor of allAnchors) {
          const rawText = toText(anchor.textContent ?? '');
          const normalizedText = toLowerText(rawText);
          if (!rootSuffixLower.some((suffix) => normalizedText.endsWith(suffix))) continue;
          const url = resolveCategoryUrl(anchor.getAttribute('href') ?? '', baseUrl);
          const id = normalizeCategoryId(url);
          const name = cleanRootSectionName(rawText);
          if (!id || !name || name.length > 120) continue;
          rootCategories.push({ id, name, parentId: '0', url: url! });
        }

        const allCategories: Array<{ id: string; name: string; parentId: string; url: string }> = [];
        const seenIds = new Set<string>();
        const rootIdSet = new Set(rootCategories.map((r) => r.id));
        let currentRootId = '0';
        const stopSet = new Set(stopTexts.map((s) => s.toLowerCase()));

        for (const root of rootCategories) {
          if (!seenIds.has(root.id)) {
            seenIds.add(root.id);
            allCategories.push(root);
          }
        }

        for (const anchor of allAnchors) {
          const url = resolveCategoryUrl(anchor.getAttribute('href') ?? '', baseUrl);
          const id = normalizeCategoryId(url);
          if (!id) continue;

          if (rootIdSet.has(id)) {
            currentRootId = id;
            continue;
          }

          if (seenIds.has(id)) continue;

          const rawText = toText(anchor.textContent ?? '');
          const normalizedText = toLowerText(rawText);
          if (rootSuffixLower.some((suffix) => normalizedText.endsWith(suffix))) continue;
          if (!rawText || rawText.length > 200) continue;
          if (stopSet.has(normalizedText)) continue;

          seenIds.add(id);
          allCategories.push({ id, name: rawText, parentId: currentRootId, url: url! });
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
        rootSectionSuffixes: [...ROOT_SECTION_SUFFIXES],
        stopTexts: [...STOP_TEXTS],
        blockedUrlHints: [...BLOCKED_URL_HINTS],
        blockedTextHints: [...BLOCKED_TEXT_HINTS],
      }
    );

    if (seedData.blocked) {
      this.context.tracker.fail(
        'categories_seed_extract',
        'Tradera category seed page was blocked by a verification or login surface.'
      );
      this.skip('categories_crawl', 'Skipped because the seed page was blocked.');
      this.skip('categories_finalize', 'Skipped because the seed page was blocked.');
      this.skip('browser_close', 'Browser scrape flow ended.');
      this.result = {
        categories: [],
        categorySource: 'public-categories',
        scrapedFrom: page.url(),
        diagnostics: seedData.diagnostics,
        crawlStats: { pagesVisited: 1, rootCount: 0 },
      };
      return;
    }

    this.seedData = seedData;
    this.crawlStartTime = Date.now();

    for (const cat of seedData.categories) {
      this.categoriesById.set(cat.id, cat);
    }

    for (const root of seedData.rootCategories) {
      if (root.url) {
        this.crawlQueue.push({
          id: root.id, name: root.name, url: root.url, ancestorIds: [], depth: 0,
        });
      }
    }

    for (const cat of seedData.categories) {
      if (cat.parentId !== '0' && cat.url && !this.visitedPages.has(cat.id)) {
        this.crawlQueue.push({
          id: cat.id, name: cat.name, url: cat.url, ancestorIds: [cat.parentId], depth: 1,
        });
      }
    }

    this.complete(
      'categories_seed_extract',
      'Extracted initial category roots and visible child categories.'
    );
  }

  private async stepCrawl(): Promise<void> {
    const { page } = this.context;
    this.note('categories_crawl', 'Crawling linked Tradera category pages.');

    const stopTexts = [...STOP_TEXTS];
    const blockedUrlHints = [...BLOCKED_URL_HINTS];
    const blockedTextHints = [...BLOCKED_TEXT_HINTS];

    while (
      this.crawlQueue.length > 0 &&
      this.visitedPages.size < MAX_PAGES &&
      this.categoriesById.size < MAX_CATEGORIES
    ) {
      if (Date.now() - this.crawlStartTime > TOTAL_BUDGET_MS) {
        this.context.log?.('tradera.category.scrape.budget_exhausted', {
          pagesVisited: this.pagesVisited,
          categoriesFound: this.categoriesById.size,
          queueRemaining: this.crawlQueue.length,
        });
        break;
      }

      const current = this.crawlQueue.shift();
      if (!current?.url || this.visitedPages.has(current.id)) continue;
      if (current.depth > 3) continue;
      this.visitedPages.add(current.id);

      try {
        await page.goto(current.url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
        await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
        await this.wait(SETTLE_DELAY_MS);
        for (const selector of COOKIE_ACCEPT_SELECTORS) {
          const locator = page.locator(selector).first();
          const visible = await locator.isVisible({ timeout: 500 }).catch(() => false);
          if (visible) {
            await locator.click().catch(() => undefined);
            await this.wait(600);
            break;
          }
        }
      } catch (err) {
        this.pageErrors.push({
          categoryId: current.id,
          categoryName: current.name,
          error: String(err),
        });
        continue;
      }

      this.pagesVisited += 1;

      const pageResult = await page.evaluate(extractTraderaCategoryPageChildren, {
        currentCategory: {
          id: current.id,
          name: current.name,
          ancestorIds: current.ancestorIds,
        },
        stopTexts,
        blockedUrlHints,
        blockedTextHints,
      });

      if (pageResult.blocked) {
        this.pageErrors.push({ categoryId: current.id, categoryName: current.name, blocked: true });
        continue;
      }

      if (pageResult.children.length === 0) {
        const emptyPageState = {
          categoryId: current.id,
          categoryName: current.name,
          categoryUrl: page.url(),
          depth: current.depth,
        };
        this.emptyChildPages.push(emptyPageState);
        if (this.emptyChildPages.length <= 2) {
          await this.captureArtifacts(`tradera-category-no-children-${current.id}`);
        }
      }

      for (const child of pageResult.children) {
        if (!this.categoriesById.has(child.id)) {
          this.categoriesById.set(child.id, { ...child });
          this.crawlQueue.push({
            id: child.id,
            name: child.name,
            url: child.url,
            ancestorIds: [...current.ancestorIds, current.id],
            depth: current.depth + 1,
          });
        } else {
          const existing = this.categoriesById.get(child.id);
          if (
            existing &&
            (!existing.parentId || existing.parentId === '0') &&
            child.parentId &&
            child.parentId !== '0'
          ) {
            this.categoriesById.set(child.id, {
              ...existing,
              parentId: child.parentId,
              url: existing.url || child.url,
            });
          }
        }
      }
    }

    this.complete(
      'categories_crawl',
      `Category crawl completed across ${String(this.pagesVisited)} page(s).`
    );
  }

  private async stepFinalize(): Promise<void> {
    const { page } = this.context;
    this.note('categories_finalize', 'Finalizing normalized Tradera category output.');

    const categories = Array.from(this.categoriesById.values()).map(
      ({ url: _url, ...category }) => category
    );

    this.result = {
      categories,
      categorySource: 'public-categories',
      scrapedFrom: (this.seedData?.diagnostics?.['seedUrl'] as string | undefined) ?? page.url(),
      diagnostics: (this.seedData?.diagnostics ?? null) as Record<string, unknown> | null,
      crawlStats: {
        pagesVisited: this.pagesVisited,
        rootCount: this.seedData?.rootCategories.length ?? 0,
        pageErrors: this.pageErrors.slice(0, 20),
        emptyChildPages: this.emptyChildPages.slice(0, 20),
      },
    };

    this.complete('categories_finalize', 'Final Tradera category output was prepared.');
  }

  private stepBrowserClose(): void {
    this.complete('browser_close', 'Browser scrape flow ended.');
  }
}
