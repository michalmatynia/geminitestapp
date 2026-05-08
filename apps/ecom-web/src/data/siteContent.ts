export interface SiteLinkContent {
  label: string;
  href: string;
}

export interface SiteAnnouncementContent {
  enabled: boolean;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  dismissKey: string;
}

export interface SiteNavContent {
  brandName: string;
  brandSuffix: string;
  links: SiteLinkContent[];
  announcement: SiteAnnouncementContent;
  mobileAccountLabel: string;
  mobileWishlistLabel: string;
}

export interface SiteNewsletterContent {
  eyebrow: string;
  title: string;
  body: string;
  emailPlaceholder: string;
  emailAriaLabel: string;
  submitLabel: string;
}

export interface SiteFooterColumnContent {
  heading: string;
  links: SiteLinkContent[];
}

export interface SiteSocialLinkContent {
  name: string;
  icon: string;
  href: string;
}

export interface SiteFooterContent {
  newsletter: SiteNewsletterContent;
  brandName: string;
  brandSuffix: string;
  brandDescription: string;
  socials: SiteSocialLinkContent[];
  columns: SiteFooterColumnContent[];
  copyright: string;
  legalLinks: SiteLinkContent[];
}

export interface SiteSearchContent {
  dialogAriaLabel: string;
  inputAriaLabel: string;
  placeholder: string;
  closeLabel: string;
  closeAriaLabel: string;
  shortcutLabel: string;
  trendingLabel: string;
  trendingSearches: string[];
  browseCollectionsLabel: string;
  collectionCards: SiteCollectionCardContent[];
  noResultsPrefix: string;
  noResultsHelp: string;
  addedToastTitle: string;
  loadingResultsLabel: string;
  liveLabel: string;
  resultSingular: string;
  resultPlural: string;
  resultsForLabel: string;
  quickAddLabel: string;
  viewAllPrefix: string;
}

export interface SiteCollectionCardContent {
  slug: string;
  label: string;
  href: string;
  gradient: string;
}

export interface SiteCookieConsentContent {
  storageKey: string;
  message: string;
  policyLabel: string;
  policyHref: string;
  essentialLabel: string;
  acceptLabel: string;
}

export interface SiteCartContent {
  ariaLabel: string;
  title: string;
  itemSingular: string;
  itemPlural: string;
  closeLabel: string;
  emptyMessage: string;
  continueShoppingLabel: string;
  removeItemAriaPrefix: string;
  decreaseQuantityLabel: string;
  increaseQuantityLabel: string;
  subtotalLabel: string;
  shippingLabel: string;
  shippingNote: string;
  totalLabel: string;
  checkoutLabel: string;
  footerNote: string;
}

export interface SiteAuthContent {
  closeLabel: string;
  signInTabLabel: string;
  registerTabLabel: string;
  emailLabel: string;
  passwordLabel: string;
  showPasswordLabel: string;
  hidePasswordLabel: string;
  signInSubmitLabel: string;
  fullNameLabel: string;
  confirmPasswordLabel: string;
  registerSubmitLabel: string;
  loadingLabel: string;
  loginFailedError: string;
  passwordMismatchError: string;
  registrationFailedError: string;
}

export interface SiteQuickViewContent {
  addedToastTitle: string;
  brandLabel: string;
  closeLabel: string;
  selectSizeLabel: string;
  addedButtonLabel: string;
  addToBagLabel: string;
  removedWishlistToastTitle: string;
  savedWishlistToastTitle: string;
  savedWishlistButtonLabel: string;
  saveWishlistButtonLabel: string;
  fullDetailsLabel: string;
}

export interface SiteBackToTopContent {
  ariaLabel: string;
}

export interface SiteNotFoundContent {
  code: string;
  eyebrow: string;
  titleLines: string[];
  body: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  collectionLinks: SiteLinkContent[];
}

export interface SiteContent {
  nav: SiteNavContent;
  footer: SiteFooterContent;
  search: SiteSearchContent;
  cookieConsent: SiteCookieConsentContent;
  cart: SiteCartContent;
  auth: SiteAuthContent;
  quickView: SiteQuickViewContent;
  backToTop: SiteBackToTopContent;
  notFound: SiteNotFoundContent;
}

export interface SiteContentValidationResult {
  content: SiteContent;
  errors: string[];
}

export const SITE_CONTENT_DEFAULTS: SiteContent = {
  nav: {
    brandName: 'ARCANA',
    brandSuffix: 'NEXUS',
    links: [
      { label: 'Anime', href: '/collections/womenswear' },
      { label: 'Gaming', href: '/collections/menswear' },
      { label: 'Film', href: '/collections/accessories' },
      { label: 'New Drops', href: '/products?new=1' },
      { label: 'Catalog', href: '/products' },
    ],
    announcement: {
      enabled: true,
      message: 'Free shipping on orders over € 60 — New drops every week',
      ctaLabel: 'Shop New Drops',
      ctaHref: '/products?new=1',
      dismissKey: 'arcana-banner-v2',
    },
    mobileAccountLabel: 'Account',
    mobileWishlistLabel: 'Wishlist',
  },
  footer: {
    newsletter: {
      eyebrow: 'Stay Connected',
      title: 'The Drop Signal',
      body: 'New drops, limited runs and universe exclusives — direct to your inbox before the public.',
      emailPlaceholder: 'your@email.com',
      emailAriaLabel: 'Email for newsletter',
      submitLabel: 'Subscribe',
    },
    brandName: 'ARCANA',
    brandSuffix: 'NEXUS',
    brandDescription: 'Officially licensed collectibles from the anime, gaming and film universes you love most.',
    socials: [
      { name: 'X', icon: 'X', href: '#' },
      { name: 'Instagram', icon: 'IG', href: '#' },
      { name: 'TikTok', icon: 'TK', href: '#' },
    ],
    columns: [
      {
        heading: 'Shop',
        links: [
          { label: 'Anime Keychains', href: '/collections/womenswear' },
          { label: 'Gaming Pins', href: '/collections/menswear' },
          { label: 'Film Collectibles', href: '/collections/accessories' },
          { label: 'New Drops', href: '/products?new=1' },
          { label: 'All Items', href: '/products' },
        ],
      },
      {
        heading: 'Company',
        links: [
          { label: 'About ARCANA', href: '/about' },
          { label: 'Sourcing & Ethics', href: '/sourcing' },
          { label: 'Press', href: '/press' },
          { label: 'Affiliates', href: '/affiliates' },
          { label: 'Careers', href: '/careers' },
        ],
      },
      {
        heading: 'Support',
        links: [
          { label: 'Sizing Guide', href: '/sizing' },
          { label: 'Care Guide', href: '/care' },
          { label: 'Returns', href: '/returns' },
          { label: 'Shipping', href: '/shipping' },
          { label: 'Contact', href: '/contact' },
        ],
      },
    ],
    copyright: '© 2026 ARCANA NEXUS. All rights reserved.',
    legalLinks: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Cookies', href: '#' },
    ],
  },
  search: {
    dialogAriaLabel: 'Search',
    inputAriaLabel: 'Search',
    placeholder: 'Search objects, materials, categories...',
    closeLabel: 'Close',
    closeAriaLabel: 'Close search',
    shortcutLabel: 'Esc',
    trendingLabel: 'Trending searches',
    trendingSearches: ['Anime', 'Attack on Titan', 'Keychain', 'Elden Ring', 'Ghibli'],
    browseCollectionsLabel: 'Browse collections',
    collectionCards: [
      { slug: 'womenswear', label: 'Anime', href: '/collections/womenswear', gradient: 'linear-gradient(135deg, #21141D 0%, #3d0a40 100%)' },
      { slug: 'menswear', label: 'Gaming', href: '/collections/menswear', gradient: 'linear-gradient(135deg, #0a1500 0%, #1e3300 100%)' },
      { slug: 'accessories', label: 'Film & TV', href: '/collections/accessories', gradient: 'linear-gradient(135deg, #0f0520 0%, #28105a 100%)' },
      { slug: 'all', label: 'All Items', href: '/products', gradient: 'linear-gradient(135deg, #0B0D21 0%, #1a1040 100%)' },
    ],
    noResultsPrefix: 'No results for',
    noResultsHelp: 'Try a different term or browse our collections',
    addedToastTitle: 'Added to bag',
    loadingResultsLabel: 'Searching...',
    liveLabel: 'live',
    resultSingular: 'result',
    resultPlural: 'results',
    resultsForLabel: 'for',
    quickAddLabel: 'Quick Add',
    viewAllPrefix: 'View all',
  },
  cookieConsent: {
    storageKey: 'arcana-cookie-consent',
    message: 'We use cookies to remember your preferences, understand how you use ARCANA, and improve your experience.',
    policyLabel: 'Privacy policy',
    policyHref: '/values',
    essentialLabel: 'Essential only',
    acceptLabel: 'Accept all',
  },
  cart: {
    ariaLabel: 'Shopping bag',
    title: 'Your Bag',
    itemSingular: 'item',
    itemPlural: 'items',
    closeLabel: 'Close bag',
    emptyMessage: 'Your bag is empty',
    continueShoppingLabel: 'Continue shopping',
    removeItemAriaPrefix: 'Remove',
    decreaseQuantityLabel: 'Decrease quantity',
    increaseQuantityLabel: 'Increase quantity',
    subtotalLabel: 'Subtotal',
    shippingLabel: 'Shipping',
    shippingNote: 'Calculated at checkout',
    totalLabel: 'Total',
    checkoutLabel: 'Proceed to Checkout',
    footerNote: 'Complimentary shipping on orders over € 400',
  },
  auth: {
    closeLabel: 'Close',
    signInTabLabel: 'Sign In',
    registerTabLabel: 'Create Account',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    showPasswordLabel: 'Show password',
    hidePasswordLabel: 'Hide password',
    signInSubmitLabel: 'Sign In',
    fullNameLabel: 'Full name',
    confirmPasswordLabel: 'Confirm password',
    registerSubmitLabel: 'Create Account',
    loadingLabel: 'Loading...',
    loginFailedError: 'Login failed',
    passwordMismatchError: 'Passwords do not match',
    registrationFailedError: 'Registration failed',
  },
  quickView: {
    addedToastTitle: 'Added to bag',
    brandLabel: 'ARCANA',
    closeLabel: 'Close quick view',
    selectSizeLabel: 'Select size',
    addedButtonLabel: 'Added to bag',
    addToBagLabel: 'Add to Bag',
    removedWishlistToastTitle: 'Removed from wishlist',
    savedWishlistToastTitle: 'Saved to wishlist',
    savedWishlistButtonLabel: 'Saved',
    saveWishlistButtonLabel: 'Save',
    fullDetailsLabel: 'Full details',
  },
  backToTop: {
    ariaLabel: 'Back to top',
  },
  notFound: {
    code: '404',
    eyebrow: 'Object not found',
    titleLines: ['This page has', 'left the archive'],
    body: 'The page you are looking for may have moved, been renamed, or never existed. Return home or browse our collections.',
    primaryLabel: 'Return home',
    primaryHref: '/',
    secondaryLabel: 'Browse Objects',
    secondaryHref: '/collections/objects',
    collectionLinks: [
      { label: 'Anime', href: '/collections/womenswear' },
      { label: 'Gaming', href: '/collections/menswear' },
      { label: 'Film & TV', href: '/collections/accessories' },
    ],
  },
};

const TEXT_LIMITS = {
  short: 120,
  medium: 240,
  long: 900,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  maxLength: number,
  errors: string[],
  path: string,
): string {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'string') {
    errors.push(`${path} must be text.`);
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors.push(`${path} must be ${maxLength} characters or fewer.`);
    return fallback;
  }

  return trimmed;
}

function readBoolean(source: Record<string, unknown>, key: string, fallback: boolean, errors: string[], path: string): boolean {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'boolean') {
    errors.push(`${path} must be true or false.`);
    return fallback;
  }
  return value;
}

function isAllowedHref(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function readHref(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  errors: string[],
  path: string,
): string {
  const value = readString(source, key, fallback, TEXT_LIMITS.medium, errors, path);
  if (!value) return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${path} must be an internal path, anchor, or http(s) URL.`);
    return fallback;
  }
  return value;
}

function readLinks(
  input: unknown,
  fallback: SiteLinkContent[],
  maxItems: number,
  errors: string[],
  path: string,
): SiteLinkContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const links: SiteLinkContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackLink = fallback[index] ?? { label: '', href: '#' };
    if (!isRecord(item)) {
      errors.push(`${path} items must be objects.`);
      return fallback;
    }

    links.push({
      label: readString(item, 'label', fallbackLink.label, TEXT_LIMITS.short, errors, `${path}.${index}.label`),
      href: readHref(item, 'href', fallbackLink.href, errors, `${path}.${index}.href`),
    });
  }

  if (links.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  return links.length > 0 ? links : fallback;
}

function readSocials(input: unknown, fallback: SiteSocialLinkContent[], errors: string[]): SiteSocialLinkContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('footer.socials must be a list.');
    return fallback;
  }

  const socials: SiteSocialLinkContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackSocial = fallback[index] ?? { name: '', icon: '', href: '#' };
    if (!isRecord(item)) {
      errors.push('footer.socials items must be objects.');
      return fallback;
    }

    socials.push({
      name: readString(item, 'name', fallbackSocial.name, TEXT_LIMITS.short, errors, `footer.socials.${index}.name`),
      icon: readString(item, 'icon', fallbackSocial.icon, 12, errors, `footer.socials.${index}.icon`),
      href: readHref(item, 'href', fallbackSocial.href, errors, `footer.socials.${index}.href`),
    });
  }

  if (socials.length > 8) {
    errors.push('footer.socials can contain at most 8 items.');
    return fallback;
  }

  return socials.length > 0 ? socials : fallback;
}

function readFooterColumns(input: unknown, fallback: SiteFooterColumnContent[], errors: string[]): SiteFooterColumnContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('footer.columns must be a list.');
    return fallback;
  }

  const columns: SiteFooterColumnContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackColumn = fallback[index] ?? { heading: '', links: [] };
    if (!isRecord(item)) {
      errors.push('footer.columns items must be objects.');
      return fallback;
    }

    columns.push({
      heading: readString(item, 'heading', fallbackColumn.heading, TEXT_LIMITS.short, errors, `footer.columns.${index}.heading`),
      links: readLinks(item['links'], fallbackColumn.links, 12, errors, `footer.columns.${index}.links`),
    });
  }

  if (columns.length > 6) {
    errors.push('footer.columns can contain at most 6 columns.');
    return fallback;
  }

  return columns.length > 0 ? columns : fallback;
}

function readStringList(
  input: unknown,
  fallback: string[],
  maxItems: number,
  maxItemLength: number,
  errors: string[],
  path: string,
): string[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const items: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') {
      errors.push(`${path} can only contain text items.`);
      return fallback;
    }
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxItemLength) {
      errors.push(`${path} items must be ${maxItemLength} characters or fewer.`);
      return fallback;
    }
    items.push(trimmed);
  }

  if (items.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  return items.length > 0 ? items : fallback;
}

function readCollectionCards(input: unknown, fallback: SiteCollectionCardContent[], errors: string[]): SiteCollectionCardContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('search.collectionCards must be a list.');
    return fallback;
  }

  const cards: SiteCollectionCardContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackCard = fallback[index] ?? { slug: '', label: '', href: '#', gradient: 'linear-gradient(135deg, #0B0D21 0%, #1a1040 100%)' };
    if (!isRecord(item)) {
      errors.push('search.collectionCards items must be objects.');
      return fallback;
    }
    cards.push({
      slug: readString(item, 'slug', fallbackCard.slug, TEXT_LIMITS.short, errors, `search.collectionCards.${index}.slug`),
      label: readString(item, 'label', fallbackCard.label, TEXT_LIMITS.short, errors, `search.collectionCards.${index}.label`),
      href: readHref(item, 'href', fallbackCard.href, errors, `search.collectionCards.${index}.href`),
      gradient: readString(item, 'gradient', fallbackCard.gradient, TEXT_LIMITS.medium, errors, `search.collectionCards.${index}.gradient`),
    });
  }

  if (cards.length > 8) {
    errors.push('search.collectionCards can contain at most 8 items.');
    return fallback;
  }

  return cards.length > 0 ? cards : fallback;
}

export function validateSiteContent(input: unknown): SiteContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const nav = isRecord(root['nav']) ? root['nav'] : {};
  const announcement = isRecord(nav['announcement']) ? nav['announcement'] : {};
  const footer = isRecord(root['footer']) ? root['footer'] : {};
  const newsletter = isRecord(footer['newsletter']) ? footer['newsletter'] : {};
  const search = isRecord(root['search']) ? root['search'] : {};
  const cookieConsent = isRecord(root['cookieConsent']) ? root['cookieConsent'] : {};
  const cart = isRecord(root['cart']) ? root['cart'] : {};
  const auth = isRecord(root['auth']) ? root['auth'] : {};
  const quickView = isRecord(root['quickView']) ? root['quickView'] : {};
  const backToTop = isRecord(root['backToTop']) ? root['backToTop'] : {};
  const notFound = isRecord(root['notFound']) ? root['notFound'] : {};

  const content: SiteContent = {
    nav: {
      brandName: readString(nav, 'brandName', SITE_CONTENT_DEFAULTS.nav.brandName, TEXT_LIMITS.short, errors, 'nav.brandName'),
      brandSuffix: readString(
        nav,
        'brandSuffix',
        SITE_CONTENT_DEFAULTS.nav.brandSuffix,
        TEXT_LIMITS.short,
        errors,
        'nav.brandSuffix',
      ),
      links: readLinks(nav['links'], SITE_CONTENT_DEFAULTS.nav.links, 10, errors, 'nav.links'),
      announcement: {
        enabled: readBoolean(
          announcement,
          'enabled',
          SITE_CONTENT_DEFAULTS.nav.announcement.enabled,
          errors,
          'nav.announcement.enabled',
        ),
        message: readString(
          announcement,
          'message',
          SITE_CONTENT_DEFAULTS.nav.announcement.message,
          TEXT_LIMITS.medium,
          errors,
          'nav.announcement.message',
        ),
        ctaLabel: readString(
          announcement,
          'ctaLabel',
          SITE_CONTENT_DEFAULTS.nav.announcement.ctaLabel,
          TEXT_LIMITS.short,
          errors,
          'nav.announcement.ctaLabel',
        ),
        ctaHref: readHref(
          announcement,
          'ctaHref',
          SITE_CONTENT_DEFAULTS.nav.announcement.ctaHref,
          errors,
          'nav.announcement.ctaHref',
        ),
        dismissKey: readString(
          announcement,
          'dismissKey',
          SITE_CONTENT_DEFAULTS.nav.announcement.dismissKey,
          TEXT_LIMITS.short,
          errors,
          'nav.announcement.dismissKey',
        ),
      },
      mobileAccountLabel: readString(
        nav,
        'mobileAccountLabel',
        SITE_CONTENT_DEFAULTS.nav.mobileAccountLabel,
        TEXT_LIMITS.short,
        errors,
        'nav.mobileAccountLabel',
      ),
      mobileWishlistLabel: readString(
        nav,
        'mobileWishlistLabel',
        SITE_CONTENT_DEFAULTS.nav.mobileWishlistLabel,
        TEXT_LIMITS.short,
        errors,
        'nav.mobileWishlistLabel',
      ),
    },
    footer: {
      newsletter: {
        eyebrow: readString(
          newsletter,
          'eyebrow',
          SITE_CONTENT_DEFAULTS.footer.newsletter.eyebrow,
          TEXT_LIMITS.short,
          errors,
          'footer.newsletter.eyebrow',
        ),
        title: readString(
          newsletter,
          'title',
          SITE_CONTENT_DEFAULTS.footer.newsletter.title,
          TEXT_LIMITS.short,
          errors,
          'footer.newsletter.title',
        ),
        body: readString(
          newsletter,
          'body',
          SITE_CONTENT_DEFAULTS.footer.newsletter.body,
          TEXT_LIMITS.long,
          errors,
          'footer.newsletter.body',
        ),
        emailPlaceholder: readString(
          newsletter,
          'emailPlaceholder',
          SITE_CONTENT_DEFAULTS.footer.newsletter.emailPlaceholder,
          TEXT_LIMITS.short,
          errors,
          'footer.newsletter.emailPlaceholder',
        ),
        emailAriaLabel: readString(
          newsletter,
          'emailAriaLabel',
          SITE_CONTENT_DEFAULTS.footer.newsletter.emailAriaLabel,
          TEXT_LIMITS.short,
          errors,
          'footer.newsletter.emailAriaLabel',
        ),
        submitLabel: readString(
          newsletter,
          'submitLabel',
          SITE_CONTENT_DEFAULTS.footer.newsletter.submitLabel,
          TEXT_LIMITS.short,
          errors,
          'footer.newsletter.submitLabel',
        ),
      },
      brandName: readString(
        footer,
        'brandName',
        SITE_CONTENT_DEFAULTS.footer.brandName,
        TEXT_LIMITS.short,
        errors,
        'footer.brandName',
      ),
      brandSuffix: readString(
        footer,
        'brandSuffix',
        SITE_CONTENT_DEFAULTS.footer.brandSuffix,
        TEXT_LIMITS.short,
        errors,
        'footer.brandSuffix',
      ),
      brandDescription: readString(
        footer,
        'brandDescription',
        SITE_CONTENT_DEFAULTS.footer.brandDescription,
        TEXT_LIMITS.long,
        errors,
        'footer.brandDescription',
      ),
      socials: readSocials(footer['socials'], SITE_CONTENT_DEFAULTS.footer.socials, errors),
      columns: readFooterColumns(footer['columns'], SITE_CONTENT_DEFAULTS.footer.columns, errors),
      copyright: readString(
        footer,
        'copyright',
        SITE_CONTENT_DEFAULTS.footer.copyright,
        TEXT_LIMITS.medium,
        errors,
        'footer.copyright',
      ),
      legalLinks: readLinks(footer['legalLinks'], SITE_CONTENT_DEFAULTS.footer.legalLinks, 8, errors, 'footer.legalLinks'),
    },
    search: {
      dialogAriaLabel: readString(
        search,
        'dialogAriaLabel',
        SITE_CONTENT_DEFAULTS.search.dialogAriaLabel,
        TEXT_LIMITS.short,
        errors,
        'search.dialogAriaLabel',
      ),
      inputAriaLabel: readString(
        search,
        'inputAriaLabel',
        SITE_CONTENT_DEFAULTS.search.inputAriaLabel,
        TEXT_LIMITS.short,
        errors,
        'search.inputAriaLabel',
      ),
      placeholder: readString(
        search,
        'placeholder',
        SITE_CONTENT_DEFAULTS.search.placeholder,
        TEXT_LIMITS.short,
        errors,
        'search.placeholder',
      ),
      closeLabel: readString(
        search,
        'closeLabel',
        SITE_CONTENT_DEFAULTS.search.closeLabel,
        TEXT_LIMITS.short,
        errors,
        'search.closeLabel',
      ),
      closeAriaLabel: readString(
        search,
        'closeAriaLabel',
        SITE_CONTENT_DEFAULTS.search.closeAriaLabel,
        TEXT_LIMITS.short,
        errors,
        'search.closeAriaLabel',
      ),
      shortcutLabel: readString(
        search,
        'shortcutLabel',
        SITE_CONTENT_DEFAULTS.search.shortcutLabel,
        12,
        errors,
        'search.shortcutLabel',
      ),
      trendingLabel: readString(
        search,
        'trendingLabel',
        SITE_CONTENT_DEFAULTS.search.trendingLabel,
        TEXT_LIMITS.short,
        errors,
        'search.trendingLabel',
      ),
      trendingSearches: readStringList(
        search['trendingSearches'],
        SITE_CONTENT_DEFAULTS.search.trendingSearches,
        20,
        TEXT_LIMITS.short,
        errors,
        'search.trendingSearches',
      ),
      browseCollectionsLabel: readString(
        search,
        'browseCollectionsLabel',
        SITE_CONTENT_DEFAULTS.search.browseCollectionsLabel,
        TEXT_LIMITS.short,
        errors,
        'search.browseCollectionsLabel',
      ),
      collectionCards: readCollectionCards(
        search['collectionCards'],
        SITE_CONTENT_DEFAULTS.search.collectionCards,
        errors,
      ),
      noResultsPrefix: readString(
        search,
        'noResultsPrefix',
        SITE_CONTENT_DEFAULTS.search.noResultsPrefix,
        TEXT_LIMITS.short,
        errors,
        'search.noResultsPrefix',
      ),
      noResultsHelp: readString(
        search,
        'noResultsHelp',
        SITE_CONTENT_DEFAULTS.search.noResultsHelp,
        TEXT_LIMITS.medium,
        errors,
        'search.noResultsHelp',
      ),
      addedToastTitle: readString(
        search,
        'addedToastTitle',
        SITE_CONTENT_DEFAULTS.search.addedToastTitle,
        TEXT_LIMITS.short,
        errors,
        'search.addedToastTitle',
      ),
      loadingResultsLabel: readString(
        search,
        'loadingResultsLabel',
        SITE_CONTENT_DEFAULTS.search.loadingResultsLabel,
        TEXT_LIMITS.short,
        errors,
        'search.loadingResultsLabel',
      ),
      liveLabel: readString(
        search,
        'liveLabel',
        SITE_CONTENT_DEFAULTS.search.liveLabel,
        TEXT_LIMITS.short,
        errors,
        'search.liveLabel',
      ),
      resultSingular: readString(
        search,
        'resultSingular',
        SITE_CONTENT_DEFAULTS.search.resultSingular,
        TEXT_LIMITS.short,
        errors,
        'search.resultSingular',
      ),
      resultPlural: readString(
        search,
        'resultPlural',
        SITE_CONTENT_DEFAULTS.search.resultPlural,
        TEXT_LIMITS.short,
        errors,
        'search.resultPlural',
      ),
      resultsForLabel: readString(
        search,
        'resultsForLabel',
        SITE_CONTENT_DEFAULTS.search.resultsForLabel,
        TEXT_LIMITS.short,
        errors,
        'search.resultsForLabel',
      ),
      quickAddLabel: readString(
        search,
        'quickAddLabel',
        SITE_CONTENT_DEFAULTS.search.quickAddLabel,
        TEXT_LIMITS.short,
        errors,
        'search.quickAddLabel',
      ),
      viewAllPrefix: readString(
        search,
        'viewAllPrefix',
        SITE_CONTENT_DEFAULTS.search.viewAllPrefix,
        TEXT_LIMITS.short,
        errors,
        'search.viewAllPrefix',
      ),
    },
    cookieConsent: {
      storageKey: readString(
        cookieConsent,
        'storageKey',
        SITE_CONTENT_DEFAULTS.cookieConsent.storageKey,
        TEXT_LIMITS.short,
        errors,
        'cookieConsent.storageKey',
      ),
      message: readString(
        cookieConsent,
        'message',
        SITE_CONTENT_DEFAULTS.cookieConsent.message,
        TEXT_LIMITS.long,
        errors,
        'cookieConsent.message',
      ),
      policyLabel: readString(
        cookieConsent,
        'policyLabel',
        SITE_CONTENT_DEFAULTS.cookieConsent.policyLabel,
        TEXT_LIMITS.short,
        errors,
        'cookieConsent.policyLabel',
      ),
      policyHref: readHref(
        cookieConsent,
        'policyHref',
        SITE_CONTENT_DEFAULTS.cookieConsent.policyHref,
        errors,
        'cookieConsent.policyHref',
      ),
      essentialLabel: readString(
        cookieConsent,
        'essentialLabel',
        SITE_CONTENT_DEFAULTS.cookieConsent.essentialLabel,
        TEXT_LIMITS.short,
        errors,
        'cookieConsent.essentialLabel',
      ),
      acceptLabel: readString(
        cookieConsent,
        'acceptLabel',
        SITE_CONTENT_DEFAULTS.cookieConsent.acceptLabel,
        TEXT_LIMITS.short,
        errors,
        'cookieConsent.acceptLabel',
      ),
    },
    cart: {
      ariaLabel: readString(cart, 'ariaLabel', SITE_CONTENT_DEFAULTS.cart.ariaLabel, TEXT_LIMITS.short, errors, 'cart.ariaLabel'),
      title: readString(cart, 'title', SITE_CONTENT_DEFAULTS.cart.title, TEXT_LIMITS.short, errors, 'cart.title'),
      itemSingular: readString(
        cart,
        'itemSingular',
        SITE_CONTENT_DEFAULTS.cart.itemSingular,
        TEXT_LIMITS.short,
        errors,
        'cart.itemSingular',
      ),
      itemPlural: readString(
        cart,
        'itemPlural',
        SITE_CONTENT_DEFAULTS.cart.itemPlural,
        TEXT_LIMITS.short,
        errors,
        'cart.itemPlural',
      ),
      closeLabel: readString(cart, 'closeLabel', SITE_CONTENT_DEFAULTS.cart.closeLabel, TEXT_LIMITS.short, errors, 'cart.closeLabel'),
      emptyMessage: readString(
        cart,
        'emptyMessage',
        SITE_CONTENT_DEFAULTS.cart.emptyMessage,
        TEXT_LIMITS.short,
        errors,
        'cart.emptyMessage',
      ),
      continueShoppingLabel: readString(
        cart,
        'continueShoppingLabel',
        SITE_CONTENT_DEFAULTS.cart.continueShoppingLabel,
        TEXT_LIMITS.short,
        errors,
        'cart.continueShoppingLabel',
      ),
      removeItemAriaPrefix: readString(
        cart,
        'removeItemAriaPrefix',
        SITE_CONTENT_DEFAULTS.cart.removeItemAriaPrefix,
        TEXT_LIMITS.short,
        errors,
        'cart.removeItemAriaPrefix',
      ),
      decreaseQuantityLabel: readString(
        cart,
        'decreaseQuantityLabel',
        SITE_CONTENT_DEFAULTS.cart.decreaseQuantityLabel,
        TEXT_LIMITS.short,
        errors,
        'cart.decreaseQuantityLabel',
      ),
      increaseQuantityLabel: readString(
        cart,
        'increaseQuantityLabel',
        SITE_CONTENT_DEFAULTS.cart.increaseQuantityLabel,
        TEXT_LIMITS.short,
        errors,
        'cart.increaseQuantityLabel',
      ),
      subtotalLabel: readString(
        cart,
        'subtotalLabel',
        SITE_CONTENT_DEFAULTS.cart.subtotalLabel,
        TEXT_LIMITS.short,
        errors,
        'cart.subtotalLabel',
      ),
      shippingLabel: readString(
        cart,
        'shippingLabel',
        SITE_CONTENT_DEFAULTS.cart.shippingLabel,
        TEXT_LIMITS.short,
        errors,
        'cart.shippingLabel',
      ),
      shippingNote: readString(
        cart,
        'shippingNote',
        SITE_CONTENT_DEFAULTS.cart.shippingNote,
        TEXT_LIMITS.short,
        errors,
        'cart.shippingNote',
      ),
      totalLabel: readString(cart, 'totalLabel', SITE_CONTENT_DEFAULTS.cart.totalLabel, TEXT_LIMITS.short, errors, 'cart.totalLabel'),
      checkoutLabel: readString(
        cart,
        'checkoutLabel',
        SITE_CONTENT_DEFAULTS.cart.checkoutLabel,
        TEXT_LIMITS.short,
        errors,
        'cart.checkoutLabel',
      ),
      footerNote: readString(cart, 'footerNote', SITE_CONTENT_DEFAULTS.cart.footerNote, TEXT_LIMITS.medium, errors, 'cart.footerNote'),
    },
    auth: {
      closeLabel: readString(auth, 'closeLabel', SITE_CONTENT_DEFAULTS.auth.closeLabel, TEXT_LIMITS.short, errors, 'auth.closeLabel'),
      signInTabLabel: readString(
        auth,
        'signInTabLabel',
        SITE_CONTENT_DEFAULTS.auth.signInTabLabel,
        TEXT_LIMITS.short,
        errors,
        'auth.signInTabLabel',
      ),
      registerTabLabel: readString(
        auth,
        'registerTabLabel',
        SITE_CONTENT_DEFAULTS.auth.registerTabLabel,
        TEXT_LIMITS.short,
        errors,
        'auth.registerTabLabel',
      ),
      emailLabel: readString(auth, 'emailLabel', SITE_CONTENT_DEFAULTS.auth.emailLabel, TEXT_LIMITS.short, errors, 'auth.emailLabel'),
      passwordLabel: readString(
        auth,
        'passwordLabel',
        SITE_CONTENT_DEFAULTS.auth.passwordLabel,
        TEXT_LIMITS.short,
        errors,
        'auth.passwordLabel',
      ),
      showPasswordLabel: readString(
        auth,
        'showPasswordLabel',
        SITE_CONTENT_DEFAULTS.auth.showPasswordLabel,
        TEXT_LIMITS.short,
        errors,
        'auth.showPasswordLabel',
      ),
      hidePasswordLabel: readString(
        auth,
        'hidePasswordLabel',
        SITE_CONTENT_DEFAULTS.auth.hidePasswordLabel,
        TEXT_LIMITS.short,
        errors,
        'auth.hidePasswordLabel',
      ),
      signInSubmitLabel: readString(
        auth,
        'signInSubmitLabel',
        SITE_CONTENT_DEFAULTS.auth.signInSubmitLabel,
        TEXT_LIMITS.short,
        errors,
        'auth.signInSubmitLabel',
      ),
      fullNameLabel: readString(auth, 'fullNameLabel', SITE_CONTENT_DEFAULTS.auth.fullNameLabel, TEXT_LIMITS.short, errors, 'auth.fullNameLabel'),
      confirmPasswordLabel: readString(
        auth,
        'confirmPasswordLabel',
        SITE_CONTENT_DEFAULTS.auth.confirmPasswordLabel,
        TEXT_LIMITS.short,
        errors,
        'auth.confirmPasswordLabel',
      ),
      registerSubmitLabel: readString(
        auth,
        'registerSubmitLabel',
        SITE_CONTENT_DEFAULTS.auth.registerSubmitLabel,
        TEXT_LIMITS.short,
        errors,
        'auth.registerSubmitLabel',
      ),
      loadingLabel: readString(auth, 'loadingLabel', SITE_CONTENT_DEFAULTS.auth.loadingLabel, TEXT_LIMITS.short, errors, 'auth.loadingLabel'),
      loginFailedError: readString(
        auth,
        'loginFailedError',
        SITE_CONTENT_DEFAULTS.auth.loginFailedError,
        TEXT_LIMITS.short,
        errors,
        'auth.loginFailedError',
      ),
      passwordMismatchError: readString(
        auth,
        'passwordMismatchError',
        SITE_CONTENT_DEFAULTS.auth.passwordMismatchError,
        TEXT_LIMITS.short,
        errors,
        'auth.passwordMismatchError',
      ),
      registrationFailedError: readString(
        auth,
        'registrationFailedError',
        SITE_CONTENT_DEFAULTS.auth.registrationFailedError,
        TEXT_LIMITS.short,
        errors,
        'auth.registrationFailedError',
      ),
    },
    quickView: {
      addedToastTitle: readString(
        quickView,
        'addedToastTitle',
        SITE_CONTENT_DEFAULTS.quickView.addedToastTitle,
        TEXT_LIMITS.short,
        errors,
        'quickView.addedToastTitle',
      ),
      brandLabel: readString(
        quickView,
        'brandLabel',
        SITE_CONTENT_DEFAULTS.quickView.brandLabel,
        TEXT_LIMITS.short,
        errors,
        'quickView.brandLabel',
      ),
      closeLabel: readString(
        quickView,
        'closeLabel',
        SITE_CONTENT_DEFAULTS.quickView.closeLabel,
        TEXT_LIMITS.short,
        errors,
        'quickView.closeLabel',
      ),
      selectSizeLabel: readString(
        quickView,
        'selectSizeLabel',
        SITE_CONTENT_DEFAULTS.quickView.selectSizeLabel,
        TEXT_LIMITS.short,
        errors,
        'quickView.selectSizeLabel',
      ),
      addedButtonLabel: readString(
        quickView,
        'addedButtonLabel',
        SITE_CONTENT_DEFAULTS.quickView.addedButtonLabel,
        TEXT_LIMITS.short,
        errors,
        'quickView.addedButtonLabel',
      ),
      addToBagLabel: readString(
        quickView,
        'addToBagLabel',
        SITE_CONTENT_DEFAULTS.quickView.addToBagLabel,
        TEXT_LIMITS.short,
        errors,
        'quickView.addToBagLabel',
      ),
      removedWishlistToastTitle: readString(
        quickView,
        'removedWishlistToastTitle',
        SITE_CONTENT_DEFAULTS.quickView.removedWishlistToastTitle,
        TEXT_LIMITS.short,
        errors,
        'quickView.removedWishlistToastTitle',
      ),
      savedWishlistToastTitle: readString(
        quickView,
        'savedWishlistToastTitle',
        SITE_CONTENT_DEFAULTS.quickView.savedWishlistToastTitle,
        TEXT_LIMITS.short,
        errors,
        'quickView.savedWishlistToastTitle',
      ),
      savedWishlistButtonLabel: readString(
        quickView,
        'savedWishlistButtonLabel',
        SITE_CONTENT_DEFAULTS.quickView.savedWishlistButtonLabel,
        TEXT_LIMITS.short,
        errors,
        'quickView.savedWishlistButtonLabel',
      ),
      saveWishlistButtonLabel: readString(
        quickView,
        'saveWishlistButtonLabel',
        SITE_CONTENT_DEFAULTS.quickView.saveWishlistButtonLabel,
        TEXT_LIMITS.short,
        errors,
        'quickView.saveWishlistButtonLabel',
      ),
      fullDetailsLabel: readString(
        quickView,
        'fullDetailsLabel',
        SITE_CONTENT_DEFAULTS.quickView.fullDetailsLabel,
        TEXT_LIMITS.short,
        errors,
        'quickView.fullDetailsLabel',
      ),
    },
    backToTop: {
      ariaLabel: readString(
        backToTop,
        'ariaLabel',
        SITE_CONTENT_DEFAULTS.backToTop.ariaLabel,
        TEXT_LIMITS.short,
        errors,
        'backToTop.ariaLabel',
      ),
    },
    notFound: {
      code: readString(notFound, 'code', SITE_CONTENT_DEFAULTS.notFound.code, 12, errors, 'notFound.code'),
      eyebrow: readString(
        notFound,
        'eyebrow',
        SITE_CONTENT_DEFAULTS.notFound.eyebrow,
        TEXT_LIMITS.short,
        errors,
        'notFound.eyebrow',
      ),
      titleLines: readStringList(
        notFound['titleLines'],
        SITE_CONTENT_DEFAULTS.notFound.titleLines,
        4,
        TEXT_LIMITS.short,
        errors,
        'notFound.titleLines',
      ),
      body: readString(
        notFound,
        'body',
        SITE_CONTENT_DEFAULTS.notFound.body,
        TEXT_LIMITS.long,
        errors,
        'notFound.body',
      ),
      primaryLabel: readString(
        notFound,
        'primaryLabel',
        SITE_CONTENT_DEFAULTS.notFound.primaryLabel,
        TEXT_LIMITS.short,
        errors,
        'notFound.primaryLabel',
      ),
      primaryHref: readHref(
        notFound,
        'primaryHref',
        SITE_CONTENT_DEFAULTS.notFound.primaryHref,
        errors,
        'notFound.primaryHref',
      ),
      secondaryLabel: readString(
        notFound,
        'secondaryLabel',
        SITE_CONTENT_DEFAULTS.notFound.secondaryLabel,
        TEXT_LIMITS.short,
        errors,
        'notFound.secondaryLabel',
      ),
      secondaryHref: readHref(
        notFound,
        'secondaryHref',
        SITE_CONTENT_DEFAULTS.notFound.secondaryHref,
        errors,
        'notFound.secondaryHref',
      ),
      collectionLinks: readLinks(
        notFound['collectionLinks'],
        SITE_CONTENT_DEFAULTS.notFound.collectionLinks,
        8,
        errors,
        'notFound.collectionLinks',
      ),
    },
  };

  return { content, errors };
}

export function normalizeSiteContent(input: unknown): SiteContent {
  return validateSiteContent(input).content;
}
