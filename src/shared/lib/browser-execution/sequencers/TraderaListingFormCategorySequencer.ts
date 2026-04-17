import { type StepId } from '../step-registry';
import { PlaywrightSequencer, type PlaywrightSequencerContext } from './PlaywrightSequencer';
import type { TraderaCategorySequencerResult } from './TraderaCategorySequencer';

// ─── Constants ──────────────────────────────────────────────────────────────

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

const CATEGORY_TRIGGER_LABELS = ['Category', 'Kategori'] as const;
const PICKER_SELECTOR = '[data-test-category-chooser="true"]';
const AUTH_FAIL_URL_HINTS = ['/login', '/captcha', '/challenge', '/verification', '/verify'] as const;
const AUTH_FAIL_SELECTORS = [
  'form[action*="login"]',
  'input[type="password"]',
] as const;

const TOTAL_BUDGET_MS = 270_000;
const PICKER_SETTLE_MS = 700;
const ITEM_CLICK_SETTLE_MS = 500;
const MAX_DEPTH = 3;

// ─── Types ──────────────────────────────────────────────────────────────────

type PickerItem = {
  name: string;
  id: string;
};

type CategoryEntry = {
  id: string;
  name: string;
  parentId: string;
};

export type TraderaListingFormCategorySequencerInput = {
  listingFormUrl: string;
};

// ─── Sequencer ──────────────────────────────────────────────────────────────

export class TraderaListingFormCategorySequencer extends PlaywrightSequencer {
  private readonly listingFormUrl: string;

  private rootItems: PickerItem[] = [];
  private categoriesById = new Map<string, CategoryEntry>();
  private crawlStartTime = 0;
  private pagesVisited = 0;
  private budgetExhausted = false;

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
      case 'categories_finalize': await this.stepFinalize(); return;
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

  // ─── Picker helpers ────────────────────────────────────────────────────────

  private async isPickerVisible(): Promise<boolean> {
    return this.context.page.locator(PICKER_SELECTOR).first().isVisible().catch(() => false);
  }

  private async openCategoryPicker(): Promise<boolean> {
    const { page } = this.context;

    // Try ARIA role first (button or combobox labeled "Category"/"Kategori")
    for (const label of CATEGORY_TRIGGER_LABELS) {
      for (const role of ['button', 'combobox'] as const) {
        const trigger = page.getByRole(role, { name: label }).first();
        if (await trigger.isVisible({ timeout: 1_000 }).catch(() => false)) {
          await trigger.click();
          await this.wait(PICKER_SETTLE_MS);
          if (await this.isPickerVisible()) return true;
        }
      }
    }

    // Fallback: XPath by label text → adjacent trigger
    for (const label of CATEGORY_TRIGGER_LABELS) {
      const escaped = label.replace(/"/g, '\\"');
      const trigger = page
        .locator(
          `xpath=//*[normalize-space(text())="${escaped}"]/following::*[self::button or @role="button" or @role="combobox"][1]`
        )
        .first();
      if (await trigger.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await trigger.click();
        await this.wait(PICKER_SETTLE_MS);
        if (await this.isPickerVisible()) return true;
      }
    }

    return false;
  }

  private async closePicker(): Promise<void> {
    await this.context.page.keyboard.press('Escape').catch(() => undefined);
    await this.wait(350);
  }

  private async readPickerItems(): Promise<PickerItem[]> {
    const { page } = this.context;
    return page
      .evaluate((pickerSel) => {
        const picker = document.querySelector(pickerSel);
        if (!picker) return [] as Array<{ name: string; id: string }>;

        const toText = (value: unknown): string =>
          typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

        const seen = new Set<string>();
        const results: Array<{ name: string; id: string }> = [];

        const candidates = picker.querySelectorAll('[role="menuitem"], [role="option"], [role="radio"]');
        for (const el of candidates) {
          const name = toText(el.textContent ?? '');
          if (!name || seen.has(name.toLowerCase())) continue;
          seen.add(name.toLowerCase());

          const id =
            el.getAttribute('data-id') ??
            el.getAttribute('data-category-id') ??
            el.getAttribute('data-value') ??
            el.getAttribute('value') ??
            el.getAttribute('id') ??
            '';

          results.push({ name, id });
        }

        return results;
      }, PICKER_SELECTOR)
      .catch(() => []);
  }

  private async clickPickerItemByName(name: string): Promise<boolean> {
    const { page } = this.context;
    const picker = page.locator(PICKER_SELECTOR).first();

    // Exact name match via getByRole
    const byRole = picker.getByRole('menuitem', { name, exact: true }).first();
    if (await byRole.isVisible({ timeout: 800 }).catch(() => false)) {
      await byRole.click();
      await this.wait(ITEM_CLICK_SETTLE_MS);
      return true;
    }

    // Partial / text match fallback
    const byText = picker.locator(`[role="menuitem"], [role="option"]`).filter({ hasText: name }).first();
    if (await byText.isVisible({ timeout: 500 }).catch(() => false)) {
      await byText.scrollIntoViewIfNeeded().catch(() => undefined);
      await byText.click();
      await this.wait(ITEM_CLICK_SETTLE_MS);
      return true;
    }

    return false;
  }

  private async tryClickPickerBack(): Promise<boolean> {
    const { page } = this.context;
    const picker = page.locator(PICKER_SELECTOR).first();

    for (const sel of [
      '[data-test-category-back]',
      '[aria-label*="back" i]',
      '[aria-label*="Back"]',
      '[aria-label*="tillbaka" i]',
      'button:has([class*="back"])',
      'button:has([class*="arrow-left"])',
      'button:has([class*="chevron-left"])',
      '[class*="back-button"]',
    ]) {
      const btn = picker.locator(sel).first();
      if (await btn.isVisible({ timeout: 300 }).catch(() => false)) {
        await btn.click();
        await this.wait(400);
        return true;
      }
    }

    return false;
  }

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
    return parentId ? `${parentId}:${slug}` : `lf:${slug}`;
  }

  private resolveId(item: PickerItem, parentId: string): string {
    return item.id.length > 0 ? item.id : this.buildId(item.name, parentId);
  }

  private addCategory(id: string, name: string, parentId: string): void {
    if (!this.categoriesById.has(id)) {
      this.categoriesById.set(id, { id, name, parentId });
    }
  }

  // ─── Auth check ────────────────────────────────────────────────────────────

  private async isOnAuthPage(): Promise<boolean> {
    const { page } = this.context;
    const url = page.url().toLowerCase();
    if (AUTH_FAIL_URL_HINTS.some((hint) => url.includes(hint))) return true;

    for (const sel of AUTH_FAIL_SELECTORS) {
      const visible = await page.locator(sel).first().isVisible({ timeout: 500 }).catch(() => false);
      if (visible) return true;
    }

    return false;
  }

  // ─── Step implementations ──────────────────────────────────────────────────

  private async stepBrowserPreparation(): Promise<void> {
    const config = this.getStepConfig('browser_preparation');
    const { page } = this.context;
    if (typeof page.setViewportSize === 'function') {
      await page.setViewportSize({
        width: config.viewportWidth ?? 1_280,
        height: config.viewportHeight ?? 900,
      });
      if (config.settleDelayMs !== null && config.settleDelayMs !== undefined && config.settleDelayMs > 0) {
        await this.wait(config.settleDelayMs);
      }
    }
    this.complete('browser_preparation', 'Browser settings were prepared.');
  }

  private async stepBrowserOpen(): Promise<void> {
    const { page } = this.context;
    await page.goto(this.listingFormUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await this.wait(1_500);
    this.complete('browser_open', 'Tradera listing form opened.');
  }

  private async stepCookieAccept(): Promise<void> {
    const { page } = this.context;
    let accepted = false;
    for (const selector of COOKIE_ACCEPT_SELECTORS) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        await locator.click().catch(() => undefined);
        await this.wait(600);
        accepted = true;
        break;
      }
    }
    this.complete(
      'cookie_accept',
      accepted ? 'Cookie consent was handled.' : 'No cookie banner detected.'
    );
  }

  private async stepSeedExtract(): Promise<void> {
    this.note('categories_seed_extract', 'Opening category picker to read top-level categories.');

    if (await this.isOnAuthPage()) {
      this.context.tracker.fail(
        'categories_seed_extract',
        'Tradera login is required before fetching listing form categories.'
      );
      this.skip('categories_crawl', 'Skipped because authentication failed.');
      this.skip('categories_finalize', 'Skipped because authentication failed.');
      this.skip('browser_close', 'Browser scrape flow ended.');
      this.result = {
        categories: [],
        categorySource: 'listing-form-picker',
        scrapedFrom: this.context.page.url(),
        diagnostics: { reason: 'auth_required', formUrl: this.listingFormUrl },
        crawlStats: { pagesVisited: 0, rootCount: 0 },
      };
      return;
    }

    const opened = await this.openCategoryPicker();
    if (!opened) {
      this.context.tracker.fail(
        'categories_seed_extract',
        'Could not locate the category picker trigger on the listing form.'
      );
      this.skip('categories_crawl', 'Skipped because category picker could not be opened.');
      this.skip('categories_finalize', 'Skipped because category picker could not be opened.');
      this.skip('browser_close', 'Browser scrape flow ended.');
      this.result = {
        categories: [],
        categorySource: 'listing-form-picker',
        scrapedFrom: this.context.page.url(),
        diagnostics: { reason: 'picker_not_found', formUrl: this.listingFormUrl },
        crawlStats: { pagesVisited: 0, rootCount: 0 },
      };
      return;
    }

    this.rootItems = await this.readPickerItems();
    await this.closePicker();

    this.crawlStartTime = Date.now();

    for (const item of this.rootItems) {
      const id = this.resolveId(item, '0');
      this.addCategory(id, item.name, '0');
    }

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

    let totalVisited = 0;

    for (const l1Item of this.rootItems) {
      if (this.isBudgetExhausted()) {
        this.budgetExhausted = true;
        break;
      }

      const l1Id = this.resolveId(l1Item, '0');
      const l2Items = await this.drillAndRead([l1Item]);
      totalVisited += 1;

      if (l2Items === null) {
        continue;
      }

      for (const l2Item of l2Items) {
        const l2Id = this.resolveId(l2Item, l1Id);
        this.addCategory(l2Id, l2Item.name, l1Id);
      }

      if (this.isBudgetExhausted() || l2Items.length === 0) {
        if (l2Items.length === 0) continue;
        this.budgetExhausted = true;
        break;
      }

      for (const l2Item of l2Items) {
        if (this.isBudgetExhausted()) {
          this.budgetExhausted = true;
          break;
        }

        const l2Id = this.resolveId(l2Item, l1Id);
        const l3Items = await this.drillAndRead([l1Item, l2Item]);
        totalVisited += 1;

        if (l3Items === null || l3Items.length === 0) {
          continue;
        }

        for (const l3Item of l3Items) {
          const l3Id = this.resolveId(l3Item, l2Id);
          this.addCategory(l3Id, l3Item.name, l2Id);
        }

        if (MAX_DEPTH > 3) {
          for (const l3Item of l3Items) {
            if (this.isBudgetExhausted()) break;
            const l3Id = this.resolveId(l3Item, l2Id);
            const l4Items = await this.drillAndRead([l1Item, l2Item, l3Item]);
            totalVisited += 1;
            if (l4Items === null || l4Items.length === 0) continue;
            for (const l4Item of l4Items) {
              const l4Id = this.resolveId(l4Item, l3Id);
              this.addCategory(l4Id, l4Item.name, l3Id);
            }
          }
        }
      }
    }

    this.pagesVisited = totalVisited;

    const message = this.budgetExhausted
      ? `Category crawl stopped at budget limit after ${String(totalVisited)} picker interactions.`
      : `Category crawl completed across ${String(totalVisited)} picker interactions.`;

    this.complete('categories_crawl', message);
  }

  private async drillAndRead(path: PickerItem[]): Promise<PickerItem[] | null> {
    const { page } = this.context;

    const opened = await this.openCategoryPicker();
    if (!opened) return null;

    for (const item of path) {
      const clicked = await this.clickPickerItemByName(item.name);
      if (!clicked) {
        await this.closePicker();
        return null;
      }

      const pickerStillOpen = await this.isPickerVisible();
      if (!pickerStillOpen) {
        return null;
      }

      const wentBack = await this.tryClickPickerBack();
      if (wentBack) {
        this.context.log?.('tradera.listing-form-category.picker-back', {
          atItem: item.name,
        });
      }
    }

    const items = await this.readPickerItems();
    await this.closePicker();

    this.context.log?.('tradera.listing-form-category.drilled', {
      path: path.map((p) => p.name),
      found: items.length,
      url: page.url(),
    });

    return items;
  }

  private async stepFinalize(): Promise<void> {
    const { page } = this.context;
    this.note('categories_finalize', 'Finalizing listing form category output.');

    const categories = Array.from(this.categoriesById.values());

    this.result = {
      categories,
      categorySource: 'listing-form-picker',
      scrapedFrom: page.url(),
      diagnostics: null,
      crawlStats: {
        pagesVisited: this.pagesVisited,
        rootCount: this.rootItems.length,
        budgetExhausted: this.budgetExhausted,
      },
    };

    this.complete('categories_finalize', 'Listing form category output was prepared.');
  }

  private stepBrowserClose(): void {
    this.complete('browser_close', 'Browser scrape flow ended.');
  }
}
