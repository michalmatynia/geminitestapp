import { type StepId } from '../step-registry';
import { PlaywrightSequencer, type PlaywrightSequencerContext } from './PlaywrightSequencer';
import type { TraderaCategorySequencerResult } from './TraderaCategorySequencer';
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

const TOTAL_BUDGET_MS = 270_000;

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
};

export class TraderaListingFormCategorySequencer extends PlaywrightSequencer {
  private readonly listingFormUrl: string;

  private rootItems: PickerItem[] = [];
  private categoriesById = new Map<string, CategoryEntry>();
  private crawlStartTime = 0;
  private pagesVisited = 0;
  private budgetExhausted = false;
  private retryCount = 0;
  private diagnostics: Record<string, unknown> | null = null;

  public result: TraderaCategorySequencerResult | null = null;

  constructor(
    context: PlaywrightSequencerContext,
    input: TraderaListingFormCategorySequencerInput
  ) {
    super(context);
    this.listingFormUrl = input.listingFormUrl;
  }

  protected async executeStep(stepId: StepId): Promise<void> {
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
      if (config.settleDelayMs > 0) {
        await this.wait(config.settleDelayMs);
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
    const accepted = await this.acceptCookies();
    this.complete(
      'cookie_accept',
      accepted ? 'Cookie consent was handled.' : 'No cookie banner detected.'
    );
  }

  private async acceptCookies(): Promise<boolean> {
    return acceptTraderaListingFormCategoryCookies({
      page: this.context.page,
      wait: this.waitForPicker,
    });
  }

  private async stepSeedExtract(): Promise<void> {
    this.note('categories_seed_extract', 'Opening category picker to read top-level categories.');

    if (await isOnTraderaListingFormAuthPage(this.context.page)) {
      this.context.tracker.fail(
        'categories_seed_extract',
        'Tradera login is required before fetching listing form categories.'
      );
      this.setEmptyResult({
        diagnostics: { reason: 'auth_required', formUrl: this.listingFormUrl },
        crawlStats: { pagesVisited: 0, rootCount: 0 },
      });
      return;
    }

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
    }
    await closeTraderaListingFormCategoryPicker({
      page: this.context.page,
      wait: this.waitForPicker,
    });

    this.crawlStartTime = Date.now();
    this.addRootCategories();
    this.complete(
      'categories_seed_extract',
      `Found ${String(this.rootItems.length)} top-level categories.`
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
    const items = await drillAndReadTraderaListingFormCategoryPath({
      page: this.context.page,
      path,
      wait: this.waitForPicker,
    });
    const parent = path.at(-1);
    if (parent === undefined) return items;

    if (items === null || items.length === 0) {
      const publicItems = await fetchTraderaPublicCategoryChildItemsForPath(path).catch(
        () => []
      );
      return publicItems.length > 0 ? publicItems : items;
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
    await this.acceptCookies();
  }

  private async drillAndRead(path: PickerItem[]): Promise<PickerItem[] | null> {
    let items = await this.drillAndReadOnce(path);
    if (items === null && !this.isBudgetExhausted()) {
      await this.resetListingFormForCategoryRetry(path);
      items = await this.drillAndReadOnce(path);
    }
    if (items === null) return null;

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
      },
    };
    this.complete('categories_finalize', 'Listing form category output was prepared.');
  }

  private stepBrowserClose(): void {
    this.complete('browser_close', 'Browser scrape flow ended.');
  }
}
