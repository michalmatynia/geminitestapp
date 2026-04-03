import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getProductByIdMock,
  runPlaywrightListingScriptMock,
  updateConnectionMock,
  accessMock,
  statMock,
  listCategoryMappingsMock,
  resolveTraderaShippingGroupResolutionForProductMock,
  resolveConnectionPlaywrightSettingsMock,
} = vi.hoisted(() => ({
  getProductByIdMock: vi.fn(),
  runPlaywrightListingScriptMock: vi.fn(),
  updateConnectionMock: vi.fn(),
  accessMock: vi.fn(),
  statMock: vi.fn(),
  listCategoryMappingsMock: vi.fn(),
  resolveTraderaShippingGroupResolutionForProductMock: vi.fn(),
  resolveConnectionPlaywrightSettingsMock: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  access: (...args: unknown[]) => accessMock(...args),
  stat: (...args: unknown[]) => statMock(...args),
  default: {
    access: (...args: unknown[]) => accessMock(...args),
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

import { ensureLoggedIn, runTraderaBrowserListing } from './browser';
import {
  LOGIN_SUCCESS_SELECTOR,
  TRADERA_AUTH_ERROR_SELECTORS,
} from './config';
import { TRADERA_SUCCESS_SELECTOR } from '../tradera-browser-test-utils';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from './default-script';

describe('DEFAULT_TRADERA_QUICKLIST_SCRIPT', () => {
  it('avoids dynamic imports that the vm runner cannot execute', () => {
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).not.toContain("await import('node:fs/promises')");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('page.context().request.get');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('buffer: bytes');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('AUTH_REQUIRED: Tradera login requires manual verification.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await humanFill(usernameInput, username);');
  });

  it('opens the create listing form from the selling landing page when needed', () => {
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('tradera-quicklist-default:v76');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('artifacts,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('helpers,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanClick = async (target, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanFill = async (target, value, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanType = async (value, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const humanPress = async (key, options) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const emitStage = (stage, extra = {}) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const DIRECT_SELL_URL = 'https://www.tradera.com/en/selling/new';");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const LEGACY_SELL_URL = 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts';");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const normalizedConfiguredSellUrl =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const CREATE_LISTING_TRIGGER_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const CATEGORY_FIELD_LABELS = ['Category', 'Kategori'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const FALLBACK_CATEGORY_OPTION_LABELS = ['Other', 'Övrigt'];");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const FALLBACK_CATEGORY_MAX_DEPTH = 3;');
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('a[aria-label*="Ta bort" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[data-testid*="remove"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('button:has-text("Radera")');
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('(?:item|listing)');
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.selected'");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureImageInputReady = async (attempts = 4) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.trigger_opened'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image_input.retry'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clearDraftImagesIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findFieldTriggerByLabels = async (labels) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleContains = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("getByRole('menu'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleContainsMenu = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleLink = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const byRoleContainsLink = page');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("getByRole('combobox'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('@aria-haspopup="listbox"');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const trySelectOptionalFieldValue = async ({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('requiredOptionLabel = null');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("failureCode = 'FAIL_PUBLISH_VALIDATION'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(`': Required Tradera ' +`);
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain(`' field was not available for option "' +`);
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const triggerActiveSearchSubmit = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findActiveTabTrigger = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const partialTabCandidate = page");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const partialLinkCandidate = page");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const partialButtonCandidate = page");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const ensureActiveListingsContext = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("FAIL_DUPLICATE_UNCERTAIN: Active listings context could not be confirmed.");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedAria.includes(hint))");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedPlaceholder.includes(hint))");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isControlDisabled = async (locator) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const collectValidationMessages = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const findListingLinkForTerm = async (term) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.draft.reset'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.duplicate.search'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.duplicate.result'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.field.selected'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.validation'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.verify'");
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
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isListingFormReady = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForListingFormReady = async (timeoutMs = 20_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("new RegExp('/selling(?:[?#]|$)').test(currentUrl)");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("page.waitForURL(");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("/selling(?:/(?:new|draft(?:/[^/?#]+)?))?(?:[?#/]|$)|/sell(?:/new)?(?:[?#/]|$)");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clearFocusedEditableField = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await humanPress('Delete', { pauseBefore: false, pauseAfter: false }).catch(");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await humanPress('Backspace', { pauseBefore: false, pauseAfter: false }).catch(");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("page.getByRole('button', { name: new RegExp('^' + escapedPattern + '$', 'i') }).first()");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("page.getByRole('link', { name: new RegExp(escapedPattern, 'i') }).first()");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menu" or self::div or self::label][1]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem" or @role="menuitemradio" or @role="option" or @role="radio"][1]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('following::*[(self::button or self::a or @role="button" or @role="link" or @role="menu" or @role="combobox" or @aria-haspopup="listbox" or @aria-haspopup="menu")][1]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const AUTOFILL_PENDING_SELECTORS = [');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const mappedCategorySegments = Array.isArray(input?.traderaCategory?.segments)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const configuredDeliveryOptionLabel = toText(input?.traderaShipping?.shippingCondition);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const configuredDeliveryPriceEur = toNumber(input?.traderaShipping?.shippingPriceEur);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const configuredShippingGroupName = toText(input?.traderaShipping?.shippingGroupName);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const requiresConfiguredDeliveryOption = Boolean(configuredDeliveryOptionLabel);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const deliveryOptionLabels = configuredDeliveryOptionLabel');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const applyCategorySelection = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const categoryTrigger = await findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_CATEGORY_SET: Mapped Tradera category segment');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FALLBACK_CATEGORY_OPTION_LABELS.join');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('for (let depth = 0; depth < FALLBACK_CATEGORY_MAX_DEPTH; depth += 1)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.category.fallback'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const applyDeliveryCheckboxSelection = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const dismissVisibleShippingDialogIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const resetDeliveryTogglesIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const clickCheckboxLabelByText = async (root, labels) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const setCheckboxChecked = async (locator, labels, desiredChecked, root = page) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const isInteractiveSelectionTrigger = async (locator) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const applyDeliverySelection = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const dialogLooksLikeShipping =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.dialog_reset'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.reset'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.delivery.dialog_reopened'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("reason: 'non-interactive-delivery-trigger'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const requiresShippingDialogConfiguration =');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_SHIPPING_SET: Tradera shipping dialog did not open for required delivery configuration.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const acknowledgeListingConfirmationIfPresent = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForPublishReadiness = async (publishButton, timeoutMs = 6_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("fieldKey: 'delivery-price'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('Tradera shipping price (EUR) is missing');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("field: 'listing-confirmation'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('Tradera listing confirmation checkbox could not be acknowledged.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.ready'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.publish.ready_timeout'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('Autofilling your listing');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_IMAGE_SET_INVALID: Continue completed the image step but the listing editor never became ready.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[name="shortDescription"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[placeholder*="rubrik" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('#tip-tap-editor');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('[aria-label="Beskrivning"][contenteditable="true"]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('textarea[placeholder*="beskriv" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('#price_fixedPrice');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[placeholder*="pris" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('input[aria-label*="pris" i]');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForSellEntryPoint = async');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const openCreateListingPage = async () => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await page.goto(DIRECT_SELL_URL");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("const opened = entryPoint === 'trigger' ? await openCreateListingPage() : false;");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await dismissVisibleShippingDialogIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await resetDeliveryTogglesIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await clearDraftImagesIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await setCheckboxChecked(shippingToggle, OFFER_SHIPPING_LABELS, true, page);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await setCheckboxChecked(');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const imageDraftState = await waitForDraftSaveSettled();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const selectionDraftState = await waitForDraftSaveSettled();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const deliveryDraftState = await waitForDraftSaveSettled();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const fieldsDraftState = await waitForDraftSaveSettled();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("await captureFailureArtifacts('image-selection-missing'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_IMAGE_SET_INVALID: Tradera image input did not accept the selected files.');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish. Last state: ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const baselinePreviewCount = await countUploadedImagePreviews();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await advancePastImagesStep(imageInput, expectedUploadCount, baselinePreviewCount);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const performImageUpload = async (uploadFiles, uploadSource) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('let currentImageUploadSource = null;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('currentImageUploadSource = uploadSource;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("log?.('tradera.quicklist.image.retry_download'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("initialUploadSource === 'local' && imageUrls.length > 0");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("imageUploadSource: imageUploadResult?.uploadSource ?? null");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('imageUploadSource: currentImageUploadSource,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await trySelectOptionalFieldValue({');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const listingFormatTrigger = await findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("fieldKey: 'condition'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("fieldKey: 'department'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("fieldKey: 'delivery'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('for (const optionLabel of BUY_NOW_OPTION_LABELS)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("requiredOptionLabel: configuredDeliveryOptionLabel");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain("failureCode: 'FAIL_SHIPPING_SET'");
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const hasDeliveryValidationIssue = (messages) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('await acknowledgeListingConfirmationIfPresent();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_SHIPPING_SET: ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const publishReadiness = await waitForPublishReadiness(publishButton);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const waitForPostPublishNavigation = async (timeoutMs = 15_000) => {');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const visibleListingLink = await findVisibleListingLink();');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const validationMessages = stillOnDraftPage ? await collectValidationMessages() : [];');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const publishButtonDisabled = await isControlDisabled(publishButton);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('postPublishNavigation.validationMessages.length > 0');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const prePublishValidationMessages = publishReadiness.messages;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const publishDisabled = publishReadiness.publishDisabled;');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('FAIL_PUBLISH_VALIDATION: ');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const baseProductDuplicate = await checkDuplicate(baseProductId);');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const verificationTerms = [baseProductId, sku].filter');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('for (let attempt = 0; attempt < 4 && !externalListingId; attempt += 1)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('attempt,');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('for (const verificationTerm of verificationTerms)');
    expect(DEFAULT_TRADERA_QUICKLIST_SCRIPT).toContain('const duplicateResult = await checkDuplicate(verificationTerm);');
  });
});

describe('runTraderaBrowserListing scripted mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    accessMock.mockResolvedValue(undefined);
    statMock.mockResolvedValue({
      isFile: () => true,
      size: 20_000,
    });
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
      },
      shippingGroupId: 'shipping-group-1',
      shippingCondition: 'Buyer pays shipping',
      shippingPriceEur: 5,
      reason: 'mapped',
    });
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
        browserMode: 'headed',
        disableStartUrlBootstrap: true,
        failureHoldOpenMs: 10_000,
        input: expect.objectContaining({
          baseProductId: 'BASE-1',
          sku: 'SKU-1',
          title: 'Example title',
          description: 'Example description',
          price: 123,
          localImagePaths: expect.arrayContaining([
            expect.stringContaining('/public/uploads/products/SKU-1/example.png'),
          ]),
          imageUrls: expect.arrayContaining([
            'https://cdn.example.com/a.jpg',
            'http://localhost:3000/uploads/products/SKU-1/example.png',
          ]),
          traderaConfig: {
            listingFormUrl: 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts',
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
          traderaShipping: {
            shippingGroupId: 'shipping-group-1',
            shippingGroupName: 'Small parcel',
            shippingGroupCatalogId: 'catalog-1',
            shippingCondition: 'Buyer pays shipping',
            shippingPriceEur: 5,
            reason: 'mapped',
          },
        }),
      })
    );
    expect(result).toEqual({
      externalListingId: 'listing-123',
      listingUrl: 'https://www.tradera.com/item/123',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'connection',
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
        imageInputSource: 'local',
        imageUploadSource: null,
        localImagePathCount: 1,
        imageUrlCount: 2,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: 'categoryMapper',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
      },
    });
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
          localImagePaths: expect.arrayContaining([
            expect.stringContaining('/public/uploads/products/SKU-1/public-only.png'),
            expect.stringContaining('/public/uploads/products/SKU-1/link-only.png'),
          ]),
          imageUrls: expect.arrayContaining([
            'http://localhost:3000/uploads/products/SKU-1/link-only.png',
            'http://localhost:3000/uploads/products/SKU-1/public-only.png',
          ]),
        }),
      })
    );
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
        failureHoldOpenMs: 10_000,
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
    });
    expect(result).toEqual({
      externalListingId: 'listing-456',
      listingUrl: 'https://www.tradera.com/item/456',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        runId: 'run-456',
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
        rawResult: { listingUrl: 'https://www.tradera.com/item/456' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'local',
        imageUploadSource: null,
        localImagePathCount: 1,
        imageUrlCount: 2,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: 'categoryMapper',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
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
        failureHoldOpenMs: 10_000,
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
    });
    expect(result).toEqual({
      externalListingId: 'listing-789',
      listingUrl: 'https://www.tradera.com/item/789',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'legacy-default-refresh',
        runId: 'run-789',
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
        rawResult: { listingUrl: 'https://www.tradera.com/item/789' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'local',
        imageUploadSource: null,
        localImagePathCount: 1,
        imageUrlCount: 2,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: 'categoryMapper',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
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
        requestedBrowserMode: 'headed',
        runId: 'run-failed-2',
        runStatus: 'failed',
      }),
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
        failureHoldOpenMs: 10_000,
      })
    );
    expect(result).toEqual({
      externalListingId: 'listing-headed-recovery',
      listingUrl: 'https://www.tradera.com/item/headed-recovery',
      metadata: {
        scriptMode: 'scripted',
        scriptSource: 'default-fallback',
        runId: 'run-headed-recovery',
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
        rawResult: { listingUrl: 'https://www.tradera.com/item/headed-recovery' },
        latestStage: null,
        latestStageUrl: null,
        publishVerified: true,
        imageInputSource: 'local',
        imageUploadSource: null,
        localImagePathCount: 1,
        imageUrlCount: 2,
        categoryMappingReason: 'mapped',
        categoryMatchScope: 'catalog_match',
        categoryInternalCategoryId: 'internal-category-1',
        categoryId: '101',
        categoryPath: 'Collectibles > Pins',
        categorySource: 'categoryMapper',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingCondition: 'Buyer pays shipping',
        shippingPriceEur: 5,
        shippingConditionSource: 'shippingGroup',
        shippingConditionReason: 'mapped',
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
