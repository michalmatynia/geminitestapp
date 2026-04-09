import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validatePlaywrightNodeScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';

const {
  getProductByIdMock,
  runPlaywrightListingScriptMock,
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
  runPlaywrightListingScriptMock: vi.fn(),
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

vi.mock('@/features/integrations/server', () => ({
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

vi.mock('../playwright-listing/runner', () => ({
  runPlaywrightListingScript: (...args: unknown[]) =>
    runPlaywrightListingScriptMock(...args) as Promise<unknown>,
}));

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

import { ensureLoggedIn, runTraderaBrowserListing } from './browser';
import {
  LOGIN_SUCCESS_SELECTOR,
  TRADERA_AUTH_ERROR_SELECTORS,
} from './config';
import { TRADERA_SUCCESS_SELECTOR } from '../tradera-browser-test-utils';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from './default-script';

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

    expect(validation).toMatchObject({
      ok: true,
    });
  });

  it('avoids dynamic imports that the vm runner cannot execute', () => {
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain("await import('node:fs/promises')");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('page.context().request.get');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('buffer: bytes');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('AUTH_REQUIRED: Tradera login requires manual verification.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await humanFill(usernameInput, username);');
  });

  it('opens the create listing form from the selling landing page when needed', () => {
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('tradera-quicklist-default:v118');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('artifacts,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('helpers,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const TRADERA_ALLOWED_PAGE_HOSTS = ['www.tradera.com', 'tradera.com'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const getUnexpectedTraderaNavigationPayload = (value) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const assertAllowedTraderaPage = async (context = 'operation') => {");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await assertAllowedTraderaPage('wait');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await assertAllowedTraderaPage('before click');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await assertAllowedTraderaPage('image input resolution');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.navigation.unexpected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.click_blocked'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await captureFailureArtifacts('unexpected-navigation'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await captureFailureArtifacts('blocked-external-click'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_SELL_PAGE_INVALID: Unexpected navigation away from Tradera to ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_SELL_PAGE_INVALID: Refusing to click external link target "');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanClick = async (target, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const tryHumanClick = async (target, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("if (message.includes('FAIL_SELL_PAGE_INVALID:')) {");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanFill = async (target, value, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanType = async (value, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanPress = async (key, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const emitStage = (stage, extra = {}) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readRuntimeEnvironment = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findPublishButton = async (options = {}) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const DIRECT_SELL_URL = 'https://www.tradera.com/en/selling/new';");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const LEGACY_SELL_URL = 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts';");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const normalizedConfiguredSellUrl =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CREATE_LISTING_TRIGGER_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const CATEGORY_FIELD_LABELS = ['Category', 'Kategori'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const CATEGORY_PLACEHOLDER_LABELS = [");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const FALLBACK_CATEGORY_OPTION_LABELS = ['Other', 'Övrigt'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const FALLBACK_CATEGORY_PATH_SEGMENTS = ['Other', 'Other'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const FALLBACK_CATEGORY_PATH = FALLBACK_CATEGORY_PATH_SEGMENTS.join(' > ');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const LISTING_FORMAT_FIELD_LABELS = ['Listing format', 'Annonsformat'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const BUY_NOW_OPTION_LABELS = ['Buy now', 'Buy Now', 'Fixed price', 'Köp nu', 'Fast pris'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const CONDITION_FIELD_LABELS = ['Condition', 'Skick'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const CONDITION_OPTION_LABELS = [");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const ACTIVE_SEARCH_TRIGGER_LABELS = ['Search', 'Sök'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const GLOBAL_HEADER_SEARCH_HINTS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const ACTIVE_TAB_LABELS = ['Active', 'Aktiva'];");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const DEPARTMENT_FIELD_LABELS = ['Department', 'Avdelning'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const DEPARTMENT_OPTION_LABELS = ['Unisex', 'Dam/Herr', 'Women/Men'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const DELIVERY_FIELD_LABELS = ['Delivery', 'Leverans'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const OFFER_SHIPPING_LABELS = ['Offer shipping', 'Erbjud frakt', 'Frakt'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const OFFER_PICKUP_LABELS = [");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const DELIVERY_OPTION_LABELS = [");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const SHIPPING_DIALOG_TITLE_LABELS = [");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const SHIPPING_DIALOG_OPTION_LABELS = ['Other', 'Annat'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const SHIPPING_DIALOG_CLOSE_LABELS = ['Close', 'Stäng'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const SHIPPING_DIALOG_CANCEL_LABELS = ['Cancel', 'Avbryt'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const SHIPPING_DIALOG_SAVE_LABELS = ['Save', 'Spara'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const SHIPPING_DIALOG_PRICE_INPUT_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const LISTING_CONFIRMATION_LABELS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DRAFT_SAVING_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const DRAFT_SAVED_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.auth.initial'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await page.goto('https://www.tradera.com/en/login'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const pathname = url.pathname || '';");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('(?:item\\/(?:\\d+\\/)?|listing\\/)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findVisibleListingLink = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('async function captureFailureArtifacts');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await captureFailureArtifacts('auth-required'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await captureFailureArtifacts('run-failure'");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.selected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.runtime', await readRuntimeEnvironment());");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForImageUploadsToSettle = async');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForDraftSaveSettled = async');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const startedAt = Date.now();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('(Date.now() - startedAt >= minimumQuietMs && quietPolls >= 3)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.settle'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.upload_error'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.settle_timeout'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.draft.settled'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.draft.settle_timeout'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("method: 'image-preview-visible'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("method: 'editor-with-upload-state'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (!imageUploadPromptVisible && !imageUploadPending) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (listingFormReady && !imageUploadPromptVisible && !imageUploadPending) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (draftImageRemoveControls > 0 && !imageUploadPromptVisible && !imageUploadPending) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('await wait(1000);\n        continue;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const advancePastImagesStep = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('baselinePreviewCount = 0');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const localImagePaths = Array.isArray(input?.localImagePaths)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const resolveUploadFiles = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.order_preserved_by_download'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureImageInputReady = async (attempts = 4) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.trigger_opened'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clicked = await tryHumanClick(candidate);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (!clicked) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image_input.retry'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clearDraftImagesIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureImageStepSellPageReady = async (context) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const stableEntryPoint = await confirmStableSellPage(1_000, 6_000);'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "log?.('tradera.quicklist.sell_page.image_step_invalid'"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SELL_PAGE_INVALID: Tradera listing editor was lost during '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("String(stableEntryPoint)");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await ensureCreateListingPageReady(context);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "context === 'draft image cleanup complete'"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "log?.('tradera.quicklist.sell_page.image_step_recover'"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "log?.('tradera.quicklist.sell_page.image_step_recover_result'"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "await ensureCreateListingPageReady(context + ' recovery', true);"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "log?.('tradera.quicklist.draft.reset_state'"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.draft_image_remove.skipped'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await logClickTarget('draft-image-remove', candidate);");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.draft_image_remove.clicked'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'navigating-target'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'outside-image-scope'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('metadata.tagName === \'a\'');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const insideImageScope = Array.isArray(scopeSelectors)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const closestLink = element.closest('a[href], a[role=\"link\"], [role=\"link\"][href]');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_SELL_PAGE_INVALID: Tradera draft image cleanup navigated away from the listing editor. Current URL: '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await ensureImageStepSellPageReady('draft image cleanup complete');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findFieldTriggerByLabels = async (labels) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const mainRoot = page.locator(\'main\').first();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const root = mainRootVisible ? mainRoot : page;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleContains = root');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("getByRole('menu'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleContainsMenu = root');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleLink = root');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleContainsLink = root');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("getByRole('combobox'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@aria-haspopup="listbox"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const trySelectOptionalFieldValue = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('requiredOptionLabel = null');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("failureCode = 'FAIL_PUBLISH_VALIDATION'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clickMenuItemByName = async (name) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('categoryFallbackAllowed: mappedCategorySegments.length === 0');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('could not be selected in the listing form. Refresh Tradera categories in Category Mapper');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isSafeMenuChoiceTarget = async (locator) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.menu_option.skipped_navigation'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'category-page-link'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'outside-selection-ui'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-test-category-chooser="true"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(`': Required Tradera ' +`);
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(`' field was not available for option "' +`);
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const triggerActiveSearchSubmit = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findActiveTabTrigger = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const partialTabCandidate = page");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const partialLinkCandidate = page");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const partialButtonCandidate = page");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureActiveListingsContext = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("FAIL_DUPLICATE_UNCERTAIN: Active listings context could not be confirmed.");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const resolvePreferredSyncListingUrl = () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const directListingUrl = normalizeWhitespace(existingListingUrl || '');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clickSyncEditTargetWithinScope = async (scope, context) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const tryOpenExistingListingEditorFromActiveListings = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("matchedBy: 'active_listings_' + matchedCandidate.matchedBy,");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("context: 'sync-active-listings-fallback'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await dismissVisibleWishlistFavoritesModalIfPresent({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("context: 'sync-direct-target'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await page.goto(directSyncTargetUrl, {");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.sync.editor_opened'");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("matchedBy: 'exact_title'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedAria.includes(hint))");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedPlaceholder.includes(hint))");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isControlDisabled = async (locator) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const collectValidationMessages = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const VALIDATION_MESSAGE_IGNORE_FIELDS = ['__next-route-announcer__', 'next-route-announcer'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("element.closest('next-route-announcer')");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('sanitizeValidationMessages(Array.from(messages)).slice(0, 6)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findScopedSearchTrigger = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readActiveSearchInputValue = async (searchInput) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const prepareActiveListingsSearchInput = async (searchInput, term) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const collectVisibleListingCandidates = async (limit = null) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const titleElement = candidateContainer.querySelector(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("titleText: ((titleElement && titleElement.textContent) || '').replace");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain("titleText: (element.getAttribute('title') ||");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.duplicate.inspect'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.duplicate.linked'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.duplicate.search_prepare'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.duplicate.search_state'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.duplicate.uncertain'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.draft.reset'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.duplicate.search'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.duplicate.result'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain("reason: existingExternalListingId ? 'listing-already-linked' : 'action-not-list'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.field.selected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.validation'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain("log?.('tradera.quicklist.publish.verify'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const normalizedNamePattern = name.replace');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("getByRole('menuitemradio'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("getByRole('option'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("getByRole('radio'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("getByRole('link'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialMenuItemCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialOptionCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialLinkCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const partialButtonCandidate = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@role="menuitemradio"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@role="option"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@role="radio"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readListingEditorState = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForImageStepActionable = async (timeoutMs = 20_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("new RegExp('/selling(?:[?#]|$)').test(currentUrl)");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("page.waitForURL(");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("/selling(?:/(?:new|draft(?:/[^/?#]+)?))?(?:[?#/]|$)|/sell(?:/new)?(?:[?#/]|$)");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clearFocusedEditableField = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await humanPress('Delete', { pauseBefore: false, pauseAfter: false }).catch(");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await humanPress('Backspace', { pauseBefore: false, pauseAfter: false }).catch(");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("root.getByRole('button', { name: new RegExp('^' + escapedPattern");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("root.getByRole('link', { name: new RegExp(escapedPattern, 'i') }).first()");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("referenceLines.join(' | ')");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("rawDescription + ' | ' + referenceLines.join(' | ')");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const applyCategorySelection = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const categoryTrigger = await findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const normalizeCategoryPathValue = (value) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const readVisibleCategoryMenuOptions = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-test-category-chooser="true"] [role="menuitemradio"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-test-category-chooser="true"] a[href]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("element.closest('nav[aria-label=\"Breadcrumb\"]')");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureCategoryOptionVisible = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('requireRoot = false,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.category.repositioned'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.category.reposition_failed'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.category.mapped_already_selected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.category.autofill_preserved'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.category.mapped_unavailable'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_CATEGORY_SET: Fallback category path "');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('for (const segment of FALLBACK_CATEGORY_PATH_SEGMENTS)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.category.fallback'");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(".getByRole('switch', { name: new RegExp(");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.dialog_reset'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.reset'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.dialog_opened'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.dialog_reused'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.dialog_reopened'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.wishlist_modal.detected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.wishlist_modal.dismissed'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.wishlist_modal.dismiss_failed'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.price_input_ready'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.price_committed'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.price_attempt'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.price_set'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.option_refresh'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const confirmShippingDialogPriceValue = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.save.blocked'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.price_confirmed'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.save_ready'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.save.attempt'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.save.applied'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'non-interactive-delivery-trigger'");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("inputMethod === 'type'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('selectionRefreshApplied: Boolean(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('selectionRefreshFinalChecked: selectionRefresh?.finalChecked ?? null');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('optionDataState: optionMetadata?.dataState ?? null,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('priceInputRequired: priceInputMetadata?.required ?? null,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('clickOptions: { timeout: 5_000 }');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const acknowledgeListingConfirmationIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForPublishReadiness = async (publishButton, timeoutMs = 6_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("fieldKey: 'delivery-price'");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("field: 'listing-confirmation'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('Tradera listing confirmation checkbox could not be acknowledged.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.ready'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.ready_timeout'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('Autofilling your listing');
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.sell_page.homepage_detected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.sell_page.homepage_retry'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("entryPoint = await openCreateListingPage();");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("entryPoint = await confirmStableSellPage();");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "listingAction === 'sync' ? 'sync listing-editor bootstrap' : 'listing-editor bootstrap'"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "context: listingAction === 'sync' ? 'sync-editor-ready' : 'listing-editor-ready',"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const initialStartUrl =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("emitStage(listingAction === 'sync' ? 'sync_target_loaded' : 'active_loaded');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await ensureImageStepSellPageReady('image input resolution');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("inputMethod: 'paste'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const setTextFieldDirectly = async (locator, value) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain("tradera.quicklist.sell_page.homepage_redirect_recovery");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.draft.unsettled_continue'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "const confirmationDraftState = await waitForDraftSaveSettled(6_000, 1_200);"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.selection_pending'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish. Last state: ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const baselinePreviewCount = await countUploadedImagePreviews();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await advancePastImagesStep(imageInput, expectedUploadCount, baselinePreviewCount);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const performImageUpload = async (uploadFiles, uploadSource) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let currentImageUploadSource = null;\n\n  try {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let currentImageUploadSource = null;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('currentImageUploadSource = uploadSource;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const tryPreserveRelistEditorImages = async (uploadAttempt) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.relist_preserve_check'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.relist_preserved'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("currentImageUploadSource = 'preserved-relist';");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("imageUploadResult?.uploadSource === 'preserved-relist'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'relist-editor-ready'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clickResidualContinueButton = async (button) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const resolveTitleAndDescriptionInputs = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.field.selector_retry'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'image-step-continue'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.field.selector_missing'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const { titleInput, descriptionInput } = await resolveTitleAndDescriptionInputs();'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await ensureImageStepSellPageReady('image upload dispatch');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.upload_dispatch_error'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await ensureImageStepSellPageReady('image upload dispatch retry');");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.retry_download'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("initialUploadSource === 'local' && imageUrls.length > 0");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("imageUploadSource: imageUploadResult?.uploadSource ?? null");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('imageUploadSource: currentImageUploadSource,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("emitStage('category_selected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("emitStage('listing_format_selected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("emitStage('listing_attributes_selected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("emitStage('delivery_configured'");
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
      "reason: 'already-matched'"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const applyConfiguredExtraFieldSelections = async () => {'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_EXTRA_FIELD_SET: Required Tradera field "');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_EXTRA_FIELD_SET: Required Tradera option "');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await trySelectOptionalFieldValue({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const listingFormatTrigger = await findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const FIXED_PRICE_INPUT_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.listing_format.inferred'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await fillTitleAndDescription();");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await fillPriceField({ required: true, context: 'post-listing-format' });");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("context: 'delivery-configuration',");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("context: 'pre-publish-finalize',");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'already-matched'");
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await fillTitleAndDescription();')
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await chooseBuyNowListingFormat();')
    );
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf('await chooseBuyNowListingFormat();')
    ).toBeLessThan(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf(
        "await fillPriceField({ required: true, context: 'post-listing-format' });"
      )
    );
    expect(
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf(
        "await fillPriceField({ required: true, context: 'post-listing-format' });"
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
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf("context: 'pre-publish-finalize',")
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'fixed-price-input-visible'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isSafeDraftImageRemoveControl = async (locator) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('return !resolveExternalClickTargetUrl(metadata);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('if (visible && (await isSafeDraftImageRemoveControl(candidate))) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const safeDraftRemoveControl = await isSafeDraftImageRemoveControl(candidate);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForImageStepActionable = async (timeoutMs = 20_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("type: 'continue'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_IMAGE_SET_INVALID: Tradera image step never became actionable after upload. State: '
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('imageStepState: finalImageStepState,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("fieldKey: 'condition'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("fieldKey: 'department'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("fieldKey: 'delivery'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('for (const optionLabel of BUY_NOW_OPTION_LABELS)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("requiredOptionLabel: configuredDeliveryOptionLabel");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("failureCode: 'FAIL_SHIPPING_SET'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const hasDeliveryValidationIssue = (messages) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await acknowledgeListingConfirmationIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_SHIPPING_SET: ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let publishReadiness = await waitForPublishReadiness(publishButton);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const listingConfirmationState = await acknowledgeListingConfirmationIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForPublishInteractionEvidence = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "timeoutMs = listingAction === 'relist' ? 12_000 : 8_000"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const recoverPublishConfirmationViaDuplicateSearch = async ('
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.click_result', publishInteraction);");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      "log?.('tradera.quicklist.publish.recovered_via_active_listings', {"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const activeListingsVisible = currentUrl.toLowerCase().includes(\'/my/listings\');');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const publishTargetMetadata = await readClickTargetMetadata(publishButton);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await logClickTarget('publish', publishButton);");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await captureFailureArtifacts('publish-click', {");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await captureFailureArtifacts('publish-click-not-confirmed', {");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_PUBLISH_CLICK: Tradera publish button click failed. ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_PUBLISH_CLICK: Publish button click did not trigger an observable Tradera publish interaction.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let prePublishValidationMessages = publishReadiness.messages;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("context: 'publish-readiness-recovery',");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("context: 'category-and-details',");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const duplicateMatches = await collectListingLinksForTerm(searchTerm);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const inspectionCandidates = duplicateMatches;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("candidateScanMode: 'exact-english-title-search-matches-only',");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const nonExactVisibleCandidateCount = visibleCandidates.filter(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('for (const candidate of [...duplicateMatches, ...visibleCandidates]) {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const uncertainSearch =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'FAIL_DUPLICATE_UNCERTAIN: Active listings search results could not be confirmed for duplicate detection.'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("searchStateChanged,");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("stage: 'duplicate_linked'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('duplicateLinked: true,');
    // Post-publish: notification modal dismiss + listing link extraction
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('NOTIFICATION_MODAL_DISMISS_LABELS');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const dismissPostPublishNotificationModal = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const extractPostPublishListingLink = async (');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.notification_dismiss',");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.link_extracted',");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.link_not_found',");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await dismissPostPublishNotificationModal();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const extracted = await extractPostPublishListingLink();');
    // Removed functions should no longer be present
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('waitForPostPublishNavigation');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('verifyPublishedListingViaActiveSearch');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('findPublishedListingMatchOnCurrentPage');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('summarizePostPublishState');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain('FAIL_PUBLISH_STUCK');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain(
      "await Promise.allSettled([\n      page.waitForLoadState('domcontentloaded', { timeout: 25_000 }),\n      humanClick(publishButton, { pauseAfter: false }),\n    ]);"
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain(
      'if (!externalListingId && postPublishNavigation.activeListingsVisible) {\n      await page.goto(ACTIVE_URL'
    );
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(
      'const effectiveExternalListingId = externalListingId || existingExternalListingId || null;'
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
      DEFAULT_TRADERA_QUICKLIST_SCRIPT.indexOf("log?.('tradera.quicklist.delivery.price_set'")
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

describe('runTraderaBrowserListing scripted mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessMock.mockResolvedValue(undefined);
    copyFileMock.mockResolvedValue(undefined);
    mkdtempMock.mockResolvedValue('/tmp/tradera-browser-test');
    statMock.mockResolvedValue({
      isFile: () => true,
      size: 20_000,
    });
    getCategoryByIdMock.mockResolvedValue(null);
    listCategoriesMock.mockResolvedValue([]);
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: 'Example title',
      description_en: 'Example description',
      price: 123,
      imageLinks: ['https://cdn.example.com/a.jpg'],
      images: [
        {
          imageFile: {
            filepath: '/uploads/products/SKU-1/example.png',
          },
        },
      ],
    });
    listCategoryMappingsMock.mockResolvedValue([
      {
        id: 'mapping-1',
        connectionId: 'connection-1',
        externalCategoryId: '101',
        internalCategoryId: 'internal-category-1',
        catalogId: 'catalog-1',
        isActive: true,
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
        externalCategory: {
          id: 'external-category-101',
          connectionId: 'connection-1',
          externalId: '101',
          name: 'Pins',
          parentExternalId: '100',
          path: 'Collectibles > Pins',
          depth: 1,
          isLeaf: true,
          metadata: null,
          fetchedAt: '2026-04-02T10:00:00.000Z',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
        internalCategory: {
          id: 'internal-category-1',
          name: 'Pins',
          description: null,
          color: null,
          parentId: null,
          catalogId: 'catalog-1',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
      },
    ]);
    resolveTraderaShippingGroupResolutionForProductMock.mockResolvedValue({
      shippingGroup: {
        id: 'shipping-group-1',
        name: 'Small parcel',
        catalogId: 'catalog-1',
        traderaShippingCondition: 'Buyer pays shipping',
        traderaShippingPriceEur: 5,
        autoAssignCategoryIds: [],
      },
      shippingGroupId: 'shipping-group-1',
      shippingCondition: 'Buyer pays shipping',
      shippingPriceEur: 5,
      shippingGroupSource: 'manual',
      reason: 'mapped',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: ['shipping-group-1'],
    });
    resolveTraderaListingPriceForProductMock.mockResolvedValue({
      listingPrice: 55,
      listingCurrencyCode: 'EUR',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: true,
      basePrice: 123,
      baseCurrencyCode: 'PLN',
      priceSource: 'price_group_target_currency',
      reason: 'resolved_target_currency',
      defaultPriceGroupId: 'price-group-pln',
      catalogDefaultPriceGroupId: 'price-group-pln',
      catalogId: 'catalog-1',
      catalogPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      loadedPriceGroupIds: ['price-group-pln', 'price-group-eur'],
      matchedTargetPriceGroupIds: ['price-group-eur'],
    });
    listParametersMock.mockResolvedValue([]);
    resolveConnectionPlaywrightSettingsMock.mockResolvedValue({
      headless: true,
      slowMo: 85,
      timeout: 30000,
      navigationTimeout: 45000,
      humanizeMouse: true,
      mouseJitter: 12,
      clickDelayMin: 40,
      clickDelayMax: 140,
      inputDelayMin: 30,
      inputDelayMax: 110,
      actionDelayMin: 220,
      actionDelayMax: 800,
      proxyEnabled: false,
      proxyServer: '',
      proxyUsername: '',
      proxyPassword: '',
      emulateDevice: false,
      deviceName: 'Desktop Chrome',
    });
  });

  it('returns scripted run metadata on success', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-123',
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/123' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        relistPolicy: {
          enabled: true,
          leadMinutes: 30,
          durationHours: 48,
          templateId: 'template-1',
        },
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: 'export default async function run() {}',
        timeoutMs: 240_000,
        browserMode: 'headed',
        disableStartUrlBootstrap: true,
        failureHoldOpenMs: 30_000,
        input: expect.objectContaining({
          listingAction: 'list',
          existingExternalListingId: null,
          baseProductId: 'BASE-1',
          duplicateSearchTitle: 'Example title',
          duplicateSearchTerms: ['Example title'],
          rawDescriptionEn: 'Example description',
          sku: 'SKU-1',
          title: 'Example title',
          description: 'Example description | Product ID: BASE-1 | SKU: SKU-1',
          price: 55,
          localImagePaths: [],
          imageUrls: [
            'http://localhost:3000/uploads/products/SKU-1/example.png',
            'https://cdn.example.com/a.jpg',
          ],
          traderaImageOrder: {
            strategy: 'download-ordered',
            imageCount: 2,
            localImageCoverageCount: 1,
          },
          traderaConfig: {
            listingFormUrl: 'https://www.tradera.com/en/selling/new',
          },
          traderaCategory: {
            externalId: '101',
            name: 'Pins',
            path: 'Collectibles > Pins',
            segments: ['Collectibles', 'Pins'],
            internalCategoryId: 'internal-category-1',
            catalogId: 'catalog-1',
          },
          traderaCategoryMapping: {
            reason: 'mapped',
            matchScope: 'catalog_match',
            internalCategoryId: 'internal-category-1',
            productCatalogIds: ['catalog-1'],
            matchingMappingCount: 1,
            validMappingCount: 1,
            catalogMatchedMappingCount: 1,
          },
          traderaPricing: {
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
          },
          traderaShipping: {
            shippingGroupId: 'shipping-group-1',
            shippingGroupName: 'Small parcel',
            shippingGroupCatalogId: 'catalog-1',
            shippingGroupSource: 'manual',
            shippingCondition: 'Buyer pays shipping',
            shippingPriceEur: 5,
            reason: 'mapped',
            matchedCategoryRuleIds: [],
            matchingShippingGroupIds: ['shipping-group-1'],
          },
        }),
      })
    );
    expect(listParametersMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'custom',
        scriptMarker: null,
        scriptStoredOnConnection: true,
        runId: 'run-123',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        browserMode: 'headed',
        playwrightPersonaId: null,
        playwrightSettings: {
          headless: false,
          slowMo: 85,
          timeout: 30000,
          navigationTimeout: 45000,
          humanizeMouse: true,
          mouseJitter: 12,
          clickDelayMin: 40,
          clickDelayMax: 140,
          inputDelayMin: 30,
          inputDelayMax: 110,
          actionDelayMin: 220,
          actionDelayMax: 800,
          proxyEnabled: false,
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
        rawResult: { listingUrl: 'https://www.tradera.com/item/123' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'remote',
        imageUploadSource: null,
        localImagePathCount: 0,
        imageUrlCount: 2,
        ...EXPECTED_TRADERA_PRICING_METADATA,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: 'categoryMapper',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingGroupSource: 'manual',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: ['shipping-group-1'],
      },
    });
  });

  it('injects resolved Tradera extra field selections into the scripted listing input', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: 'Example title',
      description_en: 'Example description',
      price: 123,
      imageLinks: ['https://cdn.example.com/a.jpg'],
      images: [
        {
          imageFile: {
            filepath: '/uploads/products/SKU-1/example.png',
          },
        },
      ],
      parameters: [{ parameterId: 'param-metal', value: 'Metal' }],
    });
    listParametersMock.mockResolvedValue([
      {
        id: 'param-metal',
        catalogId: 'catalog-1',
        name: 'Metal',
        name_en: 'Metal',
        name_pl: null,
        name_de: null,
        selectorType: 'select',
        optionLabels: ['Metal'],
      },
    ]);
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-parameter-mapper',
      externalListingId: 'listing-parameter-mapper',
      listingUrl: 'https://www.tradera.com/item/parameter-mapper',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/parameter-mapper' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-parameter-mapper',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
        traderaParameterMapperRulesJson: JSON.stringify({
          version: 1,
          rules: [
            {
              id: 'rule-1',
              externalCategoryId: '101',
              externalCategoryName: 'Pins',
              externalCategoryPath: 'Collectibles > Pins',
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              parameterId: 'param-metal',
              parameterName: 'Metal',
              parameterCatalogId: 'catalog-1',
              sourceValue: 'Metal',
              targetOptionLabel: '24K',
              isActive: true,
              createdAt: '2026-04-08T10:00:00.000Z',
              updatedAt: '2026-04-08T10:05:00.000Z',
            },
          ],
        }),
        traderaParameterMapperCatalogJson: JSON.stringify({
          version: 1,
          entries: [
            {
              id: '101:jewellerymaterial',
              externalCategoryId: '101',
              externalCategoryName: 'Pins',
              externalCategoryPath: 'Collectibles > Pins',
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              optionLabels: ['18K', '24K'],
              source: 'playwright',
              fetchedAt: '2026-04-08T10:00:00.000Z',
              runId: 'run-catalog-1',
            },
          ],
        }),
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(listParametersMock).toHaveBeenCalledWith({ catalogId: 'catalog-1' });
    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          traderaExtraFieldSelections: [
            {
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              optionLabel: '24K',
              parameterId: 'param-metal',
              parameterName: 'Metal',
              sourceValue: 'Metal',
            },
          ],
        }),
      })
    );
  });

  it('does not use Polish-only names in Tradera duplicate search input', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: null,
      name_pl: 'Polski tytul',
      description_en: null,
      description_pl: 'Opis produktu',
      price: 123,
      imageLinks: ['https://cdn.example.com/a.jpg'],
      images: [
        {
          imageFile: {
            filepath: '/uploads/products/SKU-1/example.png',
          },
        },
      ],
    });
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-polish-name',
      externalListingId: 'listing-polish-name',
      listingUrl: 'https://www.tradera.com/item/456',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/456' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-polish-name',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          title: 'Polski tytul',
          duplicateSearchTitle: null,
          duplicateSearchTerms: [],
        }),
      })
    );
  });

  it('passes the persisted Tradera listing url into scripted sync input', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-sync-123',
      listingUrl: 'https://www.tradera.com/item/external-existing',
      publishVerified: true,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        stage: 'sync_verified',
        listingUrl: 'https://www.tradera.com/item/external-existing',
      },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/external-existing',
        },
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'sync',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          listingAction: 'sync',
          existingExternalListingId: 'external-existing',
          existingListingUrl: 'https://www.tradera.com/item/external-existing',
        }),
      })
    );
  });

  it('sets syncSkipImages=true in script input when syncSkipImages is passed for a sync action', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-sync-skip-images',
      listingUrl: 'https://www.tradera.com/item/external-existing',
      publishVerified: true,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        stage: 'sync_verified',
        listingUrl: 'https://www.tradera.com/item/external-existing',
      },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/external-existing',
        },
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'sync',
      browserMode: 'headed',
      syncSkipImages: true,
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          listingAction: 'sync',
          syncSkipImages: true,
        }),
      })
    );
  });

  it('sets syncSkipImages=false in script input when syncSkipImages is not set for a sync action', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-sync-with-images',
      listingUrl: 'https://www.tradera.com/item/external-existing',
      publishVerified: true,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        stage: 'sync_verified',
        listingUrl: 'https://www.tradera.com/item/external-existing',
      },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
        marketplaceData: {
          listingUrl: 'https://www.tradera.com/item/external-existing',
        },
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'sync',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          listingAction: 'sync',
          syncSkipImages: false,
        }),
      })
    );
  });

  it('forces syncSkipImages=false in script input when syncSkipImages=true is passed for a non-sync action', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-list-no-skip',
      externalListingId: 'new-listing-id',
      listingUrl: 'https://www.tradera.com/item/new-listing-id',
      publishVerified: true,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/new-listing-id' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
      syncSkipImages: true,
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          listingAction: 'list',
          syncSkipImages: false,
        }),
      })
    );
  });

  it('passes an inherited mapped category into quicklist input when only a parent category is mapped', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'anime-pins',
      catalogId: 'catalog-primary',
      catalogs: [{ catalogId: 'catalog-primary' }, { catalogId: 'catalog-jewellery' }],
      name_en: 'Example title',
      description_en: 'Example description',
      price: 123,
      imageLinks: ['https://cdn.example.com/a.jpg'],
      images: [
        {
          imageFile: {
            filepath: '/uploads/products/SKU-1/example.png',
          },
        },
      ],
    });
    listCategoryMappingsMock.mockResolvedValue([
      {
        id: 'mapping-parent',
        connectionId: 'connection-1',
        externalCategoryId: '101',
        internalCategoryId: 'jewellery-pins',
        catalogId: 'catalog-jewellery',
        isActive: true,
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
        externalCategory: {
          id: 'external-category-101',
          connectionId: 'connection-1',
          externalId: '101',
          name: 'Pins & Needles',
          parentExternalId: '100',
          path: 'Collectibles > Pins & Needles',
          depth: 1,
          isLeaf: true,
          metadata: null,
          fetchedAt: '2026-04-02T10:00:00.000Z',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
        internalCategory: {
          id: 'jewellery-pins',
          name: 'Pins',
          description: null,
          color: null,
          parentId: 'jewellery',
          catalogId: 'catalog-jewellery',
          createdAt: '2026-04-02T10:00:00.000Z',
          updatedAt: '2026-04-02T10:00:00.000Z',
        },
      },
    ]);
    getCategoryByIdMock.mockResolvedValue({
      id: 'anime-pins',
      name: 'Anime Pins',
      description: null,
      color: null,
      parentId: 'jewellery-pins',
      catalogId: 'catalog-jewellery',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z',
    });
    listCategoriesMock.mockResolvedValue([
      {
        id: 'jewellery',
        name: 'Jewellery',
        description: null,
        color: null,
        parentId: null,
        catalogId: 'catalog-jewellery',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
      {
        id: 'jewellery-pins',
        name: 'Pins',
        description: null,
        color: null,
        parentId: 'jewellery',
        catalogId: 'catalog-jewellery',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
      {
        id: 'anime-pins',
        name: 'Anime Pins',
        description: null,
        color: null,
        parentId: 'jewellery-pins',
        catalogId: 'catalog-jewellery',
        createdAt: '2026-04-02T10:00:00.000Z',
        updatedAt: '2026-04-02T10:00:00.000Z',
      },
    ]);
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-parent-mapped',
      externalListingId: 'listing-parent-mapped',
      listingUrl: 'https://www.tradera.com/item/parent-mapped',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        listingUrl: 'https://www.tradera.com/item/parent-mapped',
        categoryPath: 'Collectibles > Pins & Needles',
        categorySource: 'categoryMapper',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(getCategoryByIdMock).toHaveBeenCalledWith('anime-pins');
    expect(listCategoriesMock).toHaveBeenCalledWith({ catalogId: 'catalog-jewellery' });
    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          traderaCategory: {
            externalId: '101',
            name: 'Pins & Needles',
            path: 'Collectibles > Pins & Needles',
            segments: ['Collectibles', 'Pins & Needles'],
            internalCategoryId: 'jewellery-pins',
            catalogId: 'catalog-jewellery',
          },
          traderaCategoryMapping: expect.objectContaining({
            reason: 'mapped_via_parent',
            matchScope: 'catalog_match',
            internalCategoryId: 'anime-pins',
            productCatalogIds: ['catalog-primary', 'catalog-jewellery'],
          }),
        }),
      })
    );
    expect(result).toMatchObject({
      externalListingId: 'listing-parent-mapped',
      listingUrl: 'https://www.tradera.com/item/parent-mapped',
      metadata: {
        categoryMappingReason: 'mapped_via_parent',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'anime-pins',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins & Needles',
        categorySource: 'categoryMapper',
      },
    });
  });

  it('derives the external listing id from modern Tradera item urls when the runner omits it', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-modern-url',
      externalListingId: null,
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        listingUrl:
          'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-modern-url',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(result).toMatchObject({
      externalListingId: '725447805',
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      metadata: expect.objectContaining({
        runId: 'run-modern-url',
        publishVerified: true,
      }),
    });
  });

  it('returns duplicate-linked success metadata when quicklist links an existing Tradera listing', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-duplicate-linked',
      externalListingId: '725447805',
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      publishVerified: false,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        stage: 'duplicate_linked',
        currentUrl:
          'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
        externalListingId: '725447805',
        listingUrl:
          'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
        duplicateLinked: true,
        duplicateMatchStrategy: 'title+product-id',
        duplicateMatchedProductId: 'BASE-1',
        duplicateCandidateCount: 2,
        duplicateSearchTitle: 'Example title',
        categorySource: null,
        categoryPath: null,
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-duplicate-linked',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(result).toMatchObject({
      externalListingId: '725447805',
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      metadata: expect.objectContaining({
        runId: 'run-duplicate-linked',
        publishVerified: false,
        latestStage: 'duplicate_linked',
        latestStageUrl:
          'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
        duplicateLinked: true,
        duplicateMatchStrategy: 'title+product-id',
        duplicateMatchedProductId: 'BASE-1',
        duplicateCandidateCount: 2,
        duplicateSearchTitle: 'Example title',
        categorySource: null,
        categoryPath: null,
      }),
    });
  });

  it('keeps publish-verified modern Tradera item urls successful even when raw draft metadata still reports Loading', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-modern-url-loading-draft',
      externalListingId: null,
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        stage: 'publish_verified',
        currentUrl: 'https://www.tradera.com/en/selling/draft/69d2a549aa5fcd00016e7a06',
        validationMessages: ['Loading'],
        listingUrl:
          'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-modern-url-loading-draft',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(result).toMatchObject({
      externalListingId: '725447805',
      listingUrl:
        'https://www.tradera.com/en/item/2805/725447805/slave-i-5-cm-metal-movie-keychain-star-wars',
      metadata: expect.objectContaining({
        runId: 'run-modern-url-loading-draft',
        publishVerified: true,
        latestStage: 'publish_verified',
        latestStageUrl: 'https://www.tradera.com/en/selling/draft/69d2a549aa5fcd00016e7a06',
        rawResult: expect.objectContaining({
          validationMessages: ['Loading'],
        }),
      }),
    });
  });

  it('records runtime fallback metadata when the mapped Tradera category is unavailable in the browser flow', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-fallback-from-mapped',
      externalListingId: 'listing-fallback-from-mapped',
      listingUrl: 'https://www.tradera.com/item/fallback-from-mapped',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        listingUrl: 'https://www.tradera.com/item/fallback-from-mapped',
        categoryPath: 'Other > Other',
        categorySource: 'fallback',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          traderaCategory: expect.objectContaining({
            externalId: '101',
            path: 'Collectibles > Pins',
          }),
        }),
      })
    );
    expect(result).toMatchObject({
      externalListingId: 'listing-fallback-from-mapped',
      listingUrl: 'https://www.tradera.com/item/fallback-from-mapped',
      metadata: {
        categoryMappingReason: 'mapped',
        categoryId: null,
        categoryPath: 'Other > Other',
        categorySource: 'fallback',
      },
    });
  });

  it('allows scripted publish success without immediate external listing id when publish was verified', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-url-only-success',
      externalListingId: null,
      listingUrl: null,
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        stage: 'publish_verified',
        currentUrl: 'https://www.tradera.com/en/my/listings?tab=active',
        publishVerified: true,
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(result).toMatchObject({
      externalListingId: null,
      listingUrl: undefined,
      metadata: {
        runId: 'run-url-only-success',
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'custom',
        publishVerified: true,
        latestStage: 'publish_verified',
        latestStageUrl: 'https://www.tradera.com/en/my/listings?tab=active',
      },
    });
  });

  it('falls back to Other > Other when the Tradera category mapper has no active mapping', async () => {
    listCategoryMappingsMock.mockResolvedValue([]);
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-fallback-no-mapping',
      externalListingId: 'listing-fallback-no-mapping',
      listingUrl: 'https://www.tradera.com/item/fallback-no-mapping',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        listingUrl: 'https://www.tradera.com/item/fallback-no-mapping',
        categoryPath: 'Other > Other',
        categorySource: 'fallback',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        relistPolicy: {
          enabled: true,
          leadMinutes: 30,
          durationHours: 48,
          templateId: 'template-1',
        },
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    const playwrightInput = runPlaywrightListingScriptMock.mock.calls[0]?.[0]?.input as
      | Record<string, unknown>
      | undefined;

    expect(playwrightInput).toBeDefined();
    expect(playwrightInput).not.toHaveProperty('traderaCategory');
    expect(playwrightInput).toMatchObject({
      traderaCategoryMapping: {
        reason: 'no_active_mapping',
        matchScope: 'none',
        internalCategoryId: 'internal-category-1',
        matchingMappingCount: 0,
        validMappingCount: 0,
        catalogMatchedMappingCount: 0,
      },
    });
    expect(result).toMatchObject({
      externalListingId: 'listing-fallback-no-mapping',
      listingUrl: 'https://www.tradera.com/item/fallback-no-mapping',
      metadata: {
        categoryMappingReason: 'no_active_mapping',
        categoryMatchScope: 'none',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: null,
        categoryPath: 'Other > Other',
        categorySource: 'fallback',
      },
    });
  });

  it('preserves the autofilled Tradera category when no category mapping is available', async () => {
    listCategoryMappingsMock.mockResolvedValue([]);
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-autofill-no-mapping',
      externalListingId: 'listing-autofill-no-mapping',
      listingUrl: 'https://www.tradera.com/item/autofill-no-mapping',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: {
        listingUrl: 'https://www.tradera.com/item/autofill-no-mapping',
        categoryPath: 'Accessories > Patches & pins > Pins',
        categorySource: 'autofill',
      },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    const playwrightInput = runPlaywrightListingScriptMock.mock.calls[0]?.[0]?.input as
      | Record<string, unknown>
      | undefined;

    expect(playwrightInput).toBeDefined();
    expect(playwrightInput).not.toHaveProperty('traderaCategory');
    expect(playwrightInput).toMatchObject({
      traderaCategoryMapping: {
        reason: 'no_active_mapping',
        matchScope: 'none',
      },
    });
    expect(result).toMatchObject({
      externalListingId: 'listing-autofill-no-mapping',
      listingUrl: 'https://www.tradera.com/item/autofill-no-mapping',
      metadata: {
        categoryMappingReason: 'no_active_mapping',
        categoryMatchScope: 'none',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: null,
        categoryPath: 'Accessories > Patches & pins > Pins',
        categorySource: 'autofill',
      },
    });
  });

  it('does not inject Tradera extra field selections when category strategy is top_suggested', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: 'Example title',
      description_en: 'Example description',
      price: 123,
      imageLinks: ['https://cdn.example.com/a.jpg'],
      images: [
        {
          imageFile: {
            filepath: '/uploads/products/SKU-1/example.png',
          },
        },
      ],
      parameters: [{ parameterId: 'param-metal', value: 'Metal' }],
    });
    listParametersMock.mockResolvedValue([
      {
        id: 'param-metal',
        catalogId: 'catalog-1',
        name: 'Metal',
        name_en: 'Metal',
        name_pl: null,
        name_de: null,
        selectorType: 'select',
        optionLabels: ['Metal'],
      },
    ]);
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-top-suggested',
      externalListingId: 'listing-top-suggested',
      listingUrl: 'https://www.tradera.com/item/top-suggested',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/top-suggested' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-top-suggested',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        traderaCategoryStrategy: 'top_suggested',
        playwrightListingScript: 'export default async function run() {}',
        traderaParameterMapperRulesJson: JSON.stringify({
          version: 1,
          rules: [
            {
              id: 'rule-1',
              externalCategoryId: '101',
              externalCategoryName: 'Pins',
              externalCategoryPath: 'Collectibles > Pins',
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              parameterId: 'param-metal',
              parameterName: 'Metal',
              parameterCatalogId: 'catalog-1',
              sourceValue: 'Metal',
              targetOptionLabel: '24K',
              isActive: true,
              createdAt: '2026-04-08T10:00:00.000Z',
              updatedAt: '2026-04-08T10:05:00.000Z',
            },
          ],
        }),
        traderaParameterMapperCatalogJson: JSON.stringify({
          version: 1,
          entries: [
            {
              id: '101:jewellerymaterial',
              externalCategoryId: '101',
              externalCategoryName: 'Pins',
              externalCategoryPath: 'Collectibles > Pins',
              fieldLabel: 'Jewellery Material',
              fieldKey: 'jewellerymaterial',
              optionLabels: ['18K', '24K'],
              source: 'playwright',
              fetchedAt: '2026-04-08T10:00:00.000Z',
              runId: 'run-catalog-1',
            },
          ],
        }),
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    const playwrightInput = runPlaywrightListingScriptMock.mock.calls[0]?.[0]?.input as
      | Record<string, unknown>
      | undefined;

    expect(playwrightInput).toBeDefined();
    expect(playwrightInput).toMatchObject({
      categoryStrategy: 'top_suggested',
    });
    expect(listParametersMock).not.toHaveBeenCalled();
    expect(playwrightInput).not.toHaveProperty('traderaCategory');
    expect(playwrightInput).not.toHaveProperty('traderaExtraFieldSelections');
  });

  it('fails before launching the scripted runner when Tradera shipping price is missing', async () => {
    resolveTraderaShippingGroupResolutionForProductMock.mockResolvedValue({
      shippingGroup: null,
      shippingGroupId: null,
      shippingCondition: null,
      shippingPriceEur: null,
      shippingGroupSource: null,
      reason: 'missing_shipping_group',
      matchedCategoryRuleIds: [],
      matchingShippingGroupIds: [],
    });

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message:
        'Tradera export requires a shipping group with a Tradera shipping price in EUR. Assign or configure a shipping group with the EUR price and retry.',
      meta: expect.objectContaining({
        productId: 'product-1',
        productShippingGroupId: null,
        connectionId: 'connection-1',
        shippingGroupResolutionReason: 'missing_shipping_group',
        shippingGroupId: null,
        shippingGroupSource: null,
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: [],
      }),
    });

    expect(runPlaywrightListingScriptMock).not.toHaveBeenCalled();
  });

  it('fails before launching the scripted runner when Tradera listing price cannot be resolved to EUR', async () => {
    resolveTraderaListingPriceForProductMock.mockResolvedValue({
      listingPrice: 123,
      listingCurrencyCode: 'PLN',
      targetCurrencyCode: 'EUR',
      resolvedToTargetCurrency: false,
      basePrice: 123,
      baseCurrencyCode: 'PLN',
      priceSource: 'base_price_fallback',
      reason: 'target_currency_unresolved',
      defaultPriceGroupId: 'price-group-pln',
      catalogDefaultPriceGroupId: 'price-group-pln',
      catalogId: 'catalog-1',
      catalogPriceGroupIds: ['price-group-pln'],
      loadedPriceGroupIds: ['price-group-pln'],
      matchedTargetPriceGroupIds: [],
    });

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: 'FAIL_PRICE_RESOLUTION: Tradera listing price could not be resolved to EUR.',
      meta: expect.objectContaining({
        mode: 'scripted',
        productId: 'product-1',
        listingId: 'listing-1',
        connectionId: 'connection-1',
        listingPrice: 123,
        listingCurrencyCode: 'PLN',
        targetCurrencyCode: 'EUR',
        resolvedToTargetCurrency: false,
        basePrice: 123,
        baseCurrencyCode: 'PLN',
        priceSource: 'base_price_fallback',
        priceResolutionReason: 'target_currency_unresolved',
      }),
    });

    expect(runPlaywrightListingScriptMock).not.toHaveBeenCalled();
  });

  it('sanitizes invalid Tradera listing form urls before passing them to the scripted flow', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-invalid-url',
      externalListingId: 'listing-invalid-url',
      listingUrl: 'https://www.tradera.com/item/777',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/777' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.facebook.com/Tradera',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          traderaConfig: {
            listingFormUrl: 'https://www.tradera.com/en/selling/new',
          },
        }),
      })
    );
  });

  it('resolves local Tradera image uploads from public image URLs and local imageLinks when filepath is absent', async () => {
    getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'BASE-1',
      categoryId: 'internal-category-1',
      catalogId: 'catalog-1',
      catalogs: [{ catalogId: 'catalog-1' }],
      name_en: 'Example title',
      description_en: 'Example description',
      price: 123,
      imageLinks: ['http://localhost:3000/uploads/products/SKU-1/link-only.png'],
      images: [
        {
          imageFile: {
            filepath: 'https://cdn.example.com/remote-only.png',
            publicUrl: 'http://localhost:3000/uploads/products/SKU-1/public-only.png',
            url: 'http://localhost:3000/uploads/products/SKU-1/public-only.png',
          },
        },
      ],
    });
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-public-url',
      externalListingId: 'listing-public-url',
      listingUrl: 'https://www.tradera.com/item/555',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/555' },
    });

    await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() {}',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          localImagePaths: [
            expect.stringContaining('/tmp/'),
            expect.stringContaining('/tmp/'),
          ],
          imageUrls: [
            'http://localhost:3000/uploads/products/SKU-1/public-only.png',
            'http://localhost:3000/uploads/products/SKU-1/link-only.png',
          ],
          traderaImageOrder: {
            strategy: 'local-complete',
            imageCount: 2,
            localImageCoverageCount: 2,
          },
        }),
      })
    );
    const input = runPlaywrightListingScriptMock.mock.calls[0]?.[0]?.input as
      | Record<string, unknown>
      | undefined;
    expect(input).toBeDefined();
    expect((input?.['localImagePaths'] as string[])?.map((value) => new URL(`file://${value}`).pathname.split('/').pop())).toEqual([
      'BASE-1_01.png',
      'BASE-1_02.png',
    ]);
  });

  it('refreshes legacy default scripts that still rely on dynamic imports', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-456',
      externalListingId: 'listing-456',
      listingUrl: 'https://www.tradera.com/item/456',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/456' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript:
          "export default async function run() { const fs = await import('node:fs/promises'); return fs; }\n// tradera-quicklist",
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
        runtimeSettingsOverrides: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: null,
    });
    expect(result).toEqual({
      externalListingId: 'listing-456',
      listingUrl: 'https://www.tradera.com/item/456',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v118',
        scriptStoredOnConnection: false,
        runId: 'run-456',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        browserMode: 'headed',
        playwrightPersonaId: null,
        managedQuicklistDesktopMode: true,
        playwrightSettings: {
          headless: false,
          slowMo: 85,
          timeout: 30000,
          navigationTimeout: 45000,
          humanizeMouse: true,
          mouseJitter: 12,
          clickDelayMin: 40,
          clickDelayMax: 140,
          inputDelayMin: 30,
          inputDelayMax: 110,
          actionDelayMin: 220,
          actionDelayMax: 800,
          proxyEnabled: false,
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
        rawResult: { listingUrl: 'https://www.tradera.com/item/456' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'remote',
        imageUploadSource: null,
        localImagePathCount: 0,
        imageUrlCount: 2,
        ...EXPECTED_TRADERA_PRICING_METADATA,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: 'categoryMapper',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingGroupSource: 'manual',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: ['shipping-group-1'],
      },
    });
  });

  it('refreshes stale managed default scripts that predate the selling-page handoff fix', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-789',
      externalListingId: 'listing-789',
      listingUrl: 'https://www.tradera.com/item/789',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/789' },
    });

    const staleManagedDefaultScript = `export default async function run({ page, input, emit, log }) {
  // tradera-quicklist-default:v85
  const ACTIVE_URL = 'https://www.tradera.com/en/my/listings?tab=active';
  log?.('tradera.quicklist.start', { baseProductId: input?.baseProductId ?? null });
  throw new Error('FAIL_SELL_PAGE_INVALID: Tradera create listing page did not load.');
}`;

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: staleManagedDefaultScript,
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
        runtimeSettingsOverrides: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: null,
    });
    expect(result).toEqual({
      externalListingId: 'listing-789',
      listingUrl: 'https://www.tradera.com/item/789',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v118',
        scriptStoredOnConnection: false,
        runId: 'run-789',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        browserMode: 'headed',
        playwrightPersonaId: null,
        managedQuicklistDesktopMode: true,
        playwrightSettings: {
          headless: false,
          slowMo: 85,
          timeout: 30000,
          navigationTimeout: 45000,
          humanizeMouse: true,
          mouseJitter: 12,
          clickDelayMin: 40,
          clickDelayMax: 140,
          inputDelayMin: 30,
          inputDelayMax: 110,
          actionDelayMin: 220,
          actionDelayMax: 800,
          proxyEnabled: false,
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
        rawResult: { listingUrl: 'https://www.tradera.com/item/789' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'remote',
        imageUploadSource: null,
        localImagePathCount: 0,
        imageUrlCount: 2,
        ...EXPECTED_TRADERA_PRICING_METADATA,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: 'categoryMapper',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingGroupSource: 'manual',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: ['shipping-group-1'],
      },
    });
  });

  it('refreshes managed scripts with the current marker when the stored body is stale', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-790',
      externalListingId: 'listing-790',
      listingUrl: 'https://www.tradera.com/item/790',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/790' },
    });

    const staleMarkedManagedScript = DEFAULT_TRADERA_QUICKLIST_SCRIPT.replace(
      'let currentImageUploadSource = null;\n\n  try {',
      "try {\n    emitStage('draft_cleared');\n\n    let currentImageUploadSource = null;"
    );

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: staleMarkedManagedScript,
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
        runtimeSettingsOverrides: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: null,
    });
    expect(result).toMatchObject({
      externalListingId: 'listing-790',
      listingUrl: 'https://www.tradera.com/item/790',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        runId: 'run-790',
        managedQuicklistDesktopMode: true,
      },
    });
  });

  it('keeps known-good managed v76 scripts instead of auto-refreshing them', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-v76-compat',
      externalListingId: 'listing-v76-compat',
      listingUrl: 'https://www.tradera.com/item/v76-compat',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/v76-compat' },
    });

    const compatibleManagedV76Script = DEFAULT_TRADERA_QUICKLIST_SCRIPT.replace(
      /tradera-quicklist-default:v\d+/,
      'tradera-quicklist-default:v76'
    );

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: compatibleManagedV76Script,
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: compatibleManagedV76Script,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
      })
    );
    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      externalListingId: 'listing-v76-compat',
      listingUrl: 'https://www.tradera.com/item/v76-compat',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v76',
        scriptStoredOnConnection: true,
        runId: 'run-v76-compat',
      },
    });
  });

  it('retries with the managed default when a saved connection script hits the stale image-state runtime error', async () => {
    runPlaywrightListingScriptMock
      .mockRejectedValueOnce(new Error('ReferenceError: currentImageUploadSource is not defined'))
      .mockResolvedValueOnce({
        runId: 'run-runtime-refresh',
        externalListingId: 'listing-runtime-refresh',
        listingUrl: 'https://www.tradera.com/item/runtime-refresh',
        publishVerified: true,
        personaId: null,
        executionSettings: {
          headless: false,
          slowMo: 85,
          timeout: 30000,
          navigationTimeout: 45000,
          humanizeMouse: true,
          mouseJitter: 12,
          clickDelayMin: 40,
          clickDelayMax: 140,
          inputDelayMin: 30,
          inputDelayMax: 110,
          actionDelayMin: 220,
          actionDelayMax: 800,
          proxyEnabled: false,
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
        rawResult: { listingUrl: 'https://www.tradera.com/item/runtime-refresh' },
      });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: 'export default async function run() { return null; }',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledTimes(2);
    expect(runPlaywrightListingScriptMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
        runtimeSettingsOverrides: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: null,
    });
    expect(result).toMatchObject({
      externalListingId: 'listing-runtime-refresh',
      listingUrl: 'https://www.tradera.com/item/runtime-refresh',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'runtime-default-refresh',
        runId: 'run-runtime-refresh',
        managedQuicklistDesktopMode: true,
      },
    });
  });

  it('falls back to the managed default when the saved connection script is syntactically invalid', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-invalid-fallback',
      externalListingId: 'listing-invalid-fallback',
      listingUrl: 'https://www.tradera.com/item/invalid-fallback',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/invalid-fallback' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'scripted',
        playwrightListingScript: `
          if (true) {
            return { ok: true };
        `,
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'list',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        failureHoldOpenMs: 30_000,
        runtimeSettingsOverrides: {
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: null,
    });
    expect(result).toMatchObject({
      externalListingId: 'listing-invalid-fallback',
      listingUrl: 'https://www.tradera.com/item/invalid-fallback',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'invalid-connection-fallback',
        scriptValidationError: expect.stringContaining(
          'Invalid Playwright script syntax after function-body recovery:'
        ),
      },
    });
  });

  it('attaches run diagnostics when the scripted result is invalid', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-999',
      externalListingId: null,
      listingUrl: null,
      publishVerified: null,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { warning: 'missing external id' },
    });

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining('run run-999'),
      meta: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'custom',
        scriptMarker: null,
        scriptStoredOnConnection: true,
        requestedBrowserMode: 'headed',
        runId: 'run-999',
        rawResult: { warning: 'missing external id' },
        publishVerified: null,
      }),
    });
  });

  it('preserves script source diagnostics when the scripted runner fails before producing a result', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(new Error('Script execution failed'), {
        meta: {
          runId: 'run-failed-2',
          runStatus: 'failed',
        },
      })
    );

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: 'Script execution failed',
      meta: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'custom',
        scriptMarker: null,
        scriptStoredOnConnection: true,
        requestedBrowserMode: 'headed',
        runId: 'run-failed-2',
        runStatus: 'failed',
      }),
    });
  });

  it('preserves off-domain navigation diagnostics when the scripted flow leaves Tradera', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(
        new Error(
          'FAIL_SELL_PAGE_INVALID: Unexpected navigation away from Tradera to https://www.facebook.com/Tradera during image input resolution.'
        ),
        {
          meta: {
            runId: 'run-off-domain',
            runStatus: 'failed',
            latestStage: 'draft_cleared',
            latestStageUrl: 'https://www.facebook.com/Tradera',
            failureArtifacts: [
              {
                name: 'unexpected-navigation',
                path: 'run-off-domain/unexpected-navigation.png',
              },
            ],
          },
        }
      )
    );

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        'Unexpected navigation away from Tradera to https://www.facebook.com/Tradera'
      ),
      meta: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'custom',
        scriptMarker: null,
        scriptStoredOnConnection: true,
        requestedBrowserMode: 'headed',
        runId: 'run-off-domain',
        latestStage: 'draft_cleared',
        latestStageUrl: 'https://www.facebook.com/Tradera',
        failureArtifacts: [
          expect.objectContaining({
            name: 'unexpected-navigation',
          }),
        ],
      }),
    });
  });

  it('preserves homepage fallback diagnostics when the image step loses the listing editor', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(
        new Error(
          'FAIL_SELL_PAGE_INVALID: Tradera listing editor was lost during image upload dispatch. Entry point: homepage. Current URL: https://www.tradera.com/en'
        ),
        {
          meta: {
            runId: 'run-image-homepage',
            runStatus: 'failed',
            latestStage: 'draft_cleared',
            latestStageUrl: 'https://www.tradera.com/en',
            logTail: ['[user] tradera.quicklist.sell_page.image_step_invalid'],
            failureArtifacts: [
              {
                name: 'listing-page-missing',
                path: 'run-image-homepage/listing-page-missing.png',
              },
            ],
          },
        }
      )
    );

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        'Tradera listing editor was lost during image upload dispatch. Entry point: homepage.'
      ),
      meta: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'connection',
        scriptKind: 'custom',
        scriptMarker: null,
        scriptStoredOnConnection: true,
        requestedBrowserMode: 'headed',
        runId: 'run-image-homepage',
        latestStage: 'draft_cleared',
        latestStageUrl: 'https://www.tradera.com/en',
        failureArtifacts: [
          expect.objectContaining({
            name: 'listing-page-missing',
          }),
        ],
      }),
    });
  });

  it('preserves relist homepage cleanup diagnostics when a stale managed script is refreshed before failure', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(
        new Error(
          'FAIL_SELL_PAGE_INVALID: Tradera listing editor was lost during draft image cleanup complete. Entry point: homepage. Current URL: https://www.tradera.com/en'
        ),
        {
          meta: {
            runId: 'run-relist-homepage-cleanup',
            runStatus: 'failed',
            latestStage: 'draft_cleared',
            latestStageUrl: 'https://www.tradera.com/en',
            logTail: ['[user] tradera.quicklist.sell_page.image_step_invalid'],
            failureArtifacts: [
              {
                name: 'listing-page-missing',
                path: 'run-relist-homepage-cleanup/listing-page-missing.png',
              },
            ],
          },
        }
      )
    );

    const staleManagedDefaultScript = DEFAULT_TRADERA_QUICKLIST_SCRIPT.replace(
      'tradera-quicklist-default:v118',
      'tradera-quicklist-default:v89'
    );

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-relist-homepage-cleanup',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: staleManagedDefaultScript,
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling/new',
        } as never,
        source: 'manual',
        action: 'relist',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        'Tradera listing editor was lost during draft image cleanup complete. Entry point: homepage.'
      ),
      meta: expect.objectContaining({
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v118',
        scriptStoredOnConnection: false,
        requestedBrowserMode: 'headed',
        runId: 'run-relist-homepage-cleanup',
        latestStage: 'draft_cleared',
        latestStageUrl: 'https://www.tradera.com/en',
        failureArtifacts: [
          expect.objectContaining({
            name: 'listing-page-missing',
          }),
        ],
      }),
    });

    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: null,
    });
  });

  it('parses image settle state diagnostics from scripted upload timeout failures', async () => {
    runPlaywrightListingScriptMock.mockRejectedValue(
      Object.assign(
        new Error(
          'FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish. Last state: ' +
            JSON.stringify({
              selectedImageFileCount: 1,
              draftImageRemoveControls: 0,
              imageUploadPromptVisible: true,
              imageUploadPending: false,
              continueButtonVisible: true,
              continueButtonDisabled: true,
            })
        ),
        {
          meta: {
            runId: 'run-image-timeout',
            runStatus: 'failed',
            latestStage: 'draft_cleared',
            latestStageUrl:
              'https://www.tradera.com/en/selling/draft/69cfa5c39050080001c3a2c9',
            logTail: ['[user] tradera.quicklist.image.settle_timeout'],
          },
        }
      )
    );

    await expect(
      runTraderaBrowserListing({
        listing: {
          id: 'listing-1',
          productId: 'product-1',
          integrationId: 'integration-1',
          connectionId: 'connection-1',
        } as never,
        connection: {
          id: 'connection-1',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        } as never,
        systemSettings: {
          listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
        } as never,
        source: 'manual',
        action: 'list',
        browserMode: 'headed',
      })
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        'FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish.'
      ),
      meta: expect.objectContaining({
        runId: 'run-image-timeout',
        latestStage: 'draft_cleared',
        imageSettleState: {
          selectedImageFileCount: 1,
          draftImageRemoveControls: 0,
          imageUploadPromptVisible: true,
          imageUploadPending: false,
          continueButtonVisible: true,
          continueButtonDisabled: true,
        },
      }),
    });
  });

  it('uses the scripted Tradera path when a manual relist requests a browser-mode override', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-headed-recovery',
      externalListingId: 'listing-headed-recovery',
      listingUrl: 'https://www.tradera.com/item/headed-recovery',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: false,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/headed-recovery' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'builtin',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'relist',
      browserMode: 'headed',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'headed',
        input: expect.objectContaining({
          listingAction: 'relist',
          existingExternalListingId: 'external-existing',
          duplicateSearchTitle: 'Example title',
          duplicateSearchTerms: ['Example title'],
        }),
      })
    );
    expect(runPlaywrightListingScriptMock.mock.calls.at(-1)?.[0]).not.toHaveProperty(
      'failureHoldOpenMs'
    );
    expect(result).toEqual({
      externalListingId: 'listing-headed-recovery',
      listingUrl: 'https://www.tradera.com/item/headed-recovery',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'default-fallback',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v118',
        scriptStoredOnConnection: false,
        runId: 'run-headed-recovery',
        requestedBrowserMode: 'headed',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        browserMode: 'headed',
        playwrightPersonaId: null,
        managedQuicklistDesktopMode: true,
        playwrightSettings: {
          headless: false,
          slowMo: 85,
          timeout: 30000,
          navigationTimeout: 45000,
          humanizeMouse: true,
          mouseJitter: 12,
          clickDelayMin: 40,
          clickDelayMax: 140,
          inputDelayMin: 30,
          inputDelayMax: 110,
          actionDelayMin: 220,
          actionDelayMax: 800,
          proxyEnabled: false,
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
        rawResult: { listingUrl: 'https://www.tradera.com/item/headed-recovery' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'remote',
        imageUploadSource: null,
        localImagePathCount: 0,
        imageUrlCount: 2,
        ...EXPECTED_TRADERA_PRICING_METADATA,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: 'categoryMapper',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingGroupSource: 'manual',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: ['shipping-group-1'],
      },
    });
  });

  it('uses the scripted Tradera path for relist even without a browser-mode override', async () => {
    runPlaywrightListingScriptMock.mockResolvedValue({
      runId: 'run-connection-default-relist',
      externalListingId: 'listing-connection-default-relist',
      listingUrl: 'https://www.tradera.com/item/connection-default-relist',
      publishVerified: true,
      personaId: null,
      executionSettings: {
        headless: true,
        slowMo: 85,
        timeout: 30000,
        navigationTimeout: 45000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 140,
        inputDelayMin: 30,
        inputDelayMax: 110,
        actionDelayMin: 220,
        actionDelayMax: 800,
        proxyEnabled: false,
        emulateDevice: false,
        deviceName: 'Desktop Chrome',
      },
      rawResult: { listingUrl: 'https://www.tradera.com/item/connection-default-relist' },
    });

    const result = await runTraderaBrowserListing({
      listing: {
        id: 'listing-connection-default-relist',
        productId: 'product-1',
        integrationId: 'integration-1',
        connectionId: 'connection-1',
        externalListingId: 'external-existing',
      } as never,
      connection: {
        id: 'connection-1',
        traderaBrowserMode: 'builtin',
      } as never,
      systemSettings: {
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
      } as never,
      source: 'manual',
      action: 'relist',
      browserMode: 'connection_default',
    });

    expect(runPlaywrightListingScriptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        browserMode: 'connection_default',
        input: expect.objectContaining({
          listingAction: 'relist',
          existingExternalListingId: 'external-existing',
          duplicateSearchTitle: 'Example title',
          duplicateSearchTerms: ['Example title'],
        }),
      })
    );
    expect(runPlaywrightListingScriptMock.mock.calls.at(-1)?.[0]).not.toHaveProperty(
      'failureHoldOpenMs'
    );
    expect(result).toEqual({
      externalListingId: 'listing-connection-default-relist',
      listingUrl: 'https://www.tradera.com/item/connection-default-relist',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'default-fallback',
        scriptKind: 'managed',
        scriptMarker: 'tradera-quicklist-default:v118',
        scriptStoredOnConnection: false,
        runId: 'run-connection-default-relist',
        requestedBrowserMode: 'connection_default',
        listingFormUrl: 'https://www.tradera.com/en/selling/new',
        browserMode: 'headless',
        playwrightPersonaId: null,
        managedQuicklistDesktopMode: true,
        playwrightSettings: {
          headless: true,
          slowMo: 85,
          timeout: 30000,
          navigationTimeout: 45000,
          humanizeMouse: true,
          mouseJitter: 12,
          clickDelayMin: 40,
          clickDelayMax: 140,
          inputDelayMin: 30,
          inputDelayMax: 110,
          actionDelayMin: 220,
          actionDelayMax: 800,
          proxyEnabled: false,
          emulateDevice: false,
          deviceName: 'Desktop Chrome',
        },
        rawResult: { listingUrl: 'https://www.tradera.com/item/connection-default-relist' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'remote',
        imageUploadSource: null,
        localImagePathCount: 0,
        imageUrlCount: 2,
        ...EXPECTED_TRADERA_PRICING_METADATA,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: 'categoryMapper',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingGroupSource: 'manual',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
        matchedCategoryRuleIds: [],
        matchingShippingGroupIds: ['shipping-group-1'],
      },
    });
  });
});

describe('ensureLoggedIn', () => {
  it('reuses a session that lands on an authenticated /my route even without a visible logout link', async () => {
    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url.includes('/my/listings')
        ? 'https://www.tradera.com/en/my/listings?tab=active'
        : url;
    });
    let currentUrl = 'about:blank';
    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: (selector: string) => ({
        first: () => ({
          isVisible: async () => {
            if (selector === LOGIN_SUCCESS_SELECTOR) return false;
            return false;
          },
        }),
      }),
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
    };

    await ensureLoggedIn(
      page as never,
      {
        username: 'user@example.com',
        password: 'encrypted-password',
      } as never,
      'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts'
    );

    expect(gotoMock).toHaveBeenNthCalledWith(
      1,
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
    expect(gotoMock).toHaveBeenNthCalledWith(
      2,
      'https://www.tradera.com/en/selling/new',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
    expect(gotoMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the worker and manual-login success selectors aligned', () => {
    expect(LOGIN_SUCCESS_SELECTOR).toBe(TRADERA_SUCCESS_SELECTOR);
    expect(LOGIN_SUCCESS_SELECTOR).toContain('a[href*="/my"]');
    expect(LOGIN_SUCCESS_SELECTOR).toContain('button[aria-label*="Account"]');
  });

  it('requires manual verification instead of retrying credential login when a stored session is invalid', async () => {
    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url.includes('/my/listings')
        ? 'https://www.tradera.com/en/login'
        : url;
    });
    let currentUrl = 'about:blank';
    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: (_selector: string) => ({
        first: () => ({
          isVisible: async () => false,
        }),
      }),
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
    };

    await expect(
      ensureLoggedIn(
        page as never,
        {
          username: 'user@example.com',
          password: 'encrypted-password',
          playwrightStorageState: 'stored-state',
        } as never,
        'https://www.tradera.com/en/selling/new'
      )
    ).rejects.toThrow('AUTH_REQUIRED: Stored Tradera session expired or requires manual verification.');

    expect(gotoMock).toHaveBeenCalledTimes(1);
    expect(gotoMock).toHaveBeenCalledWith(
      'https://www.tradera.com/en/my/listings?tab=active',
      expect.objectContaining({
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      })
    );
  });

  it('raises a captcha-specific auth_required error after submit when Tradera demands manual verification', async () => {
    let currentUrl = 'about:blank';
    let phase: 'session-check' | 'login' | 'post-login' = 'session-check';

    const usernameField = {
      count: async () => 1,
      isVisible: async () => true,
      fill: vi.fn(),
      click: vi.fn(),
      innerText: vi.fn(async () => ''),
    };
    const passwordField = {
      count: async () => 1,
      isVisible: async () => true,
      fill: vi.fn(),
      click: vi.fn(),
      innerText: vi.fn(async () => ''),
    };
    const submitButton = {
      count: async () => 1,
      isVisible: async () => true,
      fill: vi.fn(),
      click: vi.fn(async () => {
        phase = 'post-login';
      }),
      innerText: vi.fn(async () => ''),
    };

    const buildLocator = (selector: string) => ({
      first: () => {
        if (selector === '#email' || selector === 'input[name="email"]' || selector === 'input[type="email"]') {
          return usernameField;
        }
        if (selector === '#password' || selector === 'input[name="password"]' || selector === 'input[type="password"]') {
          return passwordField;
        }
        if (
          selector === 'button[data-login-submit="true"]' ||
          selector === '#sign-in-form button[type="submit"]' ||
          selector === 'button:has-text("Sign in")' ||
          selector === 'button:has-text("Logga in")'
        ) {
          return submitButton;
        }

        return {
          count: async () => 1,
          isVisible: async () => {
            if (selector === LOGIN_SUCCESS_SELECTOR) return false;
            if (selector === '#sign-in-form' || selector === 'form[data-sign-in-form="true"]' || selector === 'form[action*="login"]') {
              return phase !== 'session-check';
            }
            if (TRADERA_AUTH_ERROR_SELECTORS.includes(selector as never)) {
              return phase === 'post-login';
            }
            return false;
          },
          fill: vi.fn(),
          click: vi.fn(),
          innerText: vi.fn(async () =>
            TRADERA_AUTH_ERROR_SELECTORS.includes(selector as never)
              ? 'Please complete the captcha challenge.'
              : ''
          ),
        };
      },
    });

    const gotoMock = vi.fn(async (url: string) => {
      currentUrl = url;
      if (url.includes('/my/listings')) {
        currentUrl = 'https://www.tradera.com/en/login';
        phase = 'session-check';
        return;
      }
      if (url.includes('/login')) {
        currentUrl = 'https://www.tradera.com/en/login';
        phase = 'login';
      }
    });

    const page = {
      goto: gotoMock,
      url: () => currentUrl,
      locator: buildLocator,
      waitForSelector: vi.fn(),
      waitForNavigation: vi.fn(),
      waitForTimeout: vi.fn(async () => undefined),
    };

    await expect(
      ensureLoggedIn(
        page as never,
        {
          username: 'user@example.com',
          password: 'encrypted-password',
        } as never,
        'https://www.tradera.com/en/selling/new'
      )
    ).rejects.toThrow('AUTH_REQUIRED: Tradera login requires manual verification (captcha).');

    expect(usernameField.fill).toHaveBeenCalledWith('user@example.com');
    expect(passwordField.fill).toHaveBeenCalledWith('decrypted:encrypted-password');
    expect(submitButton.click).toHaveBeenCalledTimes(1);
  });
});
