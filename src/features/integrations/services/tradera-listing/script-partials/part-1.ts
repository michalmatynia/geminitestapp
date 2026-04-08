export const PART_1 = String.raw`export default async function run({
  page,
  input,
  emit,
  artifacts,
  log,
  helpers,
}) {
  // tradera-quicklist-default:v113
  const ACTIVE_URL = 'https://www.tradera.com/en/my/listings?tab=active';
  const DIRECT_SELL_URL = 'https://www.tradera.com/en/selling/new';
  const LEGACY_SELL_URL = 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts';
  const TRADERA_ALLOWED_PAGE_HOSTS = ['www.tradera.com', 'tradera.com'];
  const configuredSellUrl =
    typeof input?.traderaConfig?.listingFormUrl === 'string' &&
    input.traderaConfig.listingFormUrl.trim()
      ? input.traderaConfig.listingFormUrl.trim()
      : null;
  const normalizedConfiguredSellUrl =
    configuredSellUrl === LEGACY_SELL_URL ? DIRECT_SELL_URL : configuredSellUrl;
  const SELL_URL_CANDIDATES = Array.from(
    new Set(
      [normalizedConfiguredSellUrl, DIRECT_SELL_URL, LEGACY_SELL_URL].filter(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    )
  );

  const TITLE_SELECTORS = [
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
  ];
  const DESCRIPTION_SELECTORS = [
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
  ];
  const DUPLICATE_DESCRIPTION_TEXT_SELECTORS = [
    '[data-testid*="description"]',
    '[id*="description" i]',
    '[class*="description" i]',
    '[class*="Description"]',
    'article',
    'main',
  ];
  const PRICE_SELECTORS = [
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
  ];
  const QUANTITY_SELECTORS = [
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
  ];
  const EAN_SELECTORS = [
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
  ];
  const BRAND_SELECTORS = [
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
  ];
  const WEIGHT_SELECTORS = [
    'input[name="weight"]',
    '#weight',
    'input[name="vikt"]',
    '#vikt',
    '[data-testid*="weight"] input',
    'input[placeholder*="weight" i]',
    'input[placeholder*="vikt" i]',
    'input[aria-label*="weight" i]',
    'input[aria-label*="vikt" i]',
  ];
  const WIDTH_SELECTORS = [
    'input[name="width"]',
    '#width',
    'input[name="bredd"]',
    '#bredd',
    'input[placeholder*="width" i]',
    'input[placeholder*="bredd" i]',
  ];
  const LENGTH_SELECTORS = [
    'input[name="length"]',
    '#length',
    'input[name="längd"]',
    '#längd',
    'input[placeholder*="length" i]',
    'input[placeholder*="längd" i]',
  ];
  const HEIGHT_SELECTORS = [
    'input[name="height"]',
    '#height',
    'input[name="höjd"]',
    '#höjd',
    'input[placeholder*="height" i]',
    'input[placeholder*="höjd" i]',
  ];
  const IMAGE_INPUT_SELECTORS = [
    'input[type="file"][accept*="image"]',
    '[data-testid*="image"] input[type="file"]',
    '[data-testid*="photo"] input[type="file"]',
    '[data-testid*="upload"] input[type="file"]',
    'input[type="file"][name*="image" i]',
    'input[type="file"][name*="photo" i]',
    'input[type="file"]',
  ];
  const IMAGE_UPLOAD_TRIGGER_SELECTORS = [
    'button[aria-label*="Add images" i]',
    'button[aria-label*="Add image" i]',
    'button[aria-label*="Upload images" i]',
    'button[aria-label*="Upload image" i]',
    'button[aria-label*="Lägg till bilder" i]',
    'button[aria-label*="Lägg till bild" i]',
    'button[aria-label*="Lägg till foton" i]',
    'button:has-text("Add images")',
    'button:has-text("Add image")',
    'button:has-text("Upload images")',
    'button:has-text("Upload image")',
    'button:has-text("Lägg till bilder")',
    'button:has-text("Lägg till bild")',
    'button:has-text("Lägg till foton")',
    'a:has-text("Add images")',
    'a:has-text("Lägg till bilder")',
    '[data-testid*="add-image"]',
    '[data-testid*="add-photo"]',
    '[data-testid*="upload-image"]',
    '[data-testid*="upload-photo"]',
    '[data-testid*="image-upload"]',
    '[data-testid*="photo-upload"]',
    '[data-testid*="image-picker"]',
  ];
  const IMAGE_REQUIRED_HINT_SELECTORS = [
    'text=/Add your images first/i',
    'text=/Add images first/i',
    'text=/Lägg till bilder först/i',
    'text=/Lägg till dina bilder först/i',
  ];
  const IMAGE_UPLOAD_PENDING_SELECTORS = [
    'text=/Uploading/i',
    'text=/Laddar upp/i',
    '[role="progressbar"]',
    '[aria-busy="true"]',
  ];
  const IMAGE_UPLOAD_ERROR_SELECTORS = [
    '[role="alert"]',
    '[aria-live="assertive"]',
    '[data-testid*="error"]',
    '[data-testid*="upload-error"]',
  ];
  const IMAGE_UPLOAD_ERROR_HINTS = [
    'something went wrong while uploading the image',
    'went wrong while uploading the image',
    'error uploading the image',
    'error uploading image',
    'image upload failed',
    'could not upload image',
    'kunde inte ladda upp bilden',
    'något gick fel när bilden laddades upp',
  ];
  const UPLOADED_IMAGE_PREVIEW_SELECTORS = [
    'img[alt^="image " i]',
    'img[alt^="photo " i]',
    'img[alt^="bild " i]',
    'img[alt^="foto " i]',
  ];
  const DRAFT_IMAGE_REMOVE_SELECTORS = [
    'button[aria-label*="Remove image" i]',
    'button[aria-label*="Delete image" i]',
    'button[aria-label*="Remove photo" i]',
    'button[aria-label*="Delete photo" i]',
    'button[aria-label*="Ta bort" i]',
    'button[aria-label*="Radera" i]',
    '[data-testid*="remove-image"]',
    '[data-testid*="delete-image"]',
    '[data-testid*="remove-photo"]',
    '[data-testid*="delete-photo"]',
    'button:has-text("Remove image")',
    'button:has-text("Delete image")',
    'button:has-text("Ta bort")',
    'button:has-text("Radera")',
  ];
  const DRAFT_IMAGE_REMOVE_ACTION_HINTS = [
    'remove image',
    'delete image',
    'remove photo',
    'delete photo',
    'ta bort',
    'radera',
  ];
  const DRAFT_IMAGE_REMOVE_SCOPE_SELECTORS = [
    '[data-testid*="image"]',
    '[data-testid*="photo"]',
    '[data-testid*="preview"]',
    '[data-testid*="upload"]',
    '[class*="image"]',
    '[class*="Image"]',
    '[class*="photo"]',
    '[class*="Photo"]',
  ];
  const CONTINUE_SELECTORS = [
    'button[aria-label*="Continue" i]',
    'button[aria-label*="Fortsätt" i]',
    'button[aria-label*="Next" i]',
    'button:has-text("Continue")',
    'button:has-text("Fortsätt")',
    'button:has-text("Next")',
    '[data-testid*="continue"]',
    '[data-testid*="next"]',
  ];
  const PUBLISH_SELECTORS = [
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
  ];
  const PUBLISH_ACTION_LABEL_HINTS = [
    'review and publish',
    'publish',
    'save changes',
    'update listing',
    'granska och publicera',
    'publicera',
    'spara ändringar',
    'uppdatera annons',
    'lägg upp',
  ];
  const VALIDATION_MESSAGE_SELECTORS = [
    '[role="alert"]',
    '[aria-live="assertive"]',
    '[data-testid*="error"]',
    '[data-testid*="validation"]',
    '[aria-invalid="true"]',
    '.error-message',
    '.field-error',
  ];
  const VALIDATION_MESSAGE_IGNORE_FIELDS = ['__next-route-announcer__', 'next-route-announcer'];
  const TRANSIENT_VALIDATION_MESSAGE_PATTERNS = [
    /^(loading|laddar)(?:\.{1,3})?$/i,
  ];
  const ACTIVE_SEARCH_SELECTORS = [
    'main input[type="search"]',
    'main [role="searchbox"]',
    'main input[type="text"]',
    'main input',
    'input[type="search"]',
    'input[placeholder*="Search"]',
    'input[placeholder*="Sök"]',
    '[data-testid*="search"] input',
  ];
  const ACTIVE_SEARCH_SUBMIT_SELECTORS = [
    'main button:has-text("Search")',
    'main button:has-text("Sök")',
    'main [data-testid*="search"] button',
    'main button[type="submit"]',
  ];
  const ACTIVE_SEARCH_TRIGGER_LABELS = ['Search', 'Sök'];
  const GLOBAL_HEADER_SEARCH_HINTS = [
    'items, sellers or a category',
    'artiklar, säljare eller en kategori',
    'artiklar, säljare eller kategori',
    'what are you looking for',
    'vad letar du efter',
  ];
  const ACTIVE_TAB_LABELS = ['Active', 'Aktiva'];
  const ACTIVE_TAB_STATE_SELECTORS = [
    '[aria-current="page"]:has-text("Active")',
    '[aria-current="true"]:has-text("Active")',
    '[role="tab"][aria-selected="true"]:has-text("Active")',
    '[aria-current="page"]:has-text("Aktiva")',
    '[aria-current="true"]:has-text("Aktiva")',
    '[role="tab"][aria-selected="true"]:has-text("Aktiva")',
  ];
  const EDIT_LISTING_LABELS = [
    'Edit',
    'Edit listing',
    'Edit item',
    'Update listing',
    'Redigera',
    'Redigera annons',
    'Uppdatera annons',
    'Ändra',
  ];
  // Labels for an intermediate menu item that must be clicked first to reveal
  // the edit option (e.g. Tradera's "Show Options" submenu trigger).
  const EDIT_INTERMEDIATE_MENU_LABELS = [
    'Show Options',
    'Show options',
    'Options',
    'Visa alternativ',
    'Alternativ',
    'Manage',
    'Hantera annons',
  ];
  const EDIT_LISTING_TRIGGER_SELECTORS = [
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
  ];
  const LISTING_ACTION_MENU_TRIGGER_SELECTORS = [
    // Tradera-specific: the "Show options" dropdown trigger on the item page
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
  ];
  const LOGIN_FORM_SELECTORS = [
    '#sign-in-form',
    'form[data-sign-in-form="true"]',
    'form[action*="login"]',
  ];
  const LOGIN_SUCCESS_SELECTORS = [
    'a[href*="logout"]',
    'a:has-text("Logga ut")',
    'a:has-text("Logout")',
    'a:has-text("Mina sidor")',
    'a:has-text("My pages")',
    'button[aria-label*="Account"]',
    'button[aria-label*="Profile"]',
    'a[href*="/profile"]',
    'a[href*="/my"]',
  ];
  const USERNAME_SELECTORS = ['#email', 'input[name="email"]', 'input[type="email"]'];
  const PASSWORD_SELECTORS = ['#password', 'input[name="password"]', 'input[type="password"]'];
  const LOGIN_BUTTON_SELECTORS = [
    'button[data-login-submit="true"]',
    '#sign-in-form button[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Logga in")',
  ];
  const COOKIE_ACCEPT_SELECTORS = [
    '#onetrust-accept-btn-handler',
    'button#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept all")',
    'button:has-text("Acceptera alla cookies")',
    'button:has-text("Acceptera alla kakor")',
    'button:has-text("Godkänn alla cookies")',
    'button:has-text("Tillåt alla cookies")',
  ];
  const CREATE_LISTING_TRIGGER_SELECTORS = [
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
  ];
  const CREATE_LISTING_TRIGGER_LABELS = [
    'Create a New Listing',
    'Create new listing',
    'Start selling',
    'Sell',
    'Skapa en ny annons',
    'Skapa annons',
    'Ny annons',
    'Börja sälja',
    'Sälj',
  ];
  const CATEGORY_FIELD_LABELS = ['Category', 'Kategori'];
  const CATEGORY_PLACEHOLDER_LABELS = [
    'Choose category',
    'Select category',
    'Choose a category',
    'Select a category',
    'Välj kategori',
    'Välj en kategori',
    'Välj kategori först',
  ];
  const FALLBACK_CATEGORY_OPTION_LABELS = ['Other', 'Övrigt'];
  const FALLBACK_CATEGORY_PATH_SEGMENTS = ['Other', 'Other'];
  const FALLBACK_CATEGORY_PATH = FALLBACK_CATEGORY_PATH_SEGMENTS.join(' > ');
  const LISTING_FORMAT_FIELD_LABELS = ['Listing format', 'Annonsformat'];
  const BUY_NOW_OPTION_LABELS = ['Buy now', 'Buy Now', 'Fixed price', 'Köp nu', 'Fast pris'];
  const CONDITION_FIELD_LABELS = ['Condition', 'Skick'];
  const CONDITION_OPTION_LABELS = [
    'Unused',
    'New without tags',
    'Ny utan etikett',
    'Helt ny',
    'Ny',
  ];
  const DEPARTMENT_FIELD_LABELS = ['Department', 'Avdelning'];
  const DEPARTMENT_OPTION_LABELS = ['Unisex', 'Dam/Herr', 'Women/Men'];
  const DELIVERY_FIELD_LABELS = ['Delivery', 'Leverans'];
  const OFFER_SHIPPING_LABELS = ['Offer shipping', 'Erbjud frakt', 'Frakt'];
  const OFFER_PICKUP_LABELS = [
    'Offer pick-up',
    'Offer pickup',
    'Erbjud upphämtning',
    'Avhämtning',
    'Upphämtning',
  ];
  const DELIVERY_OPTION_LABELS = [
    'Buyer pays shipping',
    'Shipping paid by buyer',
    'Shipping paid by the buyer',
    'Buyer pays',
    'Köparen betalar frakten',
    'Köparen betalar',
    'Frakt betalas av köparen',
  ];
  const SHIPPING_DIALOG_TITLE_LABELS = [
    'Choose 1-2 shipping options',
    'Choose shipping option',
    'shipping option',
    'fraktalternativ',
  ];
  const SHIPPING_DIALOG_OPTION_LABELS = ['Other', 'Annat'];
  const SHIPPING_DIALOG_CLOSE_LABELS = ['Close', 'Stäng'];
  const SHIPPING_DIALOG_CANCEL_LABELS = ['Cancel', 'Avbryt'];
  const SHIPPING_DIALOG_SAVE_LABELS = ['Save', 'Spara'];
  const WISHLIST_FAVORITES_DIALOG_TEXT_HINTS = [
    'Wishlist your favorites',
    'Wishlist your favourites',
    'wishlist',
    'favoriter',
  ];
  const WISHLIST_FAVORITES_DIALOG_DISMISS_LABELS = [
    'Close',
    'Stäng',
    'Maybe later',
    'Not now',
    'No thanks',
    'Skip',
  ];
  const WISHLIST_FAVORITES_DIALOG_CLOSE_SELECTORS = [
    'button[aria-label*="Close" i]',
    'button[aria-label*="Stäng" i]',
    'button[title*="Close" i]',
    'button[title*="Stäng" i]',
    '[data-testid*="close"]',
  ];
  const SHIPPING_DIALOG_PRICE_INPUT_SELECTORS = [
    'input[inputmode="decimal"]',
    'input[type="number"]',
    'input[type="text"]',
    'input',
  ];
  const LISTING_CONFIRMATION_LABELS = [
    'I confirm that the content of the listing is accurate',
    'I confirm that the content is accurate',
    'I confirm the listing is accurate',
    'Jag bekräftar att innehållet i annonsen är korrekt',
    'Jag bekräftar att annonsen är korrekt',
  ];
  const AUTOFILL_PENDING_SELECTORS = [
    'text=/Autofilling your listing/i',
    'text=/Autofilling/i',
    'text=/Fyller i din annons/i',
  ];
  const DRAFT_SAVING_SELECTORS = [
    'text=/Saving draft/i',
    'text=/Saving\\.\\.\\./i',
    'text=/Sparar utkast/i',
    'text=/Sparar\\.\\.\\./i',
  ];
  const DRAFT_SAVED_SELECTORS = [
    'text=/Draft is saved/i',
    'text=/Saved/i',
    'text=/Utkastet är sparat/i',
    'text=/Sparat/i',
  ];

  const toText = (value) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  const toNumber = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  const normalizeWhitespace = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  const toUniqueTextList = (values, limit = 8) => {
    const rawValues = Array.isArray(values) ? values : [values];
    const maxItems =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.max(1, Math.floor(limit))
        : 8;
    const seen = new Set();
    const result = [];

    for (const value of rawValues) {
      const normalized = normalizeWhitespace(toText(value));
      if (!normalized) {
        continue;
      }

      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      result.push(normalized);
      if (result.length >= maxItems) {
        break;
      }
    }

    return result;
  };
  const hasPublishActionHint = (value) => {
    const normalized = normalizeWhitespace(value).toLowerCase();
    if (!normalized) {
      return false;
    }

    return PUBLISH_ACTION_LABEL_HINTS.some((hint) => normalized.includes(hint));
  };
  const normalizePriceValue = (value) => {
    const normalized = String(value || '')
      .replace(/\s+/g, '')
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : normalized;
  };

  const baseProductId = toText(input?.baseProductId) || toText(input?.productId) || 'product';
  const requestedListingAction = toText(input?.listingAction);
  const listingAction =
    requestedListingAction === 'relist' || requestedListingAction === 'sync'
      ? requestedListingAction
      : 'list';
  const syncSkipImages = listingAction === 'sync' && input?.syncSkipImages === true;
  const existingExternalListingId = toText(input?.existingExternalListingId);
  const existingListingUrl = toText(input?.existingListingUrl);
  const rawDescriptionEn = toText(input?.rawDescriptionEn);
  const allowDuplicateLinking = true;
  const sku = toText(input?.sku);
  const username = toText(input?.username);
  const password = toText(input?.password);
  const title = toText(input?.title) || 'Listing ' + baseProductId;
  const duplicateSearchTerms = toUniqueTextList(
    Array.isArray(input?.duplicateSearchTerms)
      ? input.duplicateSearchTerms
      : [input?.duplicateSearchTitle]
  );
  const duplicateSearchTitle = duplicateSearchTerms[0] || null;
  const PRODUCT_ID_PATTERN = /(item reference|product id)\s*:/i;
  const SKU_REFERENCE_PATTERN = /\bsku\s*:/i;
  const rawDescription = (toText(input?.description) || title).replace(/\s+$/g, '');
  const referenceLines = [
    !PRODUCT_ID_PATTERN.test(rawDescription) ? 'Product ID: ' + baseProductId : null,
    sku && !SKU_REFERENCE_PATTERN.test(rawDescription) ? 'SKU: ' + sku : null,
  ].filter(Boolean);
  const description =
    referenceLines.length > 0 ? rawDescription + ' | ' + referenceLines.join(' | ') : rawDescription;
  const price = toNumber(input?.price) ?? 1;
  const quantity = toNumber(input?.quantity) || toNumber(input?.stock) || 1;
  const ean = toText(input?.ean) || toText(input?.gtin);
  const brand = toText(input?.brand) || toText(input?.producer);
  const weight = toNumber(input?.weight);
  const width = toNumber(input?.width);
  const length = toNumber(input?.length);
  const height = toNumber(input?.height);
  const categoryStrategy = toText(input?.categoryStrategy) === 'top_suggested' ? 'top_suggested' : 'mapper';
  const mappedCategorySegments = Array.isArray(input?.traderaCategory?.segments)
    ? input.traderaCategory.segments
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
    : [];
  const mappedCategoryPath =
    mappedCategorySegments.length > 0
      ? mappedCategorySegments.join(' > ')
      : toText(input?.traderaCategory?.path) || toText(input?.traderaCategory?.name);
  const mappedCategoryExternalId = toText(input?.traderaCategory?.externalId);
  const configuredExtraFieldSelections = Array.isArray(input?.traderaExtraFieldSelections)
    ? input.traderaExtraFieldSelections
        .map((entry) => ({
          fieldLabel: toText(entry?.fieldLabel),
          fieldKey: toText(entry?.fieldKey),
          optionLabel: toText(entry?.optionLabel),
          parameterId: toText(entry?.parameterId),
          parameterName: toText(entry?.parameterName),
          sourceValue: toText(entry?.sourceValue),
        }))
        .filter((entry) => entry.fieldLabel && entry.optionLabel)
    : [];
  let selectedCategoryPath = null;
  let selectedCategorySource = null;
  const configuredDeliveryOptionLabel = toText(input?.traderaShipping?.shippingCondition);
  const configuredDeliveryPriceEur = toNumber(input?.traderaShipping?.shippingPriceEur);
  const configuredShippingGroupName = toText(input?.traderaShipping?.shippingGroupName);
  const requiresConfiguredDeliveryOption = Boolean(configuredDeliveryOptionLabel);
`;
