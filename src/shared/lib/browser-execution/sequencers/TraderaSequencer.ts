/* eslint-disable complexity, max-depth, max-lines, max-lines-per-function, no-await-in-loop */
import { type Locator, type Page } from 'playwright';

import { logSystemEvent } from '@/shared/lib/observability/system-logger';

import { type StepId } from '../step-registry';
import {
  BRAND_SELECTORS,
  BUY_NOW_OPTION_LABELS,
  CATEGORY_FIELD_LABELS,
  COOKIE_ACCEPT_SELECTORS,
  CREATE_LISTING_TRIGGER_LABELS,
  CREATE_LISTING_TRIGGER_SELECTORS,
  DESCRIPTION_SELECTORS,
  DRAFT_IMAGE_REMOVE_SELECTORS,
  EAN_SELECTORS,
  FALLBACK_CATEGORY_PATH_SEGMENTS,
  HEIGHT_SELECTORS,
  IMAGE_INPUT_SELECTORS,
  IMAGE_UPLOAD_ERROR_SELECTORS,
  IMAGE_UPLOAD_PENDING_SELECTORS,
  LENGTH_SELECTORS,
  LISTING_FORMAT_FIELD_LABELS,
  LOGIN_FORM_SELECTORS,
  LOGIN_SUCCESS_SELECTORS,
  PRICE_SELECTORS,
  PUBLISH_SELECTORS,
  QUANTITY_SELECTORS,
  TITLE_SELECTORS,
  UPLOADED_IMAGE_PREVIEW_SELECTORS,
  WEIGHT_SELECTORS,
  WIDTH_SELECTORS,
} from '../selectors/tradera';
import {
  PlaywrightSequencer,
  type PlaywrightSequencerContext,
} from './PlaywrightSequencer';

type TraderaSequencerHelpers = {
  brand?: string;
  categoryPath?: string;
  description?: string;
  ean?: string;
  height?: number | string;
  imagePath?: string | string[];
  length?: number | string;
  price?: number | string;
  quantity?: number | string;
  title?: string;
  weight?: number | string;
  width?: number | string;
};

const DIRECT_SELL_URL = 'https://www.tradera.com/en/selling/new';
const LEGACY_SELL_URL = 'https://www.tradera.com/en/sell';

export class TraderaSequencer extends PlaywrightSequencer {
  constructor(context: PlaywrightSequencerContext) {
    super(context);
  }

  protected async executeStep(stepId: StepId): Promise<void> {
    const helpers = this.helpers;

    switch (stepId) {
      case 'browser_preparation':
        this.note(stepId, 'Applying browser viewport.');
        await this.context.page.setViewportSize({ width: 1_280, height: 800 });
        this.complete(stepId, 'Browser viewport prepared.');
        break;
      case 'browser_open':
        this.note(stepId, 'Opening Tradera home.');
        await this.context.page.goto('https://www.tradera.com', {
          waitUntil: 'domcontentloaded',
        });
        await this.waitForPageSettled();
        this.complete(stepId, 'Tradera home opened.');
        break;
      case 'cookie_accept':
        this.note(stepId, 'Checking cookie consent.');
        await this.acceptCookies(COOKIE_ACCEPT_SELECTORS);
        this.complete(stepId, 'Cookie consent checked.');
        break;
      case 'auth_check': {
        this.note(stepId, 'Validating stored Tradera session.');
        const isAuthenticated = await this.checkAuthStatus(this.context.page);
        if (!isAuthenticated) {
          throw new Error('AUTH_REQUIRED: Tradera session not found.');
        }
        this.complete(stepId, 'Stored Tradera session is valid.');
        break;
      }
      case 'sell_page_open':
        this.note(stepId, 'Opening the Tradera listing editor.');
        await this.openSellPage();
        this.complete(stepId, 'Tradera listing editor is ready.');
        break;
      case 'title_fill': {
        const title = this.toText(helpers.title) ?? 'Default Title';
        await this.fillField(TITLE_SELECTORS, title, {
          fieldLabel: 'title',
          stepId,
        });
        this.complete(stepId, 'Title applied.');
        break;
      }
      case 'description_fill': {
        const description = this.toText(helpers.description) ?? 'Default Description';
        await this.fillField(DESCRIPTION_SELECTORS, description, {
          fieldLabel: 'description',
          stepId,
        });
        this.complete(stepId, 'Description applied.');
        break;
      }
      case 'listing_format_select':
        await this.chooseBuyNowListingFormat(stepId);
        this.complete(stepId, 'Buy-now listing format selected.');
        break;
      case 'price_set': {
        const price = this.toText(helpers.price) ?? '0';
        await this.fillField(PRICE_SELECTORS, price, {
          fieldLabel: 'price',
          normalize: this.normalizeNumericValue,
          stepId,
        });

        const quantity = this.toText(helpers.quantity);
        if (quantity !== null && Number(quantity) > 1) {
          await this.fillField(QUANTITY_SELECTORS, quantity, {
            fieldLabel: 'quantity',
            stepId,
          });
        }

        this.complete(
          stepId,
          quantity !== null && Number(quantity) > 1 ? 'Price and quantity applied.' : 'Price applied.'
        );
        break;
      }
      case 'image_cleanup': {
        this.note(stepId, 'Removing existing draft images.');
        const removedCount = await this.removeDraftImages();
        this.complete(
          stepId,
          removedCount > 0 ? `Removed ${removedCount} draft image${removedCount === 1 ? '' : 's'}.` : 'No draft images were present.'
        );
        break;
      }
      case 'image_upload': {
        const imagePaths = this.normalizeImagePaths(helpers.imagePath);
        if (imagePaths.length === 0) {
          this.complete(stepId, 'No images supplied.');
          break;
        }

        this.note(stepId, `Uploading ${imagePaths.length} image${imagePaths.length === 1 ? '' : 's'}.`);
        await this.uploadImages(imagePaths);
        this.complete(stepId, 'Images uploaded.');
        break;
      }
      case 'category_select': {
        const selectedCategoryPath = await this.selectCategoryPath(stepId, helpers.categoryPath);
        this.complete(stepId, `Category applied: ${selectedCategoryPath}.`);
        break;
      }
      case 'attribute_select': {
        const completedFields: string[] = [];
        const ean = this.toText(helpers.ean);
        if (ean !== null) {
          await this.fillField(EAN_SELECTORS, ean, { fieldLabel: 'ean', stepId });
          completedFields.push('EAN');
        }

        const brand = this.toText(helpers.brand);
        if (brand !== null) {
          await this.fillField(BRAND_SELECTORS, brand, {
            fieldLabel: 'brand',
            stepId,
          });
          completedFields.push('brand');
        }

        this.complete(
          stepId,
          completedFields.length > 0
            ? `Updated ${completedFields.join(' and ')}.`
            : 'No optional attributes supplied.'
        );
        break;
      }
      case 'shipping_set': {
        const completedFields: string[] = [];

        const fillDimension = async (
          value: string | null,
          selectors: readonly string[],
          fieldLabel: string
        ): Promise<void> => {
          if (value === null) return;
          await this.fillField(selectors, value, { fieldLabel, stepId });
          completedFields.push(fieldLabel);
        };

        await fillDimension(this.toText(helpers.weight), WEIGHT_SELECTORS, 'weight');
        await fillDimension(this.toText(helpers.width), WIDTH_SELECTORS, 'width');
        await fillDimension(this.toText(helpers.length), LENGTH_SELECTORS, 'length');
        await fillDimension(this.toText(helpers.height), HEIGHT_SELECTORS, 'height');

        this.complete(
          stepId,
          completedFields.length > 0
            ? `Updated ${completedFields.join(', ')}.`
            : 'No shipping dimensions supplied.'
        );
        break;
      }
      case 'publish':
        await this.publishListing(stepId);
        this.complete(stepId, 'Publish flow triggered.');
        break;
      default:
        await logSystemEvent({
          level: 'warn',
          source: 'TraderaSequencer',
          message: `Step ${stepId} not implemented for TraderaSequencer.`,
        });
    }
  }

  private get helpers(): TraderaSequencerHelpers {
    return (this.context.helpers as TraderaSequencerHelpers | undefined) ?? {};
  }

  private note(stepId: StepId, message: string): void {
    this.context.tracker.start(stepId, message);
  }

  private complete(stepId: StepId, message: string): void {
    this.context.tracker.succeed(stepId, message);
  }

  private toText(value: string | number | null | undefined): string | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeNumericValue(value: string): string {
    return value.replace(/\s+/g, '').replace(',', '.').trim();
  }

  private normalizeImagePaths(value: string | string[] | undefined): string[] {
    let rawValues: string[] = [];
    if (Array.isArray(value)) {
      rawValues = value;
    } else if (typeof value === 'string') {
      rawValues = [value];
    }

    return rawValues
      .map((entry) => this.toText(entry))
      .filter((entry): entry is string => entry !== null);
  }

  private async waitForPageSettled(): Promise<void> {
    const { page } = this.context;
    if (typeof page.waitForLoadState !== 'function') {
      return;
    }

    await page.waitForLoadState('domcontentloaded').catch(() => undefined);
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
  }

  private async findVisibleLocator(
    selectors: readonly string[],
    options: { timeoutMs?: number } = {}
  ): Promise<Locator | null> {
    const { page } = this.context;
    const deadline = Date.now() + (options.timeoutMs ?? 1_500);

    while (Date.now() <= deadline) {
      for (const selector of selectors) {
        const locator = page.locator(selector).first();
        const count = await locator.count().catch(() => 0);
        if (count === 0) {
          continue;
        }

        const visible = await locator.isVisible().catch(() => false);
        if (visible) {
          return locator;
        }
      }

      await this.wait(150);
    }

    return null;
  }

  private async findAttachedLocator(
    selectors: readonly string[],
    options: { timeoutMs?: number } = {}
  ): Promise<Locator | null> {
    const { page } = this.context;
    const deadline = Date.now() + (options.timeoutMs ?? 1_500);

    while (Date.now() <= deadline) {
      for (const selector of selectors) {
        const locator = page.locator(selector).first();
        const count = await locator.count().catch(() => 0);
        if (count > 0) {
          return locator;
        }
      }

      await this.wait(150);
    }

    return null;
  }

  private async findFirstNamedControl(
    labels: readonly string[],
    roles: ReadonlyArray<'button' | 'link' | 'tab' | 'menuitem' | 'option' | 'combobox'>,
    timeoutMs = 1_500
  ): Promise<Locator | null> {
    const { page } = this.context;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() <= deadline) {
      for (const label of labels) {
        for (const role of roles) {
          const locator = page.getByRole(role, { name: label }).first();
          const visible = await locator.isVisible().catch(() => false);
          if (visible) {
            return locator;
          }
        }
      }

      await this.wait(150);
    }

    return null;
  }

  private async readControlValue(locator: Locator): Promise<string> {
    const inputValue = await locator.inputValue().catch(() => null);
    if (typeof inputValue === 'string') {
      return inputValue;
    }

    return (await locator.textContent().catch(() => '')) ?? '';
  }

  private async fillField(
    selectors: readonly string[],
    value: string,
    options: {
      fieldLabel: string;
      normalize?: (value: string) => string;
      stepId: StepId;
    }
  ): Promise<void> {
    const locator = await this.findVisibleLocator(selectors, { timeoutMs: 5_000 });
    if (!locator) {
      throw new Error(`FAIL_${options.fieldLabel.toUpperCase()}_SET: No field matched selectors: ${selectors.join(', ')}`);
    }

    const normalize = options.normalize ?? ((candidate: string) => candidate.trim());
    const expectedValue = normalize(value);
    this.note(options.stepId, `Applying ${options.fieldLabel}.`);

    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.fill('');
    await locator.fill(value);

    const appliedValue = normalize(await this.readControlValue(locator));
    if (appliedValue !== expectedValue) {
      throw new Error(
        `FAIL_${options.fieldLabel.toUpperCase()}_SET: ${options.fieldLabel} field did not retain the expected value.`
      );
    }
  }

  private async openSellPage(): Promise<void> {
    const { page } = this.context;

    await page.goto(DIRECT_SELL_URL, { waitUntil: 'domcontentloaded' });
    await this.waitForPageSettled();
    if (await this.isListingEditorReady()) {
      return;
    }

    await page.goto(LEGACY_SELL_URL, { waitUntil: 'domcontentloaded' });
    await this.waitForPageSettled();
    if (await this.isListingEditorReady()) {
      return;
    }

    const trigger =
      (await this.findVisibleLocator(CREATE_LISTING_TRIGGER_SELECTORS, {
        timeoutMs: 2_000,
      })) ??
      (await this.findFirstNamedControl(CREATE_LISTING_TRIGGER_LABELS, ['button', 'link'], 2_000));

    if (!trigger) {
      throw new Error('FAIL_SELL_PAGE_OPEN: Could not find the create-listing trigger.');
    }

    await trigger.scrollIntoViewIfNeeded().catch(() => undefined);
    await trigger.click().catch(() => undefined);
    await this.waitForPageSettled();

    if (!(await this.isListingEditorReady())) {
      throw new Error('FAIL_SELL_PAGE_OPEN: Tradera listing editor did not become ready.');
    }
  }

  private async isListingEditorReady(): Promise<boolean> {
    const editorReady = await this.findVisibleLocator(
      [...TITLE_SELECTORS, ...PRICE_SELECTORS, ...PUBLISH_SELECTORS],
      { timeoutMs: 2_500 }
    );

    return Boolean(editorReady);
  }

  private async chooseBuyNowListingFormat(stepId: StepId): Promise<void> {
    this.note(stepId, 'Selecting the buy-now listing format.');

    const listingFormatTrigger = await this.findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS);
    if (!listingFormatTrigger) {
      const editorReadyWithoutTrigger = await this.findVisibleLocator(
        [...PRICE_SELECTORS, ...PUBLISH_SELECTORS],
        { timeoutMs: 1_500 }
      );

      if (editorReadyWithoutTrigger) {
        return;
      }

      throw new Error('FAIL_LISTING_FORMAT_SET: Listing format trigger not found.');
    }

    await listingFormatTrigger.scrollIntoViewIfNeeded().catch(() => undefined);
    await listingFormatTrigger.click().catch(() => undefined);
    await this.waitForPageSettled();

    for (const optionLabel of BUY_NOW_OPTION_LABELS) {
      const option = await this.findFirstNamedControl([optionLabel], ['menuitem', 'option', 'button'], 1_000);
      if (!option) {
        continue;
      }

      await option.scrollIntoViewIfNeeded().catch(() => undefined);
      await option.click().catch(() => undefined);
      await this.waitForPageSettled();
      return;
    }

    throw new Error('FAIL_LISTING_FORMAT_SET: Buy-now listing format option not found.');
  }

  private async findFieldTriggerByLabels(labels: readonly string[]): Promise<Locator | null> {
    const { page } = this.context;

    const namedTrigger = await this.findFirstNamedControl(labels, ['button', 'combobox'], 1_500);
    if (namedTrigger !== null) {
      return namedTrigger;
    }

    for (const label of labels) {
      const candidates = [
        page.locator(`[aria-label*="${label}"]`).first(),
        page.locator(`button:has-text("${label}")`).first(),
        page.locator(`[role="combobox"]:has-text("${label}")`).first(),
      ];

      for (const candidate of candidates) {
        const visible = await candidate.isVisible().catch(() => false);
        if (visible) {
          return candidate;
        }
      }
    }

    return null;
  }

  private async selectCategoryPath(stepId: StepId, requestedPath?: string): Promise<string> {
    const requestedSegments =
      requestedPath
        ?.split('>')
        .map((segment) => segment.trim())
        .filter(Boolean) ?? [];

    const candidatePaths = [
      requestedSegments.length > 0 ? requestedSegments : null,
      [...FALLBACK_CATEGORY_PATH_SEGMENTS],
    ].filter((candidate): candidate is string[] => Array.isArray(candidate));

    const categoryTrigger = await this.findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);
    if (!categoryTrigger) {
      throw new Error('FAIL_CATEGORY_SET: Category selector trigger not found.');
    }

    for (const segments of candidatePaths) {
      this.note(stepId, `Selecting category path: ${segments.join(' > ')}.`);
      await categoryTrigger.scrollIntoViewIfNeeded().catch(() => undefined);
      await categoryTrigger.click().catch(() => undefined);
      await this.waitForCategoryPickerSettled();

      const selected = await this.trySelectCategorySegments(segments);
      if (selected) {
        return segments.join(' > ');
      }

      await this.context.page.keyboard.press('Escape').catch(() => undefined);
      await this.wait(150);
    }

    throw new Error(
      `FAIL_CATEGORY_SET: Unable to resolve category path "${requestedPath ?? FALLBACK_CATEGORY_PATH_SEGMENTS.join(' > ')}".`
    );
  }

  private async trySelectCategorySegments(segments: readonly string[]): Promise<boolean> {
    for (const segment of segments) {
      const option = await this.findFirstNamedControl([segment], ['menuitem', 'option', 'button', 'link'], 1_500);
      if (!option) {
        return false;
      }

      await option.scrollIntoViewIfNeeded().catch(() => undefined);
      await option.click().catch(() => undefined);
      await this.waitForCategoryPickerSettled();
    }

    return true;
  }

  private async waitForCategoryPickerSettled(): Promise<void> {
    await this.waitForPageSettled();
    await this.wait(250);
  }

  private async removeDraftImages(): Promise<number> {
    let removedCount = 0;

    while (removedCount < 12) {
      const removeButton = await this.findVisibleLocator(DRAFT_IMAGE_REMOVE_SELECTORS, {
        timeoutMs: 500,
      });

      if (!removeButton) {
        break;
      }

      await removeButton.scrollIntoViewIfNeeded().catch(() => undefined);
      await removeButton.click().catch(() => undefined);
      await this.waitForPageSettled();
      removedCount += 1;
    }

    return removedCount;
  }

  private async uploadImages(imagePaths: string[]): Promise<void> {
    const { page } = this.context;
    const imageInput = await this.findAttachedLocator(IMAGE_INPUT_SELECTORS, {
      timeoutMs: 5_000,
    });

    if (!imageInput) {
      throw new Error('FAIL_IMAGE_SET: Image input was not found.');
    }

    await imageInput.setInputFiles(imagePaths);
    await this.waitForUploadCompletion(imagePaths.length);

    const previewCount = await page
      .locator(UPLOADED_IMAGE_PREVIEW_SELECTORS.join(', '))
      .count()
      .catch(() => 0);
    if (previewCount <= 0) {
      throw new Error('FAIL_IMAGE_SET: Uploaded image previews were not detected.');
    }
  }

  private async waitForUploadCompletion(expectedPreviewCount: number): Promise<void> {
    const { page } = this.context;
    const deadline = Date.now() + 20_000;

    while (Date.now() <= deadline) {
      const uploadError = await this.findVisibleLocator(IMAGE_UPLOAD_ERROR_SELECTORS, {
        timeoutMs: 250,
      });
      if (uploadError) {
        throw new Error('FAIL_IMAGE_SET: Tradera reported an image upload error.');
      }

      const pendingIndicator = await this.findVisibleLocator(IMAGE_UPLOAD_PENDING_SELECTORS, {
        timeoutMs: 250,
      });
      const previewCount = await page
        .locator(UPLOADED_IMAGE_PREVIEW_SELECTORS.join(', '))
        .count()
        .catch(() => 0);

      if (previewCount >= expectedPreviewCount && !pendingIndicator) {
        return;
      }

      await this.wait(300);
    }

    throw new Error('FAIL_IMAGE_SET: Timed out while waiting for uploaded image previews.');
  }

  private async publishListing(stepId: StepId): Promise<void> {
    this.note(stepId, 'Submitting the listing for publication.');

    const publishButton = await this.findVisibleLocator(PUBLISH_SELECTORS, {
      timeoutMs: 5_000,
    });

    if (!publishButton) {
      await this.captureArtifacts('tradera-publish-failed');
      throw new Error('FAIL_PUBLISH: Publish button not found.');
    }

    await publishButton.scrollIntoViewIfNeeded().catch(() => undefined);
    await publishButton.click().catch(() => undefined);
    await this.waitForPageSettled();
  }

  private async checkAuthStatus(page: Page): Promise<boolean> {
    const loginSuccess = await this.findVisibleLocator(LOGIN_SUCCESS_SELECTORS, {
      timeoutMs: 2_000,
    });
    if (loginSuccess !== null) {
      return true;
    }

    if (await this.isListingEditorReady()) {
      return true;
    }

    if (page.url().includes('/my/')) {
      return true;
    }

    const loginForm = await this.findVisibleLocator(LOGIN_FORM_SELECTORS, {
      timeoutMs: 1_000,
    });
    if (loginForm !== null || page.url().includes('/login')) {
      return false;
    }

    return false;
  }
}
