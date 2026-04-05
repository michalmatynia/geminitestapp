export const PART_1 = String.raw`export default async function run({
  page,
  input,
  emit,
  artifacts,
  log,
  helpers,
}) {
  // tradera-quicklist-default:v85
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
    'a[aria-label*="Ta bort" i]',
    'a[aria-label*="Radera" i]',
    '[data-testid*="remove-image"]',
    '[data-testid*="delete-image"]',
    '[data-testid*="remove-photo"]',
    '[data-testid*="delete-photo"]',
    '[data-testid*="remove"]',
    '[data-testid*="delete"]',
    'button:has-text("Remove image")',
    'button:has-text("Delete image")',
    'button:has-text("Ta bort")',
    'button:has-text("Radera")',
    'a:has-text("Ta bort")',
    'a:has-text("Radera")',
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
    'button[aria-label*="Granska och publicera" i]',
    'button[aria-label*="Publicera" i]',
    'button:has-text("Review and publish")',
    'button:has-text("Publish")',
    'button:has-text("Granska och publicera")',
    'button:has-text("Publicera")',
    'button:has-text("Lägg upp")',
    '[data-testid*="publish"]',
    'button[type="submit"]',
  ];
  const PUBLISH_ACTION_LABEL_HINTS = [
    'review and publish',
    'publish',
    'granska och publicera',
    'publicera',
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
  const sku = toText(input?.sku);
  const username = toText(input?.username);
  const password = toText(input?.password);
  const title = toText(input?.title) || 'Listing ' + baseProductId;
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
  const mappedCategorySegments = Array.isArray(input?.traderaCategory?.segments)
    ? input.traderaCategory.segments
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
    : [];
  const mappedCategoryPath =
    mappedCategorySegments.length > 0
      ? mappedCategorySegments.join(' > ')
      : toText(input?.traderaCategory?.path) || toText(input?.traderaCategory?.name);
  let selectedCategoryPath = null;
  let selectedCategorySource = null;
  const configuredDeliveryOptionLabel = toText(input?.traderaShipping?.shippingCondition);
  const configuredDeliveryPriceEur = toNumber(input?.traderaShipping?.shippingPriceEur);
  const configuredShippingGroupName = toText(input?.traderaShipping?.shippingGroupName);
  const requiresConfiguredDeliveryOption = Boolean(configuredDeliveryOptionLabel);
  const deliveryOptionLabels = configuredDeliveryOptionLabel
    ? [
        configuredDeliveryOptionLabel,
        ...DELIVERY_OPTION_LABELS.filter(
          (label) =>
            normalizeWhitespace(label).toLowerCase() !==
            normalizeWhitespace(configuredDeliveryOptionLabel).toLowerCase()
        ),
      ]
    : DELIVERY_OPTION_LABELS;
  const imageUrls = Array.isArray(input?.imageUrls)
    ? input.imageUrls
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
        .slice(0, 12)
    : [];
  const localImagePaths = Array.isArray(input?.localImagePaths)
    ? input.localImagePaths
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
        .slice(0, 12)
    : [];
  let unexpectedTraderaNavigation = null;

  const getUnexpectedTraderaNavigationPayload = (value) => {
    const normalized = toText(value);
    if (!normalized || normalized === 'about:blank') {
      return null;
    }

    try {
      const parsed = new URL(normalized, DIRECT_SELL_URL);
      const protocol = parsed.protocol.toLowerCase();
      const host = parsed.host.toLowerCase();
      if (
        (protocol === 'http:' || protocol === 'https:') &&
        TRADERA_ALLOWED_PAGE_HOSTS.includes(host)
      ) {
        return null;
      }

      return {
        currentUrl: parsed.toString(),
        host,
        protocol,
      };
    } catch {
      return {
        currentUrl: normalized,
        host: null,
        protocol: null,
      };
    }
  };

  const assertAllowedTraderaPage = async (context = 'operation') => {
    const currentUrl = typeof page?.url === 'function' ? page.url() : null;
    const navigationPayload = getUnexpectedTraderaNavigationPayload(currentUrl);
    if (!navigationPayload) {
      return;
    }

    const failurePayload = {
      context,
      ...navigationPayload,
    };
    const failureMessage =
      'FAIL_SELL_PAGE_INVALID: Unexpected navigation away from Tradera to ' +
      failurePayload.currentUrl +
      ' during ' +
      context +
      '.';

    const shouldCapture =
      !unexpectedTraderaNavigation ||
      unexpectedTraderaNavigation.currentUrl !== failurePayload.currentUrl ||
      unexpectedTraderaNavigation.context !== failurePayload.context;

    unexpectedTraderaNavigation = failurePayload;
    log?.('tradera.quicklist.navigation.unexpected', failurePayload);
    if (shouldCapture) {
      await captureFailureArtifacts('unexpected-navigation', failurePayload).catch(
        () => undefined
      );
    }

    throw new Error(failureMessage);
  };

  const readClickTargetMetadata = async (target) => {
    if (!target || typeof target.evaluate !== 'function') {
      return null;
    }

    return target
      .evaluate((element) => {
        const hrefAttribute = element.getAttribute('href') || '';
        const resolvedHref =
          element instanceof HTMLAnchorElement
            ? element.href || hrefAttribute
            : hrefAttribute;

        return {
          tagName: element.tagName.toLowerCase(),
          id: element.getAttribute('id') || '',
          name: element.getAttribute('name') || '',
          type: element.getAttribute('type') || '',
          role: element.getAttribute('role') || '',
          href: resolvedHref,
          hrefAttribute,
          targetAttribute: element.getAttribute('target') || '',
          ariaLabel: element.getAttribute('aria-label') || '',
          title: element.getAttribute('title') || '',
          dataTestId: element.getAttribute('data-testid') || '',
          value:
            'value' in element && typeof element.value === 'string'
              ? element.value
              : '',
          text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
        };
      })
      .catch(() => null);
  };

  const resolveExternalClickTargetUrl = (metadata) => {
    if (!metadata || typeof metadata !== 'object') {
      return null;
    }

    const hrefCandidate = normalizeWhitespace(metadata.href || metadata.hrefAttribute || '');
    if (!hrefCandidate || hrefCandidate === '#' || hrefCandidate.startsWith('#')) {
      return null;
    }
    if (/^(javascript|mailto|tel):/i.test(hrefCandidate)) {
      return null;
    }

    try {
      const parsed = new URL(hrefCandidate, typeof page?.url === 'function' ? page.url() : DIRECT_SELL_URL);
      const protocol = parsed.protocol.toLowerCase();
      if (protocol !== 'http:' && protocol !== 'https:') {
        return null;
      }
      return TRADERA_ALLOWED_PAGE_HOSTS.includes(parsed.host.toLowerCase())
        ? null
        : parsed.toString();
    } catch {
      return null;
    }
  };

  const logClickTarget = async (context, target) => {
    const targetMetadata = await readClickTargetMetadata(target);
    log?.('tradera.quicklist.click_target', {
      context,
      currentUrl: typeof page?.url === 'function' ? page.url() : null,
      ...(targetMetadata || {}),
    });
  };

  const isPublishClickTarget = (metadata) => {
    if (!metadata || typeof metadata !== 'object') {
      return false;
    }

    return [
      metadata.text,
      metadata.ariaLabel,
      metadata.dataTestId,
      metadata.id,
      metadata.name,
      metadata.title,
      metadata.value,
    ].some((value) => hasPublishActionHint(value));
  };

  const findPublishButton = async (options = {}) => {
    const allowAmbiguousSubmit = options?.allowAmbiguousSubmit === true;
    let ambiguousSubmitCandidate = null;

    for (const selector of PUBLISH_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < Math.min(count, 8); index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;

        const metadata = await readClickTargetMetadata(candidate);
        if (resolveExternalClickTargetUrl(metadata)) {
          continue;
        }

        const isAmbiguousSubmitSelector = selector === 'button[type="submit"]';
        if (!isAmbiguousSubmitSelector || isPublishClickTarget(metadata)) {
          return candidate;
        }

        ambiguousSubmitCandidate ??= candidate;
      }
    }

    return allowAmbiguousSubmit ? ambiguousSubmitCandidate : null;
  };

  const wait = async (ms) => {
    await assertAllowedTraderaPage('wait');
    if (helpers && typeof helpers.sleep === 'function') {
      await helpers.sleep(ms);
    } else {
      await page.waitForTimeout(ms);
    }
    await assertAllowedTraderaPage('wait');
  };

  const humanClick = async (target, options) => {
    if (!target) return;
    await assertAllowedTraderaPage('before click');
    const targetMetadata = await readClickTargetMetadata(target);
    const externalClickTargetUrl = resolveExternalClickTargetUrl(targetMetadata);
    if (externalClickTargetUrl) {
      const failurePayload = {
        currentUrl: typeof page?.url === 'function' ? page.url() : null,
        externalClickTargetUrl,
        ...targetMetadata,
      };
      log?.('tradera.quicklist.click_blocked', failurePayload);
      await captureFailureArtifacts('blocked-external-click', failurePayload).catch(
        () => undefined
      );
      throw new Error(
        'FAIL_SELL_PAGE_INVALID: Refusing to click external link target "' +
          externalClickTargetUrl +
          '".'
      );
    }
    if (helpers && typeof helpers.click === 'function') {
      await helpers.click(target, options);
    } else {
      if (options?.scroll !== false && typeof target.scrollIntoViewIfNeeded === 'function') {
        await target.scrollIntoViewIfNeeded().catch(() => undefined);
      }
      await target.click(options?.clickOptions);
    }
    await assertAllowedTraderaPage('after click');
  };

  const tryHumanClick = async (target, options) => {
    try {
      await humanClick(target, options);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '');
      if (message.includes('FAIL_SELL_PAGE_INVALID:')) {
        throw error;
      }
      return false;
    }
  };

  const humanFill = async (target, value, options) => {
    if (!target) return;
    await assertAllowedTraderaPage('before fill');
    if (helpers && typeof helpers.fill === 'function') {
      await helpers.fill(target, value, options);
    } else {
      await target.fill(value);
    }
    await assertAllowedTraderaPage('after fill');
  };

  const humanType = async (value, options) => {
    await assertAllowedTraderaPage('before type');
    if (helpers && typeof helpers.type === 'function') {
      await helpers.type(value, options);
    } else {
      await page.keyboard.type(value);
    }
    await assertAllowedTraderaPage('after type');
  };

  const humanPress = async (key, options) => {
    await assertAllowedTraderaPage('before press');
    if (helpers && typeof helpers.press === 'function') {
      await helpers.press(key, options);
    } else {
      await page.keyboard.press(key);
    }
    await assertAllowedTraderaPage('after press');
  };

  const emitStage = (stage, extra = {}) => {
    if (typeof emit !== 'function') {
      return;
    }
    let currentUrl = null;
    try {
      currentUrl = typeof page?.url === 'function' ? page.url() : null;
    } catch {}
    emit('result', {
      stage,
      ...(currentUrl ? { currentUrl } : {}),
      ...extra,
    });
  };

  const readRuntimeEnvironment = async () => {
    return page
      .evaluate(() => {
        const coarsePointer =
          typeof window.matchMedia === 'function'
            ? window.matchMedia('(pointer: coarse)').matches
            : null;
        const finePointer =
          typeof window.matchMedia === 'function'
            ? window.matchMedia('(pointer: fine)').matches
            : null;

        return {
          href: window.location.href,
          viewportWidth: window.innerWidth || null,
          viewportHeight: window.innerHeight || null,
          outerWidth: window.outerWidth || null,
          outerHeight: window.outerHeight || null,
          screenWidth: window.screen?.width ?? null,
          screenHeight: window.screen?.height ?? null,
          devicePixelRatio: window.devicePixelRatio ?? null,
          userAgent: navigator.userAgent,
          maxTouchPoints: navigator.maxTouchPoints ?? 0,
          coarsePointer,
          finePointer,
        };
      })
      .catch(() => null);
  };

  const toSafeArtifactName = (value) =>
    String(value || 'artifact')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+\$/g, '')
      .slice(0, 48) || 'artifact';

  const firstExisting = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (count) return locator;
    }
    return null;
  };

  const firstVisible = async (selectors) => {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (!count) continue;
      const visible = await locator.isVisible().catch(() => false);
      if (visible) return locator;
    }
    return null;
  };

  const isControlDisabled = async (locator) => {
    if (!locator) return true;
    return locator.isDisabled().catch(async () => {
      return locator
        .evaluate((element) => {
          return (
            element.hasAttribute('disabled') ||
            element.getAttribute('aria-disabled') === 'true'
          );
        })
        .catch(() => false);
    });
  };

  const collectValidationMessages = async () => {
    const isIgnorableValidationCandidate = async (locator) => {
      return locator
        .evaluate((element, ignoredFields) => {
          const normalizedFields = Array.isArray(ignoredFields)
            ? ignoredFields
                .map((value) => String(value || '').trim().toLowerCase())
                .filter(Boolean)
            : [];
          if (normalizedFields.length === 0) {
            return false;
          }

          const identifiers = [
            element.getAttribute('id') || '',
            element.getAttribute('name') || '',
            element.getAttribute('aria-label') || '',
            element.parentElement?.getAttribute('id') || '',
            element.parentElement?.tagName || '',
            element.tagName || '',
          ]
            .map((value) => String(value || '').trim().toLowerCase())
            .filter(Boolean);

          if (identifiers.some((value) => normalizedFields.includes(value))) {
            return true;
          }

          return Boolean(element.closest('next-route-announcer'));
        }, VALIDATION_MESSAGE_IGNORE_FIELDS)
        .catch(() => false);
    };

    const sanitizeValidationMessages = (messages) => {
      if (!Array.isArray(messages)) {
        return [];
      }

      return messages.filter((message) => {
        const normalized = normalizeWhitespace(message).toLowerCase();
        return (
          normalized.length > 0 &&
          !VALIDATION_MESSAGE_IGNORE_FIELDS.some((ignoredField) => normalized.includes(ignoredField))
        );
      });
    };

    const messages = new Set();

    for (const selector of VALIDATION_MESSAGE_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < Math.min(count, 8); index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;
        if (await isIgnorableValidationCandidate(candidate)) continue;

        const text = await candidate.innerText().catch(() => '');
        const normalized = text.trim().replace(/\s+/g, ' ');
        if (normalized) {
          messages.add(normalized.slice(0, 240));
          continue;
        }

        const fieldLabel = await candidate
          .evaluate((element) => {
            return (
              element.getAttribute('aria-label') ||
              element.getAttribute('name') ||
              element.getAttribute('id') ||
              ''
            );
          })
          .catch(() => '');
        const normalizedFieldLabel = fieldLabel.trim();
        if (normalizedFieldLabel) {
          messages.add('Invalid field: ' + normalizedFieldLabel);
        }
      }
    }

    return sanitizeValidationMessages(Array.from(messages)).slice(0, 6);
  };

  const hasDeliveryValidationIssue = (messages) => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return false;
    }

    return messages.some((message) =>`;
