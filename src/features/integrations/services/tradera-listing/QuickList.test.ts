import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validatePlaywrightNodeScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';

const {
  getProductByIdMock,
  runPlaywrightListingScriptMock,
  runPlaywrightScrapeScriptMock,
  updateConnectionMock,
  accessMock,
  copyFileMock,
  mkdtempMock,
  statMock,
  getCategoryByIdMock,
  listCategoryMappingsMock,
  listCategoriesMock,
  resolveTraderaShippingGroupResolutionForProductMock,
  resolveTraderaListingPriceForProductMock,
  resolveConnectionPlaywrightSettingsMock,
  listParametersMock,
} = vi.hoisted(() => ({
  getProductByIdMock: vi.fn(),
  runPlaywrightListingScriptMock: vi.fn().mockResolvedValue({
    runId: 'run-stable',
    status: 'success',
    externalListingId: 'listing-stable',
    listingUrl: 'https://www.tradera.com/item/stable',
    publishVerified: true,
    logs: [],
    rawResult: {},
  }),
  runPlaywrightScrapeScriptMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  accessMock: vi.fn(),
  copyFileMock: vi.fn(),
  mkdtempMock: vi.fn(),
  statMock: vi.fn(),
  getCategoryByIdMock: vi.fn(),
  listCategoryMappingsMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  resolveTraderaShippingGroupResolutionForProductMock: vi.fn(),
  resolveTraderaListingPriceForProductMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
  listParametersMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: (...args: unknown[]) => accessMock(...args),
  copyFile: (...args: unknown[]) => copyFileMock(...args),
  mkdtemp: (...args: unknown[]) => mkdtempMock(...args),
  stat: (...args: unknown[]) => statMock(...args),
  default: {
    access: (...args: unknown[]) => accessMock(...args),
    copyFile: (...args: unknown[]) => copyFileMock(...args),
    mkdtemp: (...args: unknown[]) => mkdtempMock(...args),
    stat: (...args: unknown[]) => statMock(...args),
  },
}));

vi.mock('@/shared/lib/security/encryption', () => ({
  decryptSecret: (value: string) => `decrypted:${value}`,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: async () => ({
    getProductById: getProductByIdMock,
  }),
}));

vi.mock('@/features/products/server', () => ({
  getParameterRepository: async () => ({
    listParameters: (...args: unknown[]) => listParametersMock(...args),
  }),
}));

vi.mock('../integration-repository', () => ({
  getIntegrationRepository: async () => ({
    updateConnection: updateConnectionMock,
  }),
}));

vi.mock('../category-mapping-repository', () => ({
  getCategoryMappingRepository: () => ({
    listByConnection: listCategoryMappingsMock,
  }),
}));

vi.mock('@/shared/lib/products/services/category-repository', () => ({
  getCategoryRepository: async () => ({
    getCategoryById: getCategoryByIdMock,
    listCategories: listCategoriesMock,
  }),
}));

vi.mock('@/features/playwright/server', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/playwright/server')>(
      '@/features/playwright/server'
    );
  return {
    ...actual,
    runPlaywrightListingScript: (...args: unknown[]) =>
      runPlaywrightListingScriptMock(...args) as Promise<unknown>,
    runPlaywrightScrapeScript: (...args: unknown[]) =>
      runPlaywrightScrapeScriptMock(...args) as Promise<unknown>,
    createTraderaListingStatusScrapePlaywrightInstance: (
      input: Record<string, unknown> = {}
    ) => ({
      kind: 'tradera_listing_status_scrape',
      family: 'scrape',
      label: 'Tradera listing status scrape',
      tags: ['integration', 'tradera', 'status', 'scrape'],
      ...input,
    }),
  };
});

vi.mock('@/features/integrations/services/tradera-playwright-settings', () => ({
  resolveConnectionPlaywrightSettings: (...args: unknown[]) =>
    resolveConnectionPlaywrightSettingsMock(...args) as Promise<unknown>,
  parsePersistedStorageState: vi.fn(),
}));

vi.mock('./shipping-group', () => ({
  resolveTraderaShippingGroupResolutionForProduct: (...args: unknown[]) =>
    resolveTraderaShippingGroupResolutionForProductMock(...args),
}));

vi.mock('./price', () => ({
  resolveTraderaListingPriceForProduct: (...args: unknown[]) =>
    resolveTraderaListingPriceForProductMock(...args),
}));

import { ensureLoggedIn, runTraderaBrowserCheckStatus, runTraderaBrowserListing } from './browser';
import {
  LOGIN_SUCCESS_SELECTOR,
  TRADERA_AUTH_ERROR_SELECTORS,
} from './config';
import { TRADERA_SUCCESS_SELECTOR } from '../tradera-browser-test-utils';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from './default-script';
import { TRADERA_CHECK_STATUS_SCRIPT } from './check-status-script';

const EXPECTED_TRADERA_PRICING_METADATA = {
  listingPrice: 55,
  listingCurrencyCode: 'EUR',
  targetCurrencyCode: 'EUR',
  resolvedToTargetCurrency: true,
  basePrice: 123,
  baseCurrencyCode: 'PLN',
  priceSource: 'price_group_target_currency',
  priceResolutionReason: 'resolved_target_currency',
  defaultPriceGroupId: 'price-group-pln',
  catalogDefaultPriceGroupId: 'price-group-pln',
  pricingCatalogId: 'catalog-1',
  catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
  loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
  matchedTargetPriceGroupIds: ['price-group-eur'],
};

describe('DEFAULT_TRADERA_QUICKLIST_SCRIPT', () => {
  it('parses as a valid Playwright node script', () => {
    const validation = validatePlaywrightNodeScript(DEFAULT_TRADERA_QUICKLIST_SCRIPT);
    if (!validation.ok) {
      console.error(validation.error);
    }
    expect(validation).toMatchObject({
      ok: true,
    });
  });

  it('avoids dynamic imports that the vm runner cannot execute', () => {
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('await import(\'node:fs/promises\')');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('page.context().request.get');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('buffer: bytes');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('AUTH_REQUIRED: Tradera login requires manual verification.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await humanFill(usernameInput, username);');
  });

  it('opens the create listing form from the selling landing page when needed', () => {
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('tradera-quicklist-default:v130');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('observedPreviewCount: imageUploadResult?.observedPreviewCount ?? null');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_IMAGE_SET_INVALID: Tradera uploaded more image previews than expected.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isKnownAuthenticatedTraderaUrl = (url) =>');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("url.includes('/my/listings')");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain("currentUrl.includes('/my/')");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('artifacts,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('helpers,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const TRADERA_ALLOWED_PAGE_HOSTS = [\'www.tradera.com\', \'tradera.com\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const getUnexpectedTraderaNavigationPayload = (value) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const assertAllowedTraderaPage = async (context = \'operation\') => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await assertAllowedTraderaPage(\'wait\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await assertAllowedTraderaPage(\'before click\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await assertAllowedTraderaPage(\'image input resolution\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.navigation.unexpected\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.click_blocked\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await captureFailureArtifacts(\'unexpected-navigation\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await captureFailureArtifacts(\'blocked-external-click\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_SELL_PAGE_INVALID: Unexpected navigation away from Tradera to ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_SELL_PAGE_INVALID: Refusing to click external link target "');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanClick = async (target, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const tryHumanClick = async (target, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (message.includes(\'FAIL_SELL_PAGE_INVALID:\')) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanFill = async (target, value, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanType = async (value, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanPress = async (key, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const emitStage = (stage, extra = {}) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readRuntimeEnvironment = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findPublishButton = async (options = {}) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DIRECT_SELL_URL = \'https://www.tradera.com/en/selling/new\';');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const LEGACY_SELL_URL = \'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts\';');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const normalizedConfiguredSellUrl =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CREATE_LISTING_TRIGGER_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CATEGORY_FIELD_LABELS = [\'Category\', \'Kategori\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CATEGORY_PLACEHOLDER_LABELS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const FALLBACK_CATEGORY_OPTION_LABELS = [\'Other\', \'Övrigt\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const FALLBACK_CATEGORY_PATH_SEGMENTS = [\'Other\', \'Other\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const FALLBACK_CATEGORY_PATH = FALLBACK_CATEGORY_PATH_SEGMENTS.join(\' > \');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const LISTING_FORMAT_FIELD_LABELS = [\'Listing format\', \'Annonsformat\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const BUY_NOW_OPTION_LABELS = [\'Buy now\', \'Buy Now\', \'Fixed price\', \'Köp nu\', \'Fast pris\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CONDITION_FIELD_LABELS = [\'Condition\', \'Skick\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CONDITION_OPTION_LABELS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DRAFT_IMAGE_REMOVE_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-testid*="photo"] input[type="file"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[type="file"][name*="image" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const IMAGE_UPLOAD_TRIGGER_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const IMAGE_REQUIRED_HINT_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const IMAGE_UPLOAD_PENDING_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const IMAGE_UPLOAD_ERROR_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const IMAGE_UPLOAD_ERROR_HINTS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const UPLOADED_IMAGE_PREVIEW_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Add images")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Lägg till bilder")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-testid*="image-picker"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button[aria-label*="Radera" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Radera")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DRAFT_IMAGE_REMOVE_ACTION_HINTS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DRAFT_IMAGE_REMOVE_SCOPE_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('a[aria-label*="Ta bort" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('a:has-text("Ta bort")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('[data-testid*="remove"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('[data-testid*="delete"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CONTINUE_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button[aria-label*="Continue" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button[aria-label*="Fortsätt" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-testid*="continue"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ACTIVE_SEARCH_SUBMIT_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ACTIVE_SEARCH_TRIGGER_LABELS = [\'Search\', \'Sök\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const GLOBAL_HEADER_SEARCH_HINTS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ACTIVE_TAB_LABELS = [\'Active\', \'Aktiva\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ACTIVE_TAB_STATE_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const VALIDATION_MESSAGE_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const TRANSIENT_VALIDATION_MESSAGE_PATTERNS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Review and publish")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Granska och publicera")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button[aria-label*="Publish" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button[aria-label*="Publicera" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-testid*="publish"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Create a New Listing")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Skapa en ny annons")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Skapa annons")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Ny annons")');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CREATE_LISTING_TRIGGER_LABELS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DEPARTMENT_FIELD_LABELS = [\'Department\', \'Avdelning\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DEPARTMENT_OPTION_LABELS = [\'Unisex\', \'Dam/Herr\', \'Women/Men\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DELIVERY_FIELD_LABELS = [\'Delivery\', \'Leverans\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const OFFER_SHIPPING_LABELS = [\'Offer shipping\', \'Erbjud frakt\', \'Frakt\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const OFFER_PICKUP_LABELS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DELIVERY_OPTION_LABELS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const SHIPPING_DIALOG_TITLE_LABELS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const SHIPPING_DIALOG_OPTION_LABELS = [\'Other\', \'Annat\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const SHIPPING_DIALOG_CLOSE_LABELS = [\'Close\', \'Stäng\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const SHIPPING_DIALOG_CANCEL_LABELS = [\'Cancel\', \'Avbryt\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const SHIPPING_DIALOG_SAVE_LABELS = [\'Save\', \'Spara\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const SHIPPING_DIALOG_PRICE_INPUT_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const LISTING_CONFIRMATION_LABELS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DRAFT_SAVING_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DRAFT_SAVED_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.auth.initial\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await page.goto(\'https://www.tradera.com/en/login\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const pathname = url.pathname || \'\';');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('(?:item\\/(?:\\d+\\/)?|listing\\/)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findVisibleListingLink = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('async function captureFailureArtifacts');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await captureFailureArtifacts(\'auth-required\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await captureFailureArtifacts(\'run-failure\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const countDraftImageRemoveControls = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const visible = await candidate.isVisible().catch(() => false);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readSelectedImageFileCount = async (imageInput) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForSelectedImageFileCount = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isImageUploadPromptVisible = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isImageUploadPending = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readImageUploadErrorText = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const countUploadedImagePreviews = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readListingEditorState = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('hasCategoryTrigger: Boolean(categoryTrigger),');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('hasListingFormatTrigger: Boolean(listingFormatTrigger),');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.selected\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.runtime\', await readRuntimeEnvironment());');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForImageUploadsToSettle = async');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForDraftSaveSettled = async');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const startedAt = Date.now();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('(Date.now() - startedAt >= minimumQuietMs && quietPolls >= 3)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.settle\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.upload_error\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.settle_timeout\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.draft.settled\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.draft.settle_timeout\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('method: \'image-preview-visible\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('method: \'editor-with-upload-state\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (!imageUploadPromptVisible && !imageUploadPending) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (listingFormReady && !imageUploadPromptVisible && !imageUploadPending) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (draftImageRemoveControls > 0 && !imageUploadPromptVisible && !imageUploadPending) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('await wait(1000);\n        continue;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const advancePastImagesStep = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('baselinePreviewCount = 0');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const localImagePaths = Array.isArray(input?.localImagePaths)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const resolveUploadFiles = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.order_preserved_by_download\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureImageInputReady = async (attempts = 4) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.trigger_opened\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clicked = await tryHumanClick(candidate);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (!clicked) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image_input.retry\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clearDraftImagesIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureImageStepSellPageReady = async (context) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const stableEntryPoint = await confirmStableSellPage(1_000, 6_000);'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'log?.(\'tradera.quicklist.sell_page.image_step_invalid\''
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SELL_PAGE_INVALID: Tradera listing editor was lost during '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('String(stableEntryPoint)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await ensureCreateListingPageReady(context);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'context === \'draft image cleanup complete\''
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'log?.(\'tradera.quicklist.sell_page.image_step_recover\''
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'log?.(\'tradera.quicklist.sell_page.image_step_recover_result\''
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'await ensureCreateListingPageReady(context + \' recovery\', true);'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'log?.(\'tradera.quicklist.draft.reset_state\''
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.draft_image_remove.skipped\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await logClickTarget(\'draft-image-remove\', candidate);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.draft_image_remove.clicked\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('reason: \'navigating-target\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('reason: \'outside-image-scope\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('metadata.tagName === \'a\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const insideImageScope = Array.isArray(scopeSelectors)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const closestLink = element.closest(\'a[href], a[role="link"], [role="link"][href]\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SELL_PAGE_INVALID: Tradera draft image cleanup navigated away from the listing editor. Current URL: '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await ensureImageStepSellPageReady(\'draft image cleanup complete\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findFieldTriggerByLabels = async (labels) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const mainRoot = page.locator(\'main\').first();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const root = mainRootVisible ? mainRoot : page;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleContains = root');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('getByRole(\'menu\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleContainsMenu = root');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleLink = root');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleContainsLink = root');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('getByRole(\'combobox\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@aria-haspopup="listbox"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const trySelectOptionalFieldValue = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('requiredOptionLabel = null');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('failureCode = \'FAIL_PUBLISH_VALIDATION\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clickMenuItemByName = async (name) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('categoryFallbackAllowed: mappedCategorySegments.length === 0');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isSafeMenuChoiceTarget = async (locator) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.menu_option.skipped_navigation\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('reason: \'category-page-link\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('reason: \'outside-selection-ui\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-test-category-chooser="true"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('\': Required Tradera \' +');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('\' field was not available for option "\' +');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const triggerActiveSearchSubmit = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findActiveTabTrigger = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialTabCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialLinkCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialButtonCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureActiveListingsContext = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_DUPLICATE_UNCERTAIN: Active listings context could not be confirmed.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const resolvePreferredSyncListingUrl = () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const directListingUrl = normalizeWhitespace(existingListingUrl || \'\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clickSyncEditTargetWithinScope = async (scope, context) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const tryOpenExistingListingEditorFromActiveListings = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('matchedBy: \'active_listings_\' + matchedCandidate.matchedBy,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('context: \'sync-active-listings-fallback\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await dismissVisibleWishlistFavoritesModalIfPresent({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('context: \'sync-direct-target\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await page.goto(directSyncTargetUrl, {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.sync.editor_opened\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SYNC_TARGET_NOT_FOUND: Tradera sync requires an existing listing url or existing listing id.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SYNC_TARGET_NOT_FOUND: Direct sync target resolved to the wrong Tradera listing. Expected '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SYNC_TARGET_NOT_FOUND: Direct sync target edit page did not open the Tradera listing editor. Current URL: '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SYNC_TARGET_NOT_FOUND: Direct sync target edit action was not available on the Tradera listing page. Current URL: '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('matchedBy: \'exact_title\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedAria.includes(hint))');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedPlaceholder.includes(hint))');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isControlDisabled = async (locator) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const collectValidationMessages = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const VALIDATION_MESSAGE_IGNORE_FIELDS = [\'__next-route-announcer__\', \'next-route-announcer\'];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('element.closest(\'next-route-announcer\')');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('sanitizeValidationMessages(Array.from(messages)).slice(0, 6)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findScopedSearchTrigger = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readActiveSearchInputValue = async (searchInput) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const prepareActiveListingsSearchInput = async (searchInput, term) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const collectVisibleListingCandidates = async (limit = null) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const titleElement = candidateContainer.querySelector(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('titleText: ((titleElement && titleElement.textContent) || \'\').replace');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('titleText: (element.getAttribute(\'title\') ||');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const collectVisibleListingCandidatePreview = async (limit = 8) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const titlesExactlyMatch = (left, right) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const collectListingLinksForTerm = async (term, maxMatches = null) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const inspectDuplicateCandidateListing = async (candidate) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const stripDescriptionMetadata = (value) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const descriptionsMatch = (listingText, productDescription) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('listingDescription: listingText');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('descriptionMatched');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_DUPLICATE_UNCERTAIN: Active listings search input did not accept the English title search term.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.duplicate.inspect\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.duplicate.linked\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.duplicate.search_prepare\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.duplicate.search_state\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.duplicate.uncertain\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.draft.reset\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.duplicate.search\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.duplicate.result\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('reason: existingExternalListingId ? \'listing-already-linked\' : \'action-not-list\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.field.selected\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.publish.validation\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('log?.(\'tradera.quicklist.publish.verify\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const normalizedNamePattern = name.replace');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('getByRole(\'menuitemradio\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('getByRole(\'option\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('getByRole(\'radio\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('getByRole(\'link\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialMenuItemCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialOptionCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialLinkCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialButtonCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@role="menuitemradio"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@role="option"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@role="radio"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readListingEditorState = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForImageStepActionable = async (timeoutMs = 20_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('new RegExp(\'/selling(?:[?#]|$)\').test(currentUrl)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('page.waitForURL(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('/selling(?:/(?:new|draft(?:/[^/?#]+)?))?(?:[?#/]|$)|/sell(?:/new)?(?:[?#/]|$)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clearFocusedEditableField = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await humanPress(\'Delete\', { pauseBefore: false, pauseAfter: false }).catch(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await humanPress(\'Backspace\', { pauseBefore: false, pauseAfter: false }).catch(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('root.getByRole(\'button\', { name: new RegExp(\'^\' + escapedPattern');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('root.getByRole(\'link\', { name: new RegExp(escapedPattern, \'i\') }).first()');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menu" or self::div or self::label][1]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem" or @role="menuitemradio" or @role="option" or @role="radio"][1]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('following::*[(self::button or self::a or @role="button" or @role="link" or @role="menu" or @role="combobox" or @aria-haspopup="listbox" or @aria-haspopup="menu")][1]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const AUTOFILL_PENDING_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const mappedCategorySegments = Array.isArray(input?.traderaCategory?.segments)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const configuredExtraFieldSelections = Array.isArray(input?.traderaExtraFieldSelections)'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const existingListingUrl = toText(input?.existingListingUrl);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const configuredDeliveryOptionLabel = toText(input?.traderaShipping?.shippingCondition);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const configuredDeliveryPriceEur = toNumber(input?.traderaShipping?.shippingPriceEur);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const configuredShippingGroupName = toText(input?.traderaShipping?.shippingGroupName);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const requiresConfiguredDeliveryOption = Boolean(configuredDeliveryOptionLabel);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const deliveryOptionLabels = configuredDeliveryOptionLabel');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const PRODUCT_ID_PATTERN = /(item reference|product id)\\s*:/i;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const SKU_REFERENCE_PATTERN = /\\bsku\\s*:/i;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('referenceLines.join(\' | \')');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('rawDescription + \' | \' + referenceLines.join(\' | \')');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const tryAutofillCategory = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const categoryTrigger = await findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const normalizeCategoryPathValue = (value) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readVisibleCategoryMenuOptions = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-test-category-chooser="true"] [role="menuitemradio"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-test-category-chooser="true"] a[href]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('element.closest(\'nav[aria-label="Breadcrumb"]\')');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureCategoryOptionVisible = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('requireRoot = false,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.category.repositioned\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.category.reposition_failed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.category.autofill_preserved\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_CATEGORY_SET: Fallback category path "');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('for (const segment of FALLBACK_CATEGORY_PATH_SEGMENTS)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.category.fallback\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('requestedPath: FALLBACK_CATEGORY_PATH,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('selectedPath: selectedCategoryPath,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isCategoryPlaceholderValue = (value) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (isCategoryPlaceholderValue(normalizedValue)) return null;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const applyDeliveryCheckboxSelection = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const dismissVisibleShippingDialogIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findVisibleWishlistFavoritesDialog = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const dismissVisibleWishlistFavoritesModalIfPresent = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const resetDeliveryTogglesIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clickCheckboxLabelByText = async (root, labels) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const setCheckboxChecked = async (locator, labels, desiredChecked, root = page, options = {}) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('.getByRole(\'switch\', { name: new RegExp(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@role="switch"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isInteractiveSelectionTrigger = async (locator) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const applyDeliverySelection = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const dialogLooksLikeShipping =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForVisibleShippingDialog = async (timeoutMs = 6_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const waitForShippingDialogPriceInputReady = async (shippingDialog, timeoutMs = 4_000) => {'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const waitForShippingDialogSaveReady = async (shippingDialog, timeoutMs = 2_000) => {'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const commitShippingDialogPriceInput = async (shippingPriceInput) => {'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const buildShippingDialogPriceEntryVariants = (priceValue) => {'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const captureShippingDialogSaveState = async (shippingDialog) => {'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const refreshShippingDialogOptionSelection = async (shippingDialog) => {'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const enableShippingDialogSaveButton = async ({'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.dialog_reset\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.reset\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.dialog_opened\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.dialog_reused\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.dialog_reopened\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.wishlist_modal.detected\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.wishlist_modal.dismissed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.wishlist_modal.dismiss_failed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.autofill_modal.detected\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.autofill_modal.dismissed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.autofill_modal.dismiss_failed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.price_input_ready\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.price_committed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.price_attempt\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.price_set\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.option_refresh\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const confirmShippingDialogPriceValue = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.save.blocked\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.price_confirmed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.save_ready\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.save.attempt\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.delivery.save.applied\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('reason: \'non-interactive-delivery-trigger\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const requiresShippingDialogConfiguration =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_SHIPPING_SET: Tradera shipping dialog did not open for required delivery configuration.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SHIPPING_SET: Tradera shipping toggle could not be reset before opening delivery configuration.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SHIPPING_SET: Tradera shipping price was not preserved before saving.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SHIPPING_SET: Tradera shipping dialog price input was not ready.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SHIPPING_SET: Tradera shipping dialog save button stayed disabled after entering the price.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('inputMethod === \'type\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('selectionRefreshApplied: Boolean(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('selectionRefreshFinalChecked: selectionRefresh?.finalChecked ?? null');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('optionDataState: optionMetadata?.dataState ?? null,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('priceInputRequired: priceInputMetadata?.required ?? null,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('clickOptions: { timeout: 5_000 }');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const acknowledgeListingConfirmationIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForPublishReadiness = async (publishButton, timeoutMs = 6_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('fieldKey: \'delivery-price\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const expectedDeliveryPriceValue = configuredDeliveryPriceEur.toFixed(2);'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const normalizedConfiguredDeliveryPrice = normalizePriceValue('
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const confirmedShippingPriceValue = normalizePriceValue('
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('Tradera shipping price (EUR) is missing');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('field: \'listing-confirmation\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('Tradera listing confirmation checkbox could not be acknowledged.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('context: \'listing-confirmation-search\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.publish.ready\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.publish.ready_timeout\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('Autofilling your listing');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const dismissVisibleAutofillDialogIfPresent = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.upload_attempt_failed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_IMAGE_SET_INVALID: Continue completed the image step but the listing editor never became ready. Editor state: ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[name="shortDescription"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[placeholder*="rubrik" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('#tip-tap-editor');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[aria-label="Beskrivning"][contenteditable="true"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('textarea[placeholder*="beskriv" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('#price_fixedPrice');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[placeholder*="pris" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[aria-label*="pris" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForSellEntryPoint = async');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isTraderaHomepage = (url) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isTraderaSellingRoute = (url) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const openCreateListingPage = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const confirmStableSellPage = async (minimumStableMs = 1_500, timeoutMs = 6_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureCreateListingPageReady = async (context, recover = false) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.sell_page.homepage_detected\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.sell_page.homepage_retry\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('entryPoint = await openCreateListingPage();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('entryPoint = await confirmStableSellPage();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'listingAction === \'sync\' ? \'sync listing-editor bootstrap\' : \'listing-editor bootstrap\''
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'context: listingAction === \'sync\' ? \'sync-editor-ready\' : \'listing-editor-ready\','
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const initialStartUrl =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('emitStage(listingAction === \'sync\' ? \'sync_target_loaded\' : \'active_loaded\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await ensureImageStepSellPageReady(\'image input resolution\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('inputMethod: \'paste\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const setTextFieldDirectly = async (locator, value) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('tradera.quicklist.sell_page.homepage_redirect_recovery');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_MODAL_DISMISS: Tradera wishlist favorites modal could not be dismissed (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await dismissVisibleWishlistFavoritesModalIfPresent({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await dismissVisibleShippingDialogIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await clearDraftImagesIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await setCheckboxChecked(shippingToggle, OFFER_SHIPPING_LABELS, true, page, {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const shippingStillEnabled = await isCheckboxChecked(shippingToggle);'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const toggledOff = await setCheckboxChecked('
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('successWhen: async () => Boolean(await findVisibleShippingDialog()),');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await setCheckboxChecked(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const imageDraftState = await waitForDraftSaveSettled();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const selectionDraftState = await waitForDraftSaveWithRecovery({'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForDraftSaveWithRecovery = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.draft.unsettled_continue\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const confirmationDraftState = await waitForDraftSaveSettled(6_000, 1_200);'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.selection_pending\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish. Last state: ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_IMAGE_SET_INVALID: Tradera retry image cleanup did not clear the previous upload state. Last state: '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.retry_cleanup\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let stableZeroChecks = 0;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const tryReuseCompletedImageUpload = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const buildPartialUploadRetryBlockedError = ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readImageUploadRetryState = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isRetryBlockedImageUploadError = (error) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.reuse_check\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.reuse_completed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.retry_blocked\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_IMAGE_SET_INVALID: Tradera image upload reached a partial state and retrying could duplicate images. Last state: '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let baselinePreviewCount = 0;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('baselinePreviewCount = await countUploadedImagePreviews();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const reusableUploadBeforeDispatch = await tryReuseCompletedImageUpload({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const reusableUploadAfterError = await tryReuseCompletedImageUpload({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const imageAdvanceResult = await advancePastImagesStep('
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const performImageUpload = async (uploadFiles, uploadSource) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let currentImageUploadSource = null;\n\n  try {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let currentImageUploadSource = null;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('currentImageUploadSource = uploadSource;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const tryPreserveRelistEditorImages = async (uploadAttempt) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.relist_preserve_check\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.relist_preserved\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('currentImageUploadSource = \'preserved-relist\';');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('imageUploadResult?.uploadSource === \'preserved-relist\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('reason: \'relist-editor-ready\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clickResidualContinueButton = async (button) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const resolveTitleAndDescriptionInputs = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.field.selector_retry\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('reason: \'image-step-continue\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.field.selector_missing\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const { titleInput, descriptionInput } = await resolveTitleAndDescriptionInputs();'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await ensureImageStepSellPageReady(\'image upload dispatch\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.upload_attempt_failed\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await ensureImageStepSellPageReady(\'image upload dispatch retry\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await ensureRetryImageCleanupSettled({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.image.retry_download\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("initialUploadSource === 'local' &&");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('imageUrls.length > 0');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('!isRetryBlockedImageUploadError(error);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('imageUploadSource: imageUploadResult?.uploadSource ?? null');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('imageUploadSource: currentImageUploadSource,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('emitStage(\'category_selected\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('emitStage(\'listing_format_selected\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('emitStage(\'listing_attributes_selected\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('emitStage(\'delivery_configured\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const normalizeFieldLookupKey = (value) =>');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const resolveDynamicFieldTriggerTextByKey = async (requiredFieldKey) =>'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findDynamicFieldTrigger = async (selection) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readDynamicFieldTriggerText = async (trigger) =>');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const fieldKey = normalizeFieldLookupKey(selection?.fieldKey || fieldLabel);'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const triggerText = await resolveDynamicFieldTriggerTextByKey(fieldKey);'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'reason: \'already-matched\''
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const applyConfiguredExtraFieldSelections = async () => {'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_EXTRA_FIELD_SET: Required Tradera field "');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_EXTRA_FIELD_SET: Required Tradera option "');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await trySelectOptionalFieldValue({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const listingFormatTrigger = await findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const FIXED_PRICE_INPUT_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.listing_format.inferred\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await fillTitleAndDescription();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await fillPriceField({ required: true, context: \'post-listing-format\' });');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const finalPriceApplied = await fillPriceField({\n      required: false,\n      context: \'pre-publish-finalize\',\n    });'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('context: \'delivery-configuration\',');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('context: \'pre-publish-finalize\',');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('reason: \'already-matched\'');
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await fillTitleAndDescription();')
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await chooseBuyNowListingFormat();')
    );
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await chooseBuyNowListingFormat();')
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf(
        'await fillPriceField({ required: true, context: \'post-listing-format\' });'
      )
    );
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf(
        'await fillPriceField({ required: true, context: \'post-listing-format\' });'
      )
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await applyCategorySelection();')
    );
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await applyCategorySelection();')
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await applyConfiguredExtraFieldSelections();')
    );
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await applyConfiguredExtraFieldSelections();')
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await applyDeliverySelection();')
    );
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await applyDeliverySelection();')
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('context: \'pre-publish-finalize\',')
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('reason: \'fixed-price-input-visible\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isSafeDraftImageRemoveControl = async (locator) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('return !resolveExternalClickTargetUrl(metadata);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (visible && (await isSafeDraftImageRemoveControl(candidate))) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const safeDraftRemoveControl = await isSafeDraftImageRemoveControl(candidate);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForImageStepActionable = async (timeoutMs = 20_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('type: \'continue\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_IMAGE_SET_INVALID: Tradera image step never became actionable after upload. State: '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('imageStepState: finalImageStepState,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('fieldKey: \'condition\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('fieldKey: \'department\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('fieldKey: \'delivery\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('for (const optionLabel of BUY_NOW_OPTION_LABELS)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('requiredOptionLabel: configuredDeliveryOptionLabel');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('failureCode: \'FAIL_SHIPPING_SET\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const hasDeliveryValidationIssue = (messages) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await acknowledgeListingConfirmationIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_SHIPPING_SET: ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let publishReadiness = await waitForPublishReadiness(publishButton);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const listingConfirmationState = await acknowledgeListingConfirmationIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForPublishInteractionEvidence = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'timeoutMs = listingAction === \'relist\' ? 12_000 : 8_000'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const recoverPublishConfirmationViaDuplicateSearch = async ('
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.publish.click_result\', publishInteraction);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'log?.(\'tradera.quicklist.publish.recovered_via_active_listings\', {'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const activeListingsVisible = currentUrl.toLowerCase().includes(\'/my/listings\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const publishTargetMetadata = await readClickTargetMetadata(publishButton);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await logClickTarget(\'publish\', publishButton);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await captureFailureArtifacts(\'publish-click\', {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await captureFailureArtifacts(\'publish-click-not-confirmed\', {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_PUBLISH_CLICK: Tradera publish button click failed. ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_PUBLISH_CLICK: Publish button click did not trigger an observable Tradera publish interaction.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let prePublishValidationMessages = publishReadiness.messages;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('context: \'publish-readiness-recovery\',');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('context: \'category-and-details\',');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_PUBLISH_VALIDATION: Tradera listing editor was not ready after category and listing detail selections.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let publishDisabled = publishReadiness.publishDisabled;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_PUBLISH_VALIDATION: ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('tradera.quicklist.publish.id_not_extracted');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const duplicateMatch = await checkDuplicate(duplicateSearchTerms);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const matchLimit =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const visibleCandidates = await collectVisibleListingCandidates(8);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const candidatePreviewBeforeSearch = await collectVisibleListingCandidatePreview();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const preparedSearchValue = await prepareActiveListingsSearchInput(searchInput, searchTerm);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const searchInputValue = await readActiveSearchInputValue(searchInput);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const candidatePreviewAfterSearch = await collectVisibleListingCandidatePreview();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const searchStateChanged =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const duplicateCandidateSet = await collectDuplicateCandidates(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const duplicateMatches = duplicateCandidateSet.exactTitleMatches;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const fallbackMatches = duplicateCandidateSet.fallbackTitleMatches;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const inspectionCandidates = duplicateCandidateSet.inspectionCandidates;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const candidateScanMode = duplicateCandidateSet.candidateScanMode;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const knownExistingCandidate = visibleCandidates.find(matchesKnownExistingListing) || null;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('candidateScanMode,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const nonExactVisibleCandidateCount = visibleCandidates.filter(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('knownExistingListingCandidateFound: Boolean(knownExistingCandidate),');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('matchStrategy: \'existing-listing-id+visible-candidate\',');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('for (const candidate of [...duplicateMatches, ...visibleCandidates]) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const uncertainSearch =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_DUPLICATE_UNCERTAIN: Active listings search results could not be confirmed for duplicate detection.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('searchStateChanged,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('stage: \'duplicate_linked\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('duplicateLinked: true,');
    // Post-publish: notification modal dismiss + listing link extraction
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('NOTIFICATION_MODAL_DISMISS_LABELS');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const dismissPostPublishNotificationModal = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const extractPostPublishListingLink = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.publish.notification_dismiss\',');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.publish.link_extracted\',');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.publish.link_not_found\',');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await dismissPostPublishNotificationModal();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const extracted = await extractPostPublishListingLink();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const canTrustDirectPublishSuccess =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('log?.(\'tradera.quicklist.publish.verified_direct\', {');
    // Removed functions should no longer be present
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('waitForPostPublishNavigation');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('verifyPublishedListingViaActiveSearch');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('findPublishedListingMatchOnCurrentPage');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('summarizePostPublishState');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('FAIL_PUBLISH_STUCK');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain(
      'await Promise.allSettled([\n      page.waitForLoadState(\'domcontentloaded\', { timeout: 25_000 }),\n      humanClick(publishButton, { pauseAfter: false }),\n    ]);'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain(
      'if (!externalListingId && postPublishNavigation.activeListingsVisible) {\n      await page.goto(ACTIVE_URL'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const publishVerification = await recoverPublishConfirmationViaDuplicateSearch('
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const recoverPublishedListingViaVisibleCandidate = async ('
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'log?.(\'tradera.quicklist.publish.recovery_visible_candidate_check\','
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'log?.(\'tradera.quicklist.publish.recovery_visible_candidate_result\','
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'duplicateMatchStrategy: \'visible-candidate+expected-listing\','
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('expectedExternalListingId: externalListingId,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('expectedListingUrl: listingUrl,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_PUBLISH_VERIFICATION: Published listing could not be confirmed in Active listings.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'publishVerification.externalListingId || externalListingId || existingExternalListingId || null;'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const effectiveListingUrl =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('currentUrl: effectiveListingUrl || page.url(),');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('externalListingId: effectiveExternalListingId,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('listingUrl: effectiveListingUrl,');
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf(
        'const shippingDialogReady = await waitForShippingDialogPriceInputReady(shippingDialog, 4_000);'
      )
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf(
        'const dialogClosed = await submitShippingDialogSave(shippingDialog, saveButton);'
      )
    );
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('log?.(\'tradera.quicklist.delivery.price_set\'')
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf(
        'const dialogClosed = await submitShippingDialogSave(shippingDialog, saveButton);'
      )
    );
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf(
        'const confirmedShippingPriceValue = normalizePriceValue('
      )
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf(
        'const dialogClosed = await submitShippingDialogSave(shippingDialog, saveButton);'
      )
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('shippingDialogReady.saveButton ||');
  });
});
