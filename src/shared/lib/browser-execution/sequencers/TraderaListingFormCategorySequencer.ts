import { type StepId } from '../step-registry';
import { PlaywrightSequencer, type PlaywrightSequencerContext } from './PlaywrightSequencer';
import type { TraderaCategorySequencerResult } from './tradera-category-sequencer-types';
import type { TraderaListingFormCategoryPickerItem } from './tradera-listing-form-category-picker';
import {
  acceptTraderaListingFormCategoryCookies,
  closeTraderaListingFormCategoryPicker,
  isOnTraderaListingFormAuthPage,
  openTraderaListingFormCategoryPicker,
  readTraderaListingFormCategoryPickerItems,
  TRADERA_LISTING_FORM_CATEGORY_PICKER_DIAGNOSTIC_SELECTORS,
} from './tradera-listing-form-category-picker-automation';
import { drillAndReadTraderaListingFormCategoryPath } from './tradera-listing-form-category-drill';
import {
  enrichTraderaListingFormCategoryItemsFromPublicPage,
  fetchTraderaPublicCategoryChildItemsForPath,
} from './tradera-listing-form-category-public-page';
import { crawlTraderaListingFormCategoryTree } from './tradera-listing-form-category-tree-crawl';

const TOTAL_BUDGET_MS = 900_000;
const MAX_CONSECUTIVE_DRILL_FAILURES = 2;

type PickerItem = TraderaListingFormCategoryPickerItem;

type CategoryEntry = {
  id: string;
  name: string;
  parentId: string;
};

type EmptyResultInput = {
  diagnostics: Record<string, unknown>;
  crawlStats: Record<string, unknown>;
};

export type TraderaListingFormCategorySequencerInput = {
  listingFormUrl: string;
  /**
   * Optional callback invoked when the listing form lands on Tradera's auth surface mid-fetch.
   * Should run the standard Tradera auth flow (ensureLoggedIn + storage-state persistence).
   * Returns `true` when the session is now authenticated and the sequencer can retry.
   */
  reauthenticate?: () => Promise<boolean>;
};

export class TraderaListingFormCategorySequencer extends PlaywrightSequencer {
  private readonly listingFormUrl: string;
  private readonly reauthenticate: (() => Promise<boolean>) | null;
  private reauthAttempted = false;
  private reauthSucceeded = false;

  private rootItems: PickerItem[] = [];
  private categoriesById = new Map<string, CategoryEntry>();
  private crawlStartTime = 0;
  private pagesVisited = 0;
  private budgetExhausted = false;
  private retryCount = 0;
  private diagnostics: Record<string, unknown> | null = null;
  private rootsSeededFromPublic = false;
  private drillFailureCount = 0;
  private consecutiveDrillFailures = 0;
  private lastFailedPath: string[] | null = null;
  private drillSessionAborted = false;

  public result: TraderaCategorySequencerResult | null = null;

  constructor(
    context: PlaywrightSequencerContext,
    input: TraderaListingFormCategorySequencerInput
  ) {
    super(context);
    this.listingFormUrl = input.listingFormUrl;
    this.reauthenticate = input.reauthenticate ?? null;
  }

  protected override async executeStep(stepId: StepId): Promise<void> {
    switch (stepId) {
      case 'browser_preparation': await this.stepBrowserPreparation(); return;
      case 'browser_open': await this.stepBrowserOpen(); return;
      case 'cookie_accept': await this.stepCookieAccept(); return;
      case 'categories_seed_extract': await this.stepSeedExtract(); return;
      case 'categories_crawl': await this.stepCrawl(); return;
      case 'categories_finalize': this.stepFinalize(); return;
      case 'browser_close': this.stepBrowserClose(); return;
      default: throw new Error(`TraderaListingFormCategorySequencer: unknown step "${String(stepId)}"`);
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

  private waitForPicker = (ms: number): Promise<void> => this.wait(ms);

  private isBudgetExhausted(): boolean {
    return Date.now() - this.crawlStartTime > TOTAL_BUDGET_MS;
  }

  private buildId(name: string, parentId: string): string {
    const slug = name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return parentId.length > 0 ? `${parentId}:${slug}` : `lf:${slug}`;
  }

  private resolveId(item: PickerItem, parentId: string): string {
    return item.id.length > 0 ? item.id : this.buildId(item.name, parentId);
  }

  private addCategory(id: string, name: string, parentId: string): void {
    if (!this.categoriesById.has(id)) {
      this.categoriesById.set(id, { id, name, parentId });
    }
  }

  private addRootCategories(): void {
    for (const item of this.rootItems) {
      const id = this.resolveId(item, '0');
      this.addCategory(id, item.name, '0');
    }
  }

  private setEmptyResult({ diagnostics, crawlStats }: EmptyResultInput): void {
    this.skip('categories_crawl', 'Skipped because category picker could not be scraped.');
    this.skip('categories_finalize', 'Skipped because category picker could not be scraped.');
    this.skip('browser_close', 'Browser scrape flow ended.');
    this.result = {
      categories: [],
      categorySource: 'listing-form-picker',
      scrapedFrom: this.context.page.url(),
      diagnostics,
      crawlStats,
    };
  }

  private async stepBrowserPreparation(): Promise<void> {
    const config = this.getStepConfig('browser_preparation');
    const { page } = this.context;
    if (typeof page.setViewportSize === 'function') {
      await page.setViewportSize({
        width: config.viewportWidth ?? 1_280,
        height: config.viewportHeight ?? 900,
      });
      const settleDelayMs = config.settleDelayMs ?? 0;
      if (settleDelayMs > 0) {
        await this.wait(settleDelayMs);
      }
    }
    this.complete('browser_preparation', 'Browser settings were prepared.');
  }

  private async stepBrowserOpen(): Promise<void> {
    await this.openListingForm();
    this.complete('browser_open', 'Tradera listing form opened.');
  }

  private async openListingForm(): Promise<void> {
    const { page } = this.context;
    await page.goto(this.listingFormUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await this.wait(1_500);
  }

  private async stepCookieAccept(): Promise<void> {
    const accepted = await this.acceptCategoryCookies();
    this.complete(
      'cookie_accept',
      accepted ? 'Cookie consent was handled.' : 'No cookie banner detected.'
    );
  }

  private async acceptCategoryCookies(): Promise<boolean> {
    return acceptTraderaListingFormCategoryCookies({
      page: this.context.page,
      wait: this.waitForPicker,
    });
  }

  private async resolveAuthBlockOrFail(): Promise<boolean> {
    if (!(await isOnTraderaListingFormAuthPage(this.context.page))) return true;

    if (this.reauthenticate === null || this.reauthAttempted) {
      this.context.tracker.fail(
        'categories_seed_extract',
        'Tradera login is required before fetching listing form categories.'
      );
      this.setEmptyResult({
        diagnostics: {
          reason: 'auth_required',
          formUrl: this.listingFormUrl,
          reauthAttempted: this.reauthAttempted,
        },
        crawlStats: { pagesVisited: 0, rootCount: 0 },
      });
      return false;
    }

    this.reauthAttempted = true;
    this.context.log?.('tradera.listing-form-category.reauth-start', {
      formUrl: this.listingFormUrl,
    });
    const ok = await this.reauthenticate().catch((error: unknown) => {
      this.context.log?.('tradera.listing-form-category.reauth-error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    });
    this.reauthSucceeded = ok;
    if (!ok) {
      this.context.tracker.fail(
        'categories_seed_extract',
        'Tradera reauthentication did not restore the listing form session.'
      );
      this.setEmptyResult({
        diagnostics: {
          reason: 'auth_required',
          formUrl: this.listingFormUrl,
          reauthAttempted: true,
          reauthSucceeded: false,
        },
        crawlStats: { pagesVisited: 0, rootCount: 0 },
      });
      return false;
    }

    await this.openListingForm();
    await this.acceptCategoryCookies();

    if (await isOnTraderaListingFormAuthPage(this.context.page)) {
      this.context.tracker.fail(
        'categories_seed_extract',
        'Tradera listing form remained on the auth surface after reauthentication.'
      );
      this.setEmptyResult({
        diagnostics: {
          reason: 'auth_required_after_reauth',
          formUrl: this.listingFormUrl,
          reauthAttempted: true,
          reauthSucceeded: true,
        },
        crawlStats: { pagesVisited: 0, rootCount: 0 },
      });
      return false;
    }

    this.context.log?.('tradera.listing-form-category.reauth-success', {
      formUrl: this.listingFormUrl,
    });
    return true;
  }

  private async stepSeedExtract(): Promise<void> {
    this.note('categories_seed_extract', 'Opening category picker to read top-level categories.');

    if (!(await this.resolveAuthBlockOrFail())) return;

    const opened = await openTraderaListingFormCategoryPicker({
      page: this.context.page,
      wait: this.waitForPicker,
    });
    if (!opened) {
      this.context.tracker.fail(
        'categories_seed_extract',
        'Could not locate the category picker trigger on the listing form.'
      );
      this.setEmptyResult({
        diagnostics: { reason: 'picker_not_found', formUrl: this.listingFormUrl },
        crawlStats: { pagesVisited: 0, rootCount: 0 },
      });
      return;
    }

    this.rootItems = await readTraderaListingFormCategoryPickerItems(this.context.page);
    if (this.rootItems.length === 0) {
      this.diagnostics = {
        reason: 'picker_opened_without_items',
        formUrl: this.listingFormUrl,
        pickerRootSelectors: TRADERA_LISTING_FORM_CATEGORY_PICKER_DIAGNOSTIC_SELECTORS,
      };
      this.context.tracker.fail(
        'categories_seed_extract',
        'Category picker opened but did not expose top-level categories.'
      );
      await closeTraderaListingFormCategoryPicker({
        page: this.context.page,
        wait: this.waitForPicker,
      });
      this.setEmptyResult({
        diagnostics: this.diagnostics,
        crawlStats: {
          pagesVisited: 0,
          rootCount: 0,
          rootsSeededFromPublic: false,
        },
      });
      return;
    }
    await closeTraderaListingFormCategoryPicker({
      page: this.context.page,
      wait: this.waitForPicker,
    });

    this.crawlStartTime = Date.now();
    this.addRootCategories();
    const seedNote = this.rootsSeededFromPublic ? ' (seeded from public taxonomy)' : '';
    this.complete(
      'categories_seed_extract',
      `Found ${String(this.rootItems.length)} top-level categories${seedNote}.`
    );
  }

  private async stepCrawl(): Promise<void> {
    this.note(
      'categories_crawl',
      `Drilling through ${String(this.rootItems.length)} top-level categories.`
    );

    const crawlResult = await crawlTraderaListingFormCategoryTree({
      rootItems: this.rootItems,
      isBudgetExhausted: () => this.isBudgetExhausted(),
      resolveId: (item, parentId) => this.resolveId(item, parentId),
      addCategory: (id, name, parentId) => this.addCategory(id, name, parentId),
      drillAndRead: (path) => this.drillAndRead(path),
    });
    this.pagesVisited = crawlResult.pagesVisited;
    this.budgetExhausted = crawlResult.budgetExhausted;

    const message = this.budgetExhausted
      ? `Category crawl stopped at budget limit after ${String(this.pagesVisited)} picker interactions.`
      : `Category crawl completed across ${String(this.pagesVisited)} picker interactions.`;
    this.complete('categories_crawl', message);
  }

  private async drillAndReadOnce(path: PickerItem[]): Promise<PickerItem[] | null> {
    const publicItems = await fetchTraderaPublicCategoryChildItemsForPath(path).catch(
      () => null
    );
    if (publicItems !== null) {
      return publicItems;
    }

    const items = await drillAndReadTraderaListingFormCategoryPath({
      page: this.context.page,
      path,
      wait: this.waitForPicker,
    });
    const parent = path.at(-1);
    if (parent === undefined) return items;

    if (items === null || items.length === 0) {
      return items;
    }

    return enrichTraderaListingFormCategoryItemsFromPublicPage({
      items,
      parent,
      path,
    }).catch(() => items);
  }

  private async resetListingFormForCategoryRetry(path: PickerItem[]): Promise<void> {
    this.retryCount += 1;
    this.context.log?.('tradera.listing-form-category.retrying-from-clean-form', {
      path: path.map((p) => p.name),
      retryCount: this.retryCount,
      url: this.context.page.url(),
    });
    await closeTraderaListingFormCategoryPicker({
      page: this.context.page,
      wait: this.waitForPicker,
    });
    await this.openListingForm();
    await this.acceptCategoryCookies();
  }

  private async drillAndRead(path: PickerItem[]): Promise<PickerItem[] | null> {
    if (this.drillSessionAborted) return null;

    let items = await this.drillAndReadOnce(path);
    if (items === null && !this.isBudgetExhausted()) {
      await this.resetListingFormForCategoryRetry(path);
      items = await this.drillAndReadOnce(path);
    }
    if (items === null) {
      this.drillFailureCount += 1;
      this.consecutiveDrillFailures += 1;
      this.lastFailedPath = path.map((p) => p.name);
      if (this.consecutiveDrillFailures >= MAX_CONSECUTIVE_DRILL_FAILURES) {
        this.drillSessionAborted = true;
        this.context.log?.('tradera.listing-form-category.drill-session-aborted', {
          drillFailureCount: this.drillFailureCount,
          lastFailedPath: this.lastFailedPath,
        });
      }
      return null;
    }

    this.consecutiveDrillFailures = 0;
    this.context.log?.('tradera.listing-form-category.drilled', {
      path: path.map((p) => p.name),
      found: items.length,
      url: this.context.page.url(),
    });
    return items;
  }

  private stepFinalize(): void {
    this.note('categories_finalize', 'Finalizing listing form category output.');
    this.result = {
      categories: Array.from(this.categoriesById.values()),
      categorySource: 'listing-form-picker',
      scrapedFrom: this.context.page.url(),
      diagnostics: this.diagnostics,
      crawlStats: {
        pagesVisited: this.pagesVisited,
        rootCount: this.rootItems.length,
        budgetExhausted: this.budgetExhausted,
        retryCount: this.retryCount,
        rootsSeededFromPublic: this.rootsSeededFromPublic,
        drillFailureCount: this.drillFailureCount,
        drillSessionAborted: this.drillSessionAborted,
        lastFailedPath: this.lastFailedPath,
        reauthAttempted: this.reauthAttempted,
        reauthSucceeded: this.reauthSucceeded,
      },
    };
    this.complete('categories_finalize', 'Listing form category output was prepared.');
  }

  private stepBrowserClose(): void {
    this.complete('browser_close', 'Browser scrape flow ended.');
  }
}
