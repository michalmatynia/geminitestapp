import type { SelectorRegistryRole } from '@/shared/contracts/integrations/selector-registry';

import { inferSelectorRegistryRole } from '@/shared/lib/browser-execution/selector-registry-roles';

type TraderaSelectorRegistryPrimitive = string | number | boolean | null;

export type TraderaSelectorRegistryValue =
  | TraderaSelectorRegistryPrimitive
  | TraderaSelectorRegistryValue[]
  | { [key: string]: TraderaSelectorRegistryValue };

export type TraderaSelectorRegistryValueType =
  | 'string'
  | 'string_array'
  | 'nested_string_array'
  | 'object_array';

export type TraderaSelectorRegistryKind =
  | 'selectors'
  | 'labels'
  | 'hints'
  | 'paths';

export type TraderaSelectorRegistryDefinition = {
  key: string;
  group: string;
  kind: TraderaSelectorRegistryKind;
  role: SelectorRegistryRole;
  description: string | null;
  value: TraderaSelectorRegistryValue;
};

export type TraderaSelectorRegistrySeedEntry = {
  key: string;
  group: string;
  kind: TraderaSelectorRegistryKind;
  role: SelectorRegistryRole;
  description: string | null;
  valueType: TraderaSelectorRegistryValueType;
  valueJson: string;
  itemCount: number;
  preview: string[];
  source: 'code';
};

export type TraderaSelectorRegistryRuntimeEntry = Pick<
  TraderaSelectorRegistrySeedEntry,
  'key' | 'valueJson'
>;

const escapeJsString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const toJsLiteral = (value: TraderaSelectorRegistryValue): string => {
  if (typeof value === 'string') {
    return `'${escapeJsString(value)}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => toJsLiteral(entry)).join(', ')}]`;
  }

  return `{ ${Object.entries(value)
    .map(([key, entryValue]) => `${key}: ${toJsLiteral(entryValue)}`)
    .join(', ')} }`;
};

const detectValueType = (
  value: TraderaSelectorRegistryValue
): TraderaSelectorRegistryValueType => {
  if (typeof value === 'string') {
    return 'string';
  }

  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === 'string')) {
      return 'string_array';
    }

    if (value.every((entry) => Array.isArray(entry))) {
      return 'nested_string_array';
    }

    return 'object_array';
  }

  return 'object_array';
};

const collectPreviewStrings = (
  value: TraderaSelectorRegistryValue,
  limit = 4
): string[] => {
  const result: string[] = [];

  const visit = (candidate: TraderaSelectorRegistryValue): void => {
    if (result.length >= limit) return;

    if (typeof candidate === 'string') {
      const normalized = candidate.trim();
      if (normalized.length > 0) {
        result.push(normalized);
      }
      return;
    }

    if (
      candidate === null ||
      typeof candidate === 'number' ||
      typeof candidate === 'boolean'
    ) {
      return;
    }

    if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        visit(entry);
        if (result.length >= limit) return;
      }
      return;
    }

    for (const entry of Object.values(candidate)) {
      visit(entry);
      if (result.length >= limit) return;
    }
  };

  visit(value);
  return result;
};

const getItemCount = (value: TraderaSelectorRegistryValue): number => {
  if (Array.isArray(value)) {
    return value.length;
  }

  return value === null ? 0 : 1;
};

const defineRegistryEntry = (
  definition: Omit<TraderaSelectorRegistryDefinition, 'role'>
): TraderaSelectorRegistryDefinition => ({
  ...definition,
  role: inferSelectorRegistryRole({
    namespace: 'tradera',
    key: definition.key,
    kind: definition.kind,
    group: definition.group,
  }),
});

export const LOGIN_SUCCESS_SELECTORS = [
  'a[href*="logout"]',
  'a:has-text("Logga ut")',
  'a:has-text("Logout")',
  'a:has-text("Mina sidor")',
  'a:has-text("My pages")',
  'button[aria-label*="Account"]',
  'button[aria-label*="Profile"]',
  'a[href*="/profile"]',
  'a[href*="/my"]',
] as const;

export const TRADERA_LOGIN_SUCCESS_SELECTORS = LOGIN_SUCCESS_SELECTORS;
export const LOGIN_SUCCESS_SELECTOR = LOGIN_SUCCESS_SELECTORS.join(', ');

export const LOGIN_FORM_SELECTORS = [
  '#sign-in-form',
  'form[data-sign-in-form="true"]',
  'form[action*="login"]',
] as const;

export const TRADERA_LOGIN_FORM_SELECTORS = LOGIN_FORM_SELECTORS;
export const LOGIN_FORM_SELECTOR = LOGIN_FORM_SELECTORS.join(', ');

export const USERNAME_SELECTORS = ['#email', 'input[name="email"]', 'input[type="email"]'] as const;
export const PASSWORD_SELECTORS = ['#password', 'input[name="password"]', 'input[type="password"]'] as const;
export const LOGIN_BUTTON_SELECTORS = [
  'button[data-login-submit="true"]',
  '#sign-in-form button[type="submit"]',
  'button:has-text("Sign in")',
  'button:has-text("Logga in")',
] as const;

export const COOKIE_ACCEPT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
  'button:has-text("Accept all cookies")',
  'button:has-text("Allow all cookies")',
  'button:has-text("Allow all")',
  'button:has-text("Accept")',
  'button:has-text("Accept all")',
  'button:has-text("Acceptera alla cookies")',
  'button:has-text("Acceptera alla kakor")',
  'button:has-text("Acceptera alla")',
  'button:has-text("Acceptera")',
  'button:has-text("Godkänn alla cookies")',
  'button:has-text("Godkänn alla")',
  'button:has-text("Godkänn")',
  'button:has-text("Tillåt alla cookies")',
  'button:has-text("Tillåt alla")',
  '[role="dialog"] button:has-text("Godkänn")',
  '[role="dialog"] button:has-text("Acceptera")',
  '[role="dialog"] button:has-text("Accept")',
  '[aria-modal="true"] button:has-text("Godkänn")',
  '[aria-modal="true"] button:has-text("Acceptera")',
  'dialog button:has-text("Godkänn")',
  'dialog button:has-text("Acceptera")',
  '[data-testid*="cookie"] button',
  '[id*="cookie"] button',
] as const;

export const TRADERA_COOKIE_ACCEPT_SELECTORS = COOKIE_ACCEPT_SELECTORS;

export const TRADERA_AUTH_ERROR_SELECTORS = [
  '[data-testid*="error"]',
  '[data-test*="error"]',
  '[role="alert"]',
  '.alert',
  '.form-error',
  '.error',
  '.text-red-500',
] as const;

export const TRADERA_CAPTCHA_HINTS = [
  'captcha',
  'recaptcha',
  'fylla i captcha',
  'captcha:n',
] as const;

export const TRADERA_MANUAL_VERIFICATION_TEXT_HINTS = [
  ...TRADERA_CAPTCHA_HINTS,
  'verification',
  'verify',
  'manual verification',
  'security check',
  'two-factor',
  '2fa',
  'bankid',
  'engangskod',
  'säkerhetskontroll',
] as const;

export const TRADERA_MANUAL_VERIFICATION_URL_HINTS = [
  '/challenge',
  '/captcha',
  '/verify',
  '/verification',
  '/multifactorauthentication',
  '/bankid',
  '/two-factor',
  '/2fa',
] as const;

export const TITLE_SELECTORS = [
  'input[name="shortDescription"]',
  '#shortDescription',
  'input[name="title"]',
  '#title',
  '[data-testid*="title"] input',
  'input[placeholder*="headline" i]',
  'input[placeholder*="rubrik" i]',
  'input[aria-label*="title" i]',
  'input[aria-label*="titel" i]',
  'input[aria-label*="rubrik" i]',
] as const;

export const DESCRIPTION_SELECTORS = [
  '#tip-tap-editor',
  '[aria-label="Description"][contenteditable="true"]',
  '[aria-label="Beskrivning"][contenteditable="true"]',
  '[aria-label*="description" i][contenteditable="true"]',
  '[aria-label*="beskriv" i][contenteditable="true"]',
  'textarea[name="description"]',
  '#description',
  'textarea[placeholder*="description" i]',
  'textarea[placeholder*="beskriv" i]',
  '[data-testid*="description"] textarea',
  '[contenteditable="true"]',
  '[role="textbox"][contenteditable="true"]',
] as const;

export const DUPLICATE_DESCRIPTION_TEXT_SELECTORS = [
  '[data-testid*="description"]',
  '[id*="description" i]',
  '[class*="description" i]',
  '[class*="Description"]',
  'article',
  'main',
] as const;

export const PRICE_SELECTORS = [
  'input[name="price_fixedPrice"]',
  '#price_fixedPrice',
  'input[name="price"]',
  '#price',
  'input[data-testid*="price"]',
  'input[inputmode="decimal"]',
  'input[placeholder*="price" i]',
  'input[placeholder*="pris" i]',
  'input[aria-label*="price" i]',
  'input[aria-label*="pris" i]',
] as const;

export const QUANTITY_SELECTORS = [
  'input[name="quantity"]',
  '#quantity',
  'input[name="itemCount"]',
  '#itemCount',
  '[data-testid*="quantity"] input',
  '[data-testid*="item-count"] input',
  'input[placeholder*="quantity" i]',
  'input[placeholder*="antal" i]',
  'input[aria-label*="quantity" i]',
  'input[aria-label*="antal" i]',
] as const;

export const EAN_SELECTORS = [
  'input[name="ean"]',
  '#ean',
  'input[name="gtin"]',
  '#gtin',
  '[data-testid*="ean"] input',
  '[data-testid*="gtin"] input',
  'input[placeholder*="EAN" i]',
  'input[placeholder*="GTIN" i]',
  'input[placeholder*="barcode" i]',
  'input[aria-label*="EAN" i]',
  'input[aria-label*="GTIN" i]',
  'input[aria-label*="barcode" i]',
] as const;

export const BRAND_SELECTORS = [
  'input[name="brand"]',
  '#brand',
  'input[name="producer"]',
  '#producer',
  '[data-testid*="brand"] input',
  '[data-testid*="producer"] input',
  'input[placeholder*="brand" i]',
  'input[placeholder*="märke" i]',
  'input[aria-label*="brand" i]',
  'input[aria-label*="märke" i]',
] as const;

export const WEIGHT_SELECTORS = [
  'input[name="weight"]',
  '#weight',
  'input[name="vikt"]',
  '#vikt',
  '[data-testid*="weight"] input',
  'input[placeholder*="weight" i]',
  'input[placeholder*="vikt" i]',
  'input[aria-label*="weight" i]',
  'input[aria-label*="vikt" i]',
] as const;

export const WIDTH_SELECTORS = [
  'input[name="width"]',
  '#width',
  'input[name="bredd"]',
  '#bredd',
  'input[placeholder*="width" i]',
  'input[placeholder*="bredd" i]',
] as const;

export const LENGTH_SELECTORS = [
  'input[name="length"]',
  '#length',
  'input[name="längd"]',
  '#längd',
  'input[placeholder*="length" i]',
  'input[placeholder*="längd" i]',
] as const;

export const HEIGHT_SELECTORS = [
  'input[name="height"]',
  '#height',
  'input[name="höjd"]',
  '#höjd',
  'input[placeholder*="height" i]',
  'input[placeholder*="höjd" i]',
] as const;

export const IMAGE_INPUT_SELECTORS = [
  'input[type="file"][accept*="image"]',
  '[data-testid*="image"] input[type="file"]',
  '[data-testid*="photo"] input[type="file"]',
  '[data-testid*="upload"] input[type="file"]',
  'input[type="file"][name*="image" i]',
  'input[type="file"][name*="photo" i]',
  'input[type="file"]',
] as const;

export const IMAGE_UPLOAD_TRIGGER_SELECTORS = [
  'button:has-text("Add images")',
  'button:has-text("Add image")',
  'button:has-text("Lägg till bilder")',
  'button:has-text("Lägg till bild")',
  '[data-testid*="image-picker"]',
  '[data-testid*="image-upload"]',
  '[data-testid*="photo-upload"]',
  '[data-testid*="upload-image"]',
  '[data-testid*="upload-photo"]',
  '[aria-label*="Add images" i]',
  '[aria-label*="Add image" i]',
  '[aria-label*="Lägg till bilder" i]',
  '[aria-label*="Lägg till bild" i]',
] as const;

export const IMAGE_REQUIRED_HINT_SELECTORS = [
  'text=/Add your images first/i',
  'text=/Add images first/i',
  'text=/Lägg till bilder först/i',
  'text=/Lägg till dina bilder först/i',
] as const;

export const IMAGE_UPLOAD_PENDING_SELECTORS = [
  'text=/Uploading/i',
  'text=/Laddar upp/i',
  '[role="progressbar"]',
  '[aria-busy="true"]',
] as const;

export const IMAGE_UPLOAD_ERROR_SELECTORS = [
  '[role="alert"]',
  '[aria-live="assertive"]',
  '[data-testid*="error"]',
  '[data-testid*="upload-error"]',
] as const;

export const IMAGE_UPLOAD_ERROR_HINTS = [
  'something went wrong while uploading the image',
  'went wrong while uploading the image',
  'error uploading the image',
  'error uploading image',
  'image upload failed',
  'could not upload image',
  'kunde inte ladda upp bilden',
  'något gick fel när bilden laddades upp',
] as const;

export const UPLOADED_IMAGE_PREVIEW_SELECTORS = [
  'img[alt^="image " i]',
  'img[alt^="photo " i]',
  'img[alt^="bild " i]',
  'img[alt^="foto " i]',
  '[data-testid*="image" i] img',
  '[data-testid*="photo" i] img',
  '[data-testid*="preview" i] img',
  '[data-testid*="image-preview" i] img',
  '[data-testid*="photo-preview" i] img',
  '[class*="image-preview" i] img',
  '[class*="imagepreview" i] img',
  '[class*="photo-preview" i] img',
  '[class*="photopreview" i] img',
  '[class*="preview" i] img',
] as const;

export const DRAFT_IMAGE_REMOVE_SELECTORS = [
  'button[aria-label*="Remove image" i]',
  'button[aria-label*="Delete image" i]',
  'button[aria-label*="Remove photo" i]',
  'button[aria-label*="Delete photo" i]',
  'button[aria-label="Remove" i]',
  'button[aria-label="Delete" i]',
  'button[aria-label*="Ta bort" i]',
  'button[aria-label*="Radera" i]',
  '[data-testid*="remove-image"]',
  '[data-testid*="delete-image"]',
  '[data-testid*="remove-photo"]',
  '[data-testid*="delete-photo"]',
  '[data-testid*="remove"]',
  '[data-testid*="delete"]',
  'button:has-text("Remove image")',
  'button:has-text("Delete image")',
  'button:has-text("Remove")',
  'button:has-text("Delete")',
  'button:has-text("Ta bort")',
  'button:has-text("Radera")',
] as const;

export const DRAFT_IMAGE_REMOVE_ACTION_HINTS = [
  'remove image',
  'delete image',
  'remove photo',
  'delete photo',
  'remove',
  'delete',
  'ta bort',
  'radera',
] as const;

export const DRAFT_IMAGE_REMOVE_SCOPE_SELECTORS = [
  '[data-testid*="image"]',
  '[data-testid*="photo"]',
  '[data-testid*="preview"]',
  '[data-testid*="upload"]',
  '[class*="image"]',
  '[class*="Image"]',
  '[class*="photo"]',
  '[class*="Photo"]',
] as const;

export const CONTINUE_SELECTORS = [
  'button[aria-label*="Continue" i]',
  'button[aria-label*="Fortsätt" i]',
  'button[aria-label*="Next" i]',
  'button:has-text("Continue")',
  'button:has-text("Fortsätt")',
  'button:has-text("Next")',
  '[data-testid*="continue"]',
  '[data-testid*="next"]',
] as const;

export const PUBLISH_SELECTORS = [
  'button[aria-label*="Review and publish" i]',
  'button[aria-label*="Publish" i]',
  'button[aria-label*="Save changes" i]',
  'button[aria-label*="Update listing" i]',
  'button[aria-label*="Granska och publicera" i]',
  'button[aria-label*="Publicera" i]',
  'button[aria-label*="Spara ändringar" i]',
  'button[aria-label*="Uppdatera annons" i]',
  'button:has-text("Review and publish")',
  'button:has-text("Publish")',
  'button:has-text("Save changes")',
  'button:has-text("Update listing")',
  'button:has-text("Granska och publicera")',
  'button:has-text("Publicera")',
  'button:has-text("Spara ändringar")',
  'button:has-text("Uppdatera annons")',
  'button:has-text("Lägg upp")',
  '[data-testid*="publish"]',
  'button[type="submit"]',
] as const;

export const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'button:has-text("Publicera")',
  'button:has-text("Publish")',
  'button:has-text("Lägg upp")',
] as const;

export const PUBLISH_ACTION_LABEL_HINTS = [
  'review and publish',
  'publish',
  'save changes',
  'update listing',
  'granska och publicera',
  'publicera',
  'spara ändringar',
  'uppdatera annons',
  'lägg upp',
] as const;

export const VALIDATION_MESSAGE_SELECTORS = [
  '[role="alert"]',
  '[aria-live="assertive"]',
  '[data-testid*="error"]',
  '[data-testid*="validation"]',
  '[aria-invalid="true"]',
  '.error-message',
  '.field-error',
] as const;

export const ACTIVE_SEARCH_SELECTORS = [
  'main input[type="search"]',
  'main [role="searchbox"]',
  'main input[type="text"]',
  'main input',
  'input[type="search"]',
  'input[placeholder*="Search"]',
  'input[placeholder*="Sök"]',
  '[data-testid*="search"] input',
] as const;

export const ACTIVE_SEARCH_SUBMIT_SELECTORS = [
  'main button:has-text("Search")',
  'main button:has-text("Sök")',
  'main [data-testid*="search"] button',
  'main button[type="submit"]',
] as const;

export const ACTIVE_SEARCH_TRIGGER_LABELS = ['Search', 'Sök'] as const;

export const GLOBAL_HEADER_SEARCH_HINTS = [
  'items, sellers or a category',
  'artiklar, säljare eller en kategori',
  'artiklar, säljare eller kategori',
  'what are you looking for',
  'vad letar du efter',
] as const;

export const ACTIVE_TAB_LABELS = ['Active', 'Aktiva'] as const;

export const ACTIVE_TAB_STATE_SELECTORS = [
  '[aria-current="page"]:has-text("Active")',
  '[aria-current="true"]:has-text("Active")',
  '[role="tab"][aria-selected="true"]:has-text("Active")',
  '[aria-current="page"]:has-text("Aktiva")',
  '[aria-current="true"]:has-text("Aktiva")',
  '[role="tab"][aria-selected="true"]:has-text("Aktiva")',
] as const;

export const UNSOLD_TAB_STATE_SELECTORS = [
  '[aria-current="page"]:has-text("Unsold")',
  '[aria-current="true"]:has-text("Unsold")',
  '[role="tab"][aria-selected="true"]:has-text("Unsold")',
  '[aria-current="page"]:has-text("Osålda")',
  '[aria-current="true"]:has-text("Osålda")',
  '[role="tab"][aria-selected="true"]:has-text("Osålda")',
] as const;

export const SOLD_TAB_STATE_SELECTORS = [
  '[aria-current="page"]:has-text("Sold")',
  '[aria-current="true"]:has-text("Sold")',
  '[role="tab"][aria-selected="true"]:has-text("Sold")',
  '[aria-current="page"]:has-text("Sålda")',
  '[aria-current="true"]:has-text("Sålda")',
  '[role="tab"][aria-selected="true"]:has-text("Sålda")',
] as const;

export const EDIT_LISTING_LABELS = [
  'Edit',
  'Edit listing',
  'Edit item',
  'Update listing',
  'Redigera',
  'Redigera annons',
  'Uppdatera annons',
  'Ändra',
] as const;

export const EDIT_INTERMEDIATE_MENU_LABELS = [
  'Show Options',
  'Show options',
  'Options',
  'Visa alternativ',
  'Alternativ',
  'Manage',
  'Hantera annons',
] as const;

export const EDIT_LISTING_TRIGGER_SELECTORS = [
  'a[href*="/selling/features/"]',
  'a[href*="/selling/draft/"]',
  'a[href*="/selling/edit"]',
  'a[href*="/edit"]',
  'button:has-text("Edit")',
  'button:has-text("Edit listing")',
  'button:has-text("Update listing")',
  'button:has-text("Redigera")',
  'button:has-text("Redigera annons")',
  'button:has-text("Uppdatera annons")',
  '[data-testid*="edit"]',
] as const;

export const LISTING_ACTION_MENU_TRIGGER_SELECTORS = [
  '[data-open-edit-item="true"]',
  '[data-open-edit-item]',
  'button:has-text("Show options")',
  'button:has-text("Show Options")',
  'button:has-text("Visa alternativ")',
  'button[aria-label*="More" i]',
  'button[aria-label*="Actions" i]',
  'button[aria-label*="Options" i]',
  'button[aria-label*="Mer" i]',
  'button[aria-label*="Fler" i]',
  'button[aria-label*="Hantera" i]',
  'button[aria-label*="Alternativ" i]',
  'button:has-text("More options")',
  'button:has-text("Options")',
  'button:has-text("More")',
  'button:has-text("Mer")',
  'button:has-text("Fler")',
  'button:has-text("Hantera")',
  '[data-testid*="menu"]',
  '[data-testid*="actions"]',
] as const;

export const CREATE_LISTING_TRIGGER_SELECTORS = [
  'a[href*="/selling/new"]',
  'a[href*="/selling"]',
  'a[href*="/sell"]',
  'button:has-text("Create a New Listing")',
  'button:has-text("Create new listing")',
  'button:has-text("Start selling")',
  'button:has-text("Sell")',
  'button:has-text("Skapa en ny annons")',
  'button:has-text("Skapa annons")',
  'button:has-text("Ny annons")',
  'button:has-text("Börja sälja")',
  'button:has-text("Sälj")',
  'a:has-text("Create a New Listing")',
  'a:has-text("Create new listing")',
  'a:has-text("Start selling")',
  'a:has-text("Sell")',
  'a:has-text("Skapa en ny annons")',
  'a:has-text("Skapa annons")',
  'a:has-text("Ny annons")',
  'a:has-text("Börja sälja")',
  'a:has-text("Sälj")',
  'button[data-testid*="create"]',
  'button[data-testid*="new-listing"]',
  'button[data-testid*="sell"]',
  'a[data-testid*="create"]',
  'a[data-testid*="new-listing"]',
  'a[data-testid*="sell"]',
] as const;

export const CREATE_LISTING_TRIGGER_LABELS = [
  'Create a New Listing',
  'Create new listing',
  'Start selling',
  'Sell',
  'Skapa en ny annons',
  'Skapa annons',
  'Ny annons',
  'Börja sälja',
  'Sälj',
] as const;

export const CATEGORY_FIELD_LABELS = ['Category', 'Kategori'] as const;

export const CATEGORY_PLACEHOLDER_LABELS = [
  'Choose category',
  'Select category',
  'Choose a category',
  'Select a category',
  'Välj kategori',
  'Välj en kategori',
  'Välj kategori först',
] as const;

export const FALLBACK_CATEGORY_OPTION_LABELS = ['Other', 'Övrigt'] as const;
export const FALLBACK_CATEGORY_PATH_SEGMENTS = ['Other', 'Other'] as const;
export const FALLBACK_CATEGORY_PATH = FALLBACK_CATEGORY_PATH_SEGMENTS.join(' > ');
export const FALLBACK_CATEGORY_PATH_SEGMENT_VARIANTS = [
  ['Other', 'Other'],
  ['Övrigt', 'Övrigt'],
  ['Övrigt'],
  ['Other'],
] as const;

export const LISTING_FORMAT_FIELD_LABELS = ['Listing format', 'Annonsformat'] as const;
export const BUY_NOW_OPTION_LABELS = [
  'Buy now',
  'Buy Now',
  'Fixed price',
  'Köp nu',
  'Fast pris',
] as const;
export const CONDITION_FIELD_LABELS = ['Condition', 'Skick'] as const;
export const CONDITION_OPTION_LABELS = [
  'Unused',
  'New without tags',
  'Ny utan etikett',
  'Helt ny',
  'Ny',
] as const;
export const DEPARTMENT_FIELD_LABELS = ['Department', 'Avdelning'] as const;
export const DEPARTMENT_OPTION_LABELS = ['Unisex', 'Dam/Herr', 'Women/Men'] as const;
export const DELIVERY_FIELD_LABELS = ['Delivery', 'Leverans'] as const;
export const OFFER_SHIPPING_LABELS = ['Offer shipping', 'Erbjud frakt', 'Frakt'] as const;
export const OFFER_PICKUP_LABELS = [
  'Offer pick-up',
  'Offer pickup',
  'Erbjud upphämtning',
  'Avhämtning',
  'Upphämtning',
] as const;
export const DELIVERY_OPTION_LABELS = [
  'Buyer pays shipping',
  'Shipping paid by buyer',
  'Shipping paid by the buyer',
  'Buyer pays',
  'Köparen betalar frakten',
  'Köparen betalar',
  'Frakt betalas av köparen',
] as const;
export const SHIPPING_DIALOG_TITLE_LABELS = [
  'Choose 1-2 shipping options',
  'Choose shipping option',
  'shipping option',
  'fraktalternativ',
] as const;
export const SHIPPING_DIALOG_OPTION_LABELS = ['Other', 'Annat'] as const;
export const SHIPPING_DIALOG_CLOSE_LABELS = ['Close', 'Stäng'] as const;
export const SHIPPING_DIALOG_CANCEL_LABELS = ['Cancel', 'Avbryt'] as const;
export const SHIPPING_DIALOG_SAVE_LABELS = ['Save', 'Spara'] as const;
export const SHIPPING_DIALOG_PRICE_INPUT_SELECTORS = [
  'input[inputmode="decimal"]',
  'input[type="number"]',
  'input[type="text"]',
  'input',
] as const;
export const LISTING_CONFIRMATION_LABELS = [
  'I confirm that the content of the listing is accurate',
  'I confirm that the content is accurate',
  'I confirm the listing is accurate',
  'content of the listing is accurate',
  'content is accurate',
  'listing is accurate',
  'Jag bekräftar att innehållet i annonsen är korrekt',
  'Jag bekräftar att annonsen är korrekt',
  'innehållet i annonsen är korrekt',
  'annonsen är korrekt',
] as const;
export const WISHLIST_FAVORITES_DIALOG_TEXT_HINTS = [
  'Wishlist your favorites',
  'Wishlist your favourites',
  'wishlist',
  'favoriter',
] as const;
export const WISHLIST_FAVORITES_DIALOG_DISMISS_LABELS = [
  'Close',
  'Stäng',
  'Maybe later',
  'Not now',
  'No thanks',
  'Skip',
] as const;
export const WISHLIST_FAVORITES_DIALOG_CLOSE_SELECTORS = [
  'button[aria-label*="Close" i]',
  'button[aria-label*="Stäng" i]',
  'button[title*="Close" i]',
  'button[title*="Stäng" i]',
  '[data-testid*="close"]',
] as const;
export const AUTOFILL_DIALOG_TEXT_HINTS = [
  'Autofilling your listing',
  'Autofilling',
  'Fyller i din annons',
  'autofill',
] as const;
export const AUTOFILL_DIALOG_DISMISS_LABELS = [
  'Close',
  'Stäng',
  'Dismiss',
  'Cancel',
  'Avbryt',
  'Not now',
  'No thanks',
  'Skip',
] as const;
export const AUTOFILL_DIALOG_CLOSE_SELECTORS = [
  'button[aria-label*="Close" i]',
  'button[aria-label*="Stäng" i]',
  'button[aria-label*="Dismiss" i]',
  'button[title*="Close" i]',
  'button[title*="Stäng" i]',
  '[data-testid*="close"]',
  '[data-testid*="dismiss"]',
] as const;
export const AUTOFILL_SELECTORS = [
  'button[aria-label*="Autofill" i]',
  'button[aria-label*="Fyll" i]',
  'button:has-text("Autofill")',
  'button:has-text("Autofyll")',
  'button:has-text("Fyll i")',
  '[data-testid*="autofill"]',
] as const;
export const AUTOFILL_PENDING_SELECTORS = [
  'text=/Autofilling your listing/i',
  'text=/Autofilling/i',
  'text=/Fyller i din annons/i',
] as const;
export const DRAFT_SAVING_SELECTORS = [
  'text=/Saving draft/i',
  'text=/Saving\\.\\.\\./i',
  'text=/Sparar utkast/i',
  'text=/Sparar\\.\\.\\./i',
] as const;
export const DRAFT_SAVED_SELECTORS = [
  'text=/Draft is saved/i',
  'text=/Saved/i',
  'text=/Utkastet är sparat/i',
  'text=/Sparat/i',
] as const;
export const NOTIFICATION_MODAL_DISMISS_LABELS = [
  'Maybe later',
  'Maybe Later',
  'Kanske senare',
  'Not now',
  'Inte nu',
  'No thanks',
  'Nej tack',
  'Close',
  'Stäng',
] as const;

export const TRADERA_SELECTOR_REGISTRY_DEFINITIONS: TraderaSelectorRegistryDefinition[] = [
  defineRegistryEntry({
    key: 'LOGIN_SUCCESS_SELECTORS',
    group: 'auth',
    kind: 'selectors',
    description: 'Signals that the seller session is already authenticated.',
    value: [...LOGIN_SUCCESS_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'LOGIN_FORM_SELECTORS',
    group: 'auth',
    kind: 'selectors',
    description: 'Form roots used to detect the Tradera login surface.',
    value: [...LOGIN_FORM_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'USERNAME_SELECTORS',
    group: 'auth',
    kind: 'selectors',
    description: 'Username/email input candidates.',
    value: [...USERNAME_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'PASSWORD_SELECTORS',
    group: 'auth',
    kind: 'selectors',
    description: 'Password input candidates.',
    value: [...PASSWORD_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'LOGIN_BUTTON_SELECTORS',
    group: 'auth',
    kind: 'selectors',
    description: 'Login submission buttons.',
    value: [...LOGIN_BUTTON_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'COOKIE_ACCEPT_SELECTORS',
    group: 'auth',
    kind: 'selectors',
    description: 'Cookie consent buttons.',
    value: [...COOKIE_ACCEPT_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'TRADERA_AUTH_ERROR_SELECTORS',
    group: 'auth',
    kind: 'selectors',
    description: 'Inline auth error surfaces.',
    value: [...TRADERA_AUTH_ERROR_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'TRADERA_CAPTCHA_HINTS',
    group: 'auth',
    kind: 'hints',
    description: 'Captcha markers used to short-circuit automation.',
    value: [...TRADERA_CAPTCHA_HINTS],
  }),
  defineRegistryEntry({
    key: 'TRADERA_MANUAL_VERIFICATION_TEXT_HINTS',
    group: 'auth',
    kind: 'hints',
    description: 'Text markers that require manual verification.',
    value: [...TRADERA_MANUAL_VERIFICATION_TEXT_HINTS],
  }),
  defineRegistryEntry({
    key: 'TRADERA_MANUAL_VERIFICATION_URL_HINTS',
    group: 'auth',
    kind: 'paths',
    description: 'URL path markers that indicate a verification challenge.',
    value: [...TRADERA_MANUAL_VERIFICATION_URL_HINTS],
  }),
  defineRegistryEntry({
    key: 'TITLE_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Title field candidates.',
    value: [...TITLE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'DESCRIPTION_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Description editor candidates.',
    value: [...DESCRIPTION_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'DUPLICATE_DESCRIPTION_TEXT_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Surfaces used when matching duplicate listings by description.',
    value: [...DUPLICATE_DESCRIPTION_TEXT_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'PRICE_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Price input candidates.',
    value: [...PRICE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'QUANTITY_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Quantity input candidates.',
    value: [...QUANTITY_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'EAN_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'EAN/GTIN input candidates.',
    value: [...EAN_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'BRAND_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Brand input candidates.',
    value: [...BRAND_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'WEIGHT_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Weight input candidates.',
    value: [...WEIGHT_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'WIDTH_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Width input candidates.',
    value: [...WIDTH_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'LENGTH_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Length input candidates.',
    value: [...LENGTH_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'HEIGHT_SELECTORS',
    group: 'listing_form',
    kind: 'selectors',
    description: 'Height input candidates.',
    value: [...HEIGHT_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'IMAGE_INPUT_SELECTORS',
    group: 'images',
    kind: 'selectors',
    description: 'Image file inputs.',
    value: [...IMAGE_INPUT_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'IMAGE_UPLOAD_TRIGGER_SELECTORS',
    group: 'images',
    kind: 'selectors',
    description: 'Buttons that reveal the Tradera image upload flow.',
    value: [...IMAGE_UPLOAD_TRIGGER_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'IMAGE_REQUIRED_HINT_SELECTORS',
    group: 'images',
    kind: 'selectors',
    description: 'Inline messages telling the user that images are required first.',
    value: [...IMAGE_REQUIRED_HINT_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'IMAGE_UPLOAD_PENDING_SELECTORS',
    group: 'images',
    kind: 'selectors',
    description: 'Upload progress indicators.',
    value: [...IMAGE_UPLOAD_PENDING_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'IMAGE_UPLOAD_ERROR_SELECTORS',
    group: 'images',
    kind: 'selectors',
    description: 'Upload error surfaces.',
    value: [...IMAGE_UPLOAD_ERROR_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'IMAGE_UPLOAD_ERROR_HINTS',
    group: 'images',
    kind: 'hints',
    description: 'Text markers for failed image uploads.',
    value: [...IMAGE_UPLOAD_ERROR_HINTS],
  }),
  defineRegistryEntry({
    key: 'UPLOADED_IMAGE_PREVIEW_SELECTORS',
    group: 'images',
    kind: 'selectors',
    description: 'Selectors that expose uploaded image previews.',
    value: [...UPLOADED_IMAGE_PREVIEW_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'DRAFT_IMAGE_REMOVE_SELECTORS',
    group: 'images',
    kind: 'selectors',
    description: 'Remove-image buttons for draft cleanup.',
    value: [...DRAFT_IMAGE_REMOVE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'DRAFT_IMAGE_REMOVE_ACTION_HINTS',
    group: 'images',
    kind: 'hints',
    description: 'Text markers that imply image removal.',
    value: [...DRAFT_IMAGE_REMOVE_ACTION_HINTS],
  }),
  defineRegistryEntry({
    key: 'DRAFT_IMAGE_REMOVE_SCOPE_SELECTORS',
    group: 'images',
    kind: 'selectors',
    description: 'Containers used to scope image removal actions.',
    value: [...DRAFT_IMAGE_REMOVE_SCOPE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'CONTINUE_SELECTORS',
    group: 'navigation',
    kind: 'selectors',
    description: 'Progression buttons between quicklist steps.',
    value: [...CONTINUE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'PUBLISH_SELECTORS',
    group: 'publishing',
    kind: 'selectors',
    description: 'Primary publish/update buttons in the editor.',
    value: [...PUBLISH_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'SUBMIT_SELECTORS',
    group: 'publishing',
    kind: 'selectors',
    description: 'Legacy submit button candidates used by the standard browser flow.',
    value: [...SUBMIT_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'PUBLISH_ACTION_LABEL_HINTS',
    group: 'publishing',
    kind: 'hints',
    description: 'Text hints that identify publish-like actions.',
    value: [...PUBLISH_ACTION_LABEL_HINTS],
  }),
  defineRegistryEntry({
    key: 'VALIDATION_MESSAGE_SELECTORS',
    group: 'publishing',
    kind: 'selectors',
    description: 'Validation message surfaces read before publish.',
    value: [...VALIDATION_MESSAGE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'ACTIVE_SEARCH_SELECTORS',
    group: 'search',
    kind: 'selectors',
    description: 'Search input candidates inside seller listing sections.',
    value: [...ACTIVE_SEARCH_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'ACTIVE_SEARCH_SUBMIT_SELECTORS',
    group: 'search',
    kind: 'selectors',
    description: 'Submit buttons for section search.',
    value: [...ACTIVE_SEARCH_SUBMIT_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'ACTIVE_SEARCH_TRIGGER_LABELS',
    group: 'search',
    kind: 'labels',
    description: 'Labels used to resolve section search buttons.',
    value: [...ACTIVE_SEARCH_TRIGGER_LABELS],
  }),
  defineRegistryEntry({
    key: 'GLOBAL_HEADER_SEARCH_HINTS',
    group: 'search',
    kind: 'hints',
    description: 'Hints that distinguish the global header search from seller-search fields.',
    value: [...GLOBAL_HEADER_SEARCH_HINTS],
  }),
  defineRegistryEntry({
    key: 'ACTIVE_TAB_LABELS',
    group: 'navigation',
    kind: 'labels',
    description: 'Tab labels for active listings.',
    value: [...ACTIVE_TAB_LABELS],
  }),
  defineRegistryEntry({
    key: 'ACTIVE_TAB_STATE_SELECTORS',
    group: 'navigation',
    kind: 'selectors',
    description: 'Selected-tab markers for Active listings.',
    value: [...ACTIVE_TAB_STATE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'UNSOLD_TAB_STATE_SELECTORS',
    group: 'navigation',
    kind: 'selectors',
    description: 'Selected-tab markers for Unsold items.',
    value: [...UNSOLD_TAB_STATE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'SOLD_TAB_STATE_SELECTORS',
    group: 'navigation',
    kind: 'selectors',
    description: 'Selected-tab markers for Sold items.',
    value: [...SOLD_TAB_STATE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'EDIT_LISTING_LABELS',
    group: 'navigation',
    kind: 'labels',
    description: 'Visible text variants for edit listing actions.',
    value: [...EDIT_LISTING_LABELS],
  }),
  defineRegistryEntry({
    key: 'EDIT_INTERMEDIATE_MENU_LABELS',
    group: 'navigation',
    kind: 'labels',
    description: 'Intermediate menu labels that reveal edit actions.',
    value: [...EDIT_INTERMEDIATE_MENU_LABELS],
  }),
  defineRegistryEntry({
    key: 'EDIT_LISTING_TRIGGER_SELECTORS',
    group: 'navigation',
    kind: 'selectors',
    description: 'Direct edit listing buttons and links.',
    value: [...EDIT_LISTING_TRIGGER_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'LISTING_ACTION_MENU_TRIGGER_SELECTORS',
    group: 'navigation',
    kind: 'selectors',
    description: 'More-actions menus that contain listing actions.',
    value: [...LISTING_ACTION_MENU_TRIGGER_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'CREATE_LISTING_TRIGGER_SELECTORS',
    group: 'navigation',
    kind: 'selectors',
    description: 'Buttons and links that open the listing form.',
    value: [...CREATE_LISTING_TRIGGER_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'CREATE_LISTING_TRIGGER_LABELS',
    group: 'navigation',
    kind: 'labels',
    description: 'Labels used to detect create-listing CTAs.',
    value: [...CREATE_LISTING_TRIGGER_LABELS],
  }),
  defineRegistryEntry({
    key: 'CATEGORY_FIELD_LABELS',
    group: 'category',
    kind: 'labels',
    description: 'Category picker field labels.',
    value: [...CATEGORY_FIELD_LABELS],
  }),
  defineRegistryEntry({
    key: 'CATEGORY_PLACEHOLDER_LABELS',
    group: 'category',
    kind: 'labels',
    description: 'Placeholder texts shown before category selection.',
    value: [...CATEGORY_PLACEHOLDER_LABELS],
  }),
  defineRegistryEntry({
    key: 'FALLBACK_CATEGORY_OPTION_LABELS',
    group: 'category',
    kind: 'labels',
    description: 'Category labels used during fallback category selection.',
    value: [...FALLBACK_CATEGORY_OPTION_LABELS],
  }),
  defineRegistryEntry({
    key: 'FALLBACK_CATEGORY_PATH_SEGMENTS',
    group: 'category',
    kind: 'paths',
    description: 'Fallback category path segments.',
    value: [...FALLBACK_CATEGORY_PATH_SEGMENTS],
  }),
  defineRegistryEntry({
    key: 'FALLBACK_CATEGORY_PATH',
    group: 'category',
    kind: 'paths',
    description: 'Fallback category path.',
    value: FALLBACK_CATEGORY_PATH,
  }),
  defineRegistryEntry({
    key: 'FALLBACK_CATEGORY_PATH_SEGMENT_VARIANTS',
    group: 'category',
    kind: 'paths',
    description: 'Localized variants of the fallback category path.',
    value: FALLBACK_CATEGORY_PATH_SEGMENT_VARIANTS.map((variant) => [...variant]),
  }),
  defineRegistryEntry({
    key: 'LISTING_FORMAT_FIELD_LABELS',
    group: 'listing_format',
    kind: 'labels',
    description: 'Listing format field labels.',
    value: [...LISTING_FORMAT_FIELD_LABELS],
  }),
  defineRegistryEntry({
    key: 'BUY_NOW_OPTION_LABELS',
    group: 'listing_format',
    kind: 'labels',
    description: 'Fixed-price / buy-now listing format options.',
    value: [...BUY_NOW_OPTION_LABELS],
  }),
  defineRegistryEntry({
    key: 'CONDITION_FIELD_LABELS',
    group: 'attributes',
    kind: 'labels',
    description: 'Condition field labels.',
    value: [...CONDITION_FIELD_LABELS],
  }),
  defineRegistryEntry({
    key: 'CONDITION_OPTION_LABELS',
    group: 'attributes',
    kind: 'labels',
    description: 'Condition options used during automation.',
    value: [...CONDITION_OPTION_LABELS],
  }),
  defineRegistryEntry({
    key: 'DEPARTMENT_FIELD_LABELS',
    group: 'attributes',
    kind: 'labels',
    description: 'Department field labels.',
    value: [...DEPARTMENT_FIELD_LABELS],
  }),
  defineRegistryEntry({
    key: 'DEPARTMENT_OPTION_LABELS',
    group: 'attributes',
    kind: 'labels',
    description: 'Department options used during automation.',
    value: [...DEPARTMENT_OPTION_LABELS],
  }),
  defineRegistryEntry({
    key: 'DELIVERY_FIELD_LABELS',
    group: 'shipping',
    kind: 'labels',
    description: 'Delivery field labels.',
    value: [...DELIVERY_FIELD_LABELS],
  }),
  defineRegistryEntry({
    key: 'OFFER_SHIPPING_LABELS',
    group: 'shipping',
    kind: 'labels',
    description: 'Labels that enable shipping.',
    value: [...OFFER_SHIPPING_LABELS],
  }),
  defineRegistryEntry({
    key: 'OFFER_PICKUP_LABELS',
    group: 'shipping',
    kind: 'labels',
    description: 'Labels that enable pickup.',
    value: [...OFFER_PICKUP_LABELS],
  }),
  defineRegistryEntry({
    key: 'DELIVERY_OPTION_LABELS',
    group: 'shipping',
    kind: 'labels',
    description: 'Delivery option labels that map to buyer-paid shipping.',
    value: [...DELIVERY_OPTION_LABELS],
  }),
  defineRegistryEntry({
    key: 'SHIPPING_DIALOG_TITLE_LABELS',
    group: 'shipping',
    kind: 'labels',
    description: 'Shipping dialog title variants.',
    value: [...SHIPPING_DIALOG_TITLE_LABELS],
  }),
  defineRegistryEntry({
    key: 'SHIPPING_DIALOG_OPTION_LABELS',
    group: 'shipping',
    kind: 'labels',
    description: 'Shipping dialog fallback options.',
    value: [...SHIPPING_DIALOG_OPTION_LABELS],
  }),
  defineRegistryEntry({
    key: 'SHIPPING_DIALOG_CLOSE_LABELS',
    group: 'shipping',
    kind: 'labels',
    description: 'Shipping dialog close actions.',
    value: [...SHIPPING_DIALOG_CLOSE_LABELS],
  }),
  defineRegistryEntry({
    key: 'SHIPPING_DIALOG_CANCEL_LABELS',
    group: 'shipping',
    kind: 'labels',
    description: 'Shipping dialog cancel actions.',
    value: [...SHIPPING_DIALOG_CANCEL_LABELS],
  }),
  defineRegistryEntry({
    key: 'SHIPPING_DIALOG_SAVE_LABELS',
    group: 'shipping',
    kind: 'labels',
    description: 'Shipping dialog save actions.',
    value: [...SHIPPING_DIALOG_SAVE_LABELS],
  }),
  defineRegistryEntry({
    key: 'SHIPPING_DIALOG_PRICE_INPUT_SELECTORS',
    group: 'shipping',
    kind: 'selectors',
    description: 'Price input candidates inside the shipping dialog.',
    value: [...SHIPPING_DIALOG_PRICE_INPUT_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'LISTING_CONFIRMATION_LABELS',
    group: 'publishing',
    kind: 'labels',
    description: 'Confirmation checkbox labels used before publish.',
    value: [...LISTING_CONFIRMATION_LABELS],
  }),
  defineRegistryEntry({
    key: 'WISHLIST_FAVORITES_DIALOG_TEXT_HINTS',
    group: 'dialogs',
    kind: 'hints',
    description: 'Wishlist modal text markers.',
    value: [...WISHLIST_FAVORITES_DIALOG_TEXT_HINTS],
  }),
  defineRegistryEntry({
    key: 'WISHLIST_FAVORITES_DIALOG_DISMISS_LABELS',
    group: 'dialogs',
    kind: 'labels',
    description: 'Wishlist modal dismiss actions.',
    value: [...WISHLIST_FAVORITES_DIALOG_DISMISS_LABELS],
  }),
  defineRegistryEntry({
    key: 'WISHLIST_FAVORITES_DIALOG_CLOSE_SELECTORS',
    group: 'dialogs',
    kind: 'selectors',
    description: 'Wishlist modal close button candidates.',
    value: [...WISHLIST_FAVORITES_DIALOG_CLOSE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'AUTOFILL_DIALOG_TEXT_HINTS',
    group: 'dialogs',
    kind: 'hints',
    description: 'Autofill modal text markers.',
    value: [...AUTOFILL_DIALOG_TEXT_HINTS],
  }),
  defineRegistryEntry({
    key: 'AUTOFILL_DIALOG_DISMISS_LABELS',
    group: 'dialogs',
    kind: 'labels',
    description: 'Autofill modal dismiss actions.',
    value: [...AUTOFILL_DIALOG_DISMISS_LABELS],
  }),
  defineRegistryEntry({
    key: 'AUTOFILL_DIALOG_CLOSE_SELECTORS',
    group: 'dialogs',
    kind: 'selectors',
    description: 'Autofill modal close button candidates.',
    value: [...AUTOFILL_DIALOG_CLOSE_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'AUTOFILL_SELECTORS',
    group: 'dialogs',
    kind: 'selectors',
    description: 'Autofill action buttons in the listing form.',
    value: [...AUTOFILL_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'AUTOFILL_PENDING_SELECTORS',
    group: 'dialogs',
    kind: 'selectors',
    description: 'Autofill progress markers.',
    value: [...AUTOFILL_PENDING_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'DRAFT_SAVING_SELECTORS',
    group: 'dialogs',
    kind: 'selectors',
    description: 'Draft-saving progress markers.',
    value: [...DRAFT_SAVING_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'DRAFT_SAVED_SELECTORS',
    group: 'dialogs',
    kind: 'selectors',
    description: 'Draft-saved confirmation markers.',
    value: [...DRAFT_SAVED_SELECTORS],
  }),
  defineRegistryEntry({
    key: 'NOTIFICATION_MODAL_DISMISS_LABELS',
    group: 'dialogs',
    kind: 'labels',
    description: 'Dismiss actions for post-publish modals.',
    value: [...NOTIFICATION_MODAL_DISMISS_LABELS],
  }),
];

export const TRADERA_SELECTOR_REGISTRY_SEED_ENTRIES: TraderaSelectorRegistrySeedEntry[] =
  TRADERA_SELECTOR_REGISTRY_DEFINITIONS.map((definition) => ({
    key: definition.key,
    group: definition.group,
    kind: definition.kind,
    role: definition.role,
    description: definition.description,
    valueType: detectValueType(definition.value),
    valueJson: JSON.stringify(definition.value),
    itemCount: getItemCount(definition.value),
    preview: collectPreviewStrings(definition.value),
    source: 'code',
  }));

export const generateTraderaSelectorRegistryRuntimeFromEntries = (
  entries: readonly TraderaSelectorRegistryRuntimeEntry[]
): string =>
  [
    '// --- Tradera selector registry ---',
    ...entries.map((entry) => {
      const parsedValue = JSON.parse(entry.valueJson) as TraderaSelectorRegistryValue;
      return `const ${entry.key} = ${toJsLiteral(parsedValue)};`;
    }),
  ].join('\n');

export const generateTraderaSelectorRegistryRuntime = (): string =>
  generateTraderaSelectorRegistryRuntimeFromEntries(
    TRADERA_SELECTOR_REGISTRY_DEFINITIONS.map((definition) => ({
      key: definition.key,
      valueJson: JSON.stringify(definition.value),
    }))
  );

export const TRADERA_SELECTOR_REGISTRY_RUNTIME = generateTraderaSelectorRegistryRuntime();
