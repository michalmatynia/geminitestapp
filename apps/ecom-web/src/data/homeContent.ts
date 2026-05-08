export interface HomeHeroStatContent {
  value: string;
  label: string;
}

export interface HomeHeroContent {
  status: string;
  headlineLine1: string;
  headlineLine2: string;
  tags: string[];
  description: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  stats: HomeHeroStatContent[];
  panelStatus: string;
  panelTitle: string;
  panelSubtitle: string;
  panelPrice: string;
  bottomStripItems: string[];
}

export interface HomeManifestoContent {
  marqueeItems: string[];
  eyebrow: string;
  quotePrefix: string;
  quoteEmphasis: string;
  quoteSuffix: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}

export type HomeCategorySelectorType = 'all' | 'category' | 'theme' | 'custom';

export interface HomeCategoryCardContent {
  id: string;
  label: string;
  sublabel: string;
  tag: string;
  href: string;
  imageUrl: string;
  selectorType: HomeCategorySelectorType;
  selectorValues: string[];
  fallbackCount: number;
}

export interface HomeCategoriesContent {
  eyebrow: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
  cards: HomeCategoryCardContent[];
}

export interface HomeFeaturedContent {
  liveEyebrow: string;
  fallbackEyebrow: string;
  title: string;
  filters: string[];
  quickAddLabel: string;
  ctaLiveLabel: string;
  ctaFallbackLabel: string;
  ctaHref: string;
}

export interface HomeEditorialReportContent {
  tag: string;
  title: string;
  excerpt: string;
  href: string;
}

export interface HomeEditorialContent {
  eyebrow: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
  readLabel: string;
  reports: HomeEditorialReportContent[];
}

export interface HomeRecentlyViewedContent {
  eyebrow: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface HomeContent {
  hero: HomeHeroContent;
  manifesto: HomeManifestoContent;
  categories: HomeCategoriesContent;
  featured: HomeFeaturedContent;
  editorial: HomeEditorialContent;
  recentlyViewed: HomeRecentlyViewedContent;
}

export interface HomeContentValidationResult {
  content: HomeContent;
  errors: string[];
}

export const HOME_CONTENT_DEFAULTS: HomeContent = {
  hero: {
    status: 'NEXUS ONLINE — NEW DROPS ACTIVE',
    headlineLine1: "COLLECTOR'S",
    headlineLine2: 'CACHE',
    tags: ['Anime', 'Gaming', 'Film', 'Manga', 'Keychains', 'Pins', 'Jewellery'],
    description:
      'Your favourite universes, forged into wearable art. Anime, gaming and film collectibles — officially licensed, obsessively curated.',
    primaryCtaLabel: 'Shop New Drops',
    primaryCtaHref: '/products?new=1',
    secondaryCtaLabel: 'Browse All',
    secondaryCtaHref: '/products',
    stats: [
      { value: '1,800+', label: 'Items' },
      { value: '118', label: 'Categories' },
      { value: '100+', label: 'Universes' },
    ],
    panelStatus: 'UNIT-001 / FEATURED',
    panelTitle: "Collector's Edition",
    panelSubtitle: 'Anime · Gaming · Film',
    panelPrice: 'From € 15',
    bottomStripItems: [
      'ANIME',
      'GAMING',
      'FILM',
      'MANGA',
      'COSPLAY',
      'COLLECTOR',
      'LIMITED EDITION',
      'RARE DROPS',
    ],
  },
  manifesto: {
    marqueeItems: [
      'Official Merch',
      'Anime Keychains',
      'Gaming Pins',
      'Film Collectibles',
      'Limited Drops',
      'Rare Finds',
    ],
    eyebrow: "The Collector's Creed",
    quotePrefix: 'Every universe deserves',
    quoteEmphasis: 'a piece you can hold',
    quoteSuffix: '.',
    body:
      'We source and curate officially licensed collectibles from the anime, gaming and film worlds — so every piece in your collection carries real meaning.',
    ctaLabel: 'Explore The Cache',
    ctaHref: '/products',
  },
  categories: {
    eyebrow: 'Browse by Universe',
    title: 'Choose Your World',
    ctaLabel: 'All collections',
    ctaHref: '/products',
    cards: [
      {
        id: 'objects',
        label: 'All Items',
        sublabel: 'Keychains · Pins · Charms',
        tag: 'Full Catalog',
        href: '/products',
        imageUrl: '',
        selectorType: 'all',
        selectorValues: [],
        fallbackCount: 1800,
      },
      {
        id: 'womenswear',
        label: 'Anime',
        sublabel: 'Pins · Keychains · Jewellery',
        tag: 'New Season',
        href: '/products?categories=Anime%20Ring,Anime%20Keychain',
        imageUrl: '',
        selectorType: 'category',
        selectorValues: ['Anime Ring', 'Anime Keychain'],
        fallbackCount: 640,
      },
      {
        id: 'menswear',
        label: 'Gaming',
        sublabel: 'RPG · FPS · Strategy Drops',
        tag: 'Hot Drops',
        href: '/products?themes=Elden%20Ring,Warhammer%2040k',
        imageUrl: '',
        selectorType: 'theme',
        selectorValues: ['Elden Ring', 'Warhammer 40k'],
        fallbackCount: 520,
      },
      {
        id: 'accessories',
        label: 'Film & TV',
        sublabel: 'Cinema · Series · Icons',
        tag: 'Collector',
        href: '/products?categories=Film%20Collectibles',
        imageUrl: '',
        selectorType: 'category',
        selectorValues: ['Film Collectibles'],
        fallbackCount: 380,
      },
    ],
  },
  featured: {
    liveEyebrow: 'Live Catalog',
    fallbackEyebrow: 'Featured Items',
    title: 'Fresh Drops',
    filters: ['All', 'Anime', 'Gaming', 'Film'],
    quickAddLabel: 'Add to Bag',
    ctaLiveLabel: 'View All 1,800+ Items',
    ctaFallbackLabel: 'View All Items',
    ctaHref: '/products',
  },
  editorial: {
    eyebrow: 'Universe Reports',
    title: 'Lore & Drops',
    ctaLabel: 'All reports',
    ctaHref: '#',
    readLabel: 'Read Report',
    reports: [
      {
        tag: 'Universe Report',
        title: 'Attack on Titan — The Final Collection',
        excerpt:
          'Survey Corps insignia, crystal-cast pins and wall-break keychains from the most iconic arc in modern anime.',
        href: '#',
      },
      {
        tag: 'Gaming Drop',
        title: 'Elden Ring Talisman Series',
        excerpt:
          'Gilded pendants, smithing stone charms and Great Rune keychains — forged for Tarnished who survived the Lands Between.',
        href: '#',
      },
      {
        tag: 'Film Collectible',
        title: 'Blade Runner 2049 — Off-World Edition',
        excerpt:
          'Origami figures, spinner-craft pendants and neon-etched charms inspired by the rain-soaked skylines of New Los Angeles.',
        href: '#',
      },
    ],
  },
  recentlyViewed: {
    eyebrow: 'Your trail',
    title: 'Recently Viewed',
    ctaLabel: 'Browse all',
    ctaHref: '/collections/objects',
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

function readStringList(
  source: Record<string, unknown>,
  key: string,
  fallback: string[],
  maxItems: number,
  maxItemLength: number,
  errors: string[],
  path: string,
): string[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const items: string[] = [];
  for (const item of value) {
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

function readStats(
  source: Record<string, unknown>,
  key: string,
  fallback: HomeHeroStatContent[],
  errors: string[],
): HomeHeroStatContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('hero.stats must be a list.');
    return fallback;
  }

  const stats: HomeHeroStatContent[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      errors.push('hero.stats items must be objects.');
      return fallback;
    }

    const statErrors: string[] = [];
    const valueText = readString(item, 'value', '', 40, statErrors, 'hero.stats.value');
    const label = readString(item, 'label', '', 40, statErrors, 'hero.stats.label');
    if (statErrors.length > 0) {
      errors.push(...statErrors);
      return fallback;
    }
    if (valueText || label) stats.push({ value: valueText, label });
  }

  if (stats.length > 6) {
    errors.push('hero.stats can contain at most 6 items.');
    return fallback;
  }

  return stats.length > 0 ? stats : fallback;
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
  errors: string[],
  path: string,
): number {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${path} must be a number.`);
    return fallback;
  }
  if (value < min || value > max) {
    errors.push(`${path} must be between ${min} and ${max}.`);
    return fallback;
  }
  return Math.round(value);
}

function readCategorySelectorType(
  source: Record<string, unknown>,
  fallback: HomeCategorySelectorType,
  errors: string[],
  path: string,
): HomeCategorySelectorType {
  const value = source['selectorType'];
  if (value == null) return fallback;
  if (value === 'all' || value === 'category' || value === 'theme' || value === 'custom') {
    return value;
  }
  errors.push(`${path} must be all, category, theme, or custom.`);
  return fallback;
}

function readCategoryCards(
  source: Record<string, unknown>,
  key: string,
  fallback: HomeCategoryCardContent[],
  errors: string[],
): HomeCategoryCardContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('categories.cards must be a list.');
    return fallback;
  }

  const cards: HomeCategoryCardContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackCard = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('categories.cards items must be objects.');
      return fallback;
    }

    cards.push({
      id: readString(item, 'id', fallbackCard.id, TEXT_LIMITS.short, errors, `categories.cards.${index}.id`),
      label: readString(item, 'label', fallbackCard.label, TEXT_LIMITS.short, errors, `categories.cards.${index}.label`),
      sublabel: readString(
        item,
        'sublabel',
        fallbackCard.sublabel,
        TEXT_LIMITS.medium,
        errors,
        `categories.cards.${index}.sublabel`,
      ),
      tag: readString(item, 'tag', fallbackCard.tag, TEXT_LIMITS.short, errors, `categories.cards.${index}.tag`),
      href: readHref(item, 'href', fallbackCard.href, errors, `categories.cards.${index}.href`),
      imageUrl: readHref(item, 'imageUrl', fallbackCard.imageUrl, errors, `categories.cards.${index}.imageUrl`),
      selectorType: readCategorySelectorType(
        item,
        fallbackCard.selectorType,
        errors,
        `categories.cards.${index}.selectorType`,
      ),
      selectorValues: readStringList(
        item,
        'selectorValues',
        fallbackCard.selectorValues,
        24,
        TEXT_LIMITS.short,
        errors,
        `categories.cards.${index}.selectorValues`,
      ),
      fallbackCount: readNumber(
        item,
        'fallbackCount',
        fallbackCard.fallbackCount,
        0,
        1_000_000,
        errors,
        `categories.cards.${index}.fallbackCount`,
      ),
    });
  }

  if (cards.length > 8) {
    errors.push('categories.cards can contain at most 8 items.');
    return fallback;
  }

  return cards.length > 0 ? cards : fallback;
}

function readEditorialReports(
  source: Record<string, unknown>,
  key: string,
  fallback: HomeEditorialReportContent[],
  errors: string[],
): HomeEditorialReportContent[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push('editorial.reports must be a list.');
    return fallback;
  }

  const reports: HomeEditorialReportContent[] = [];
  for (const [index, item] of value.entries()) {
    const fallbackReport = fallback[index] ?? fallback[0];
    if (!isRecord(item)) {
      errors.push('editorial.reports items must be objects.');
      return fallback;
    }

    reports.push({
      tag: readString(item, 'tag', fallbackReport.tag, TEXT_LIMITS.short, errors, `editorial.reports.${index}.tag`),
      title: readString(item, 'title', fallbackReport.title, TEXT_LIMITS.medium, errors, `editorial.reports.${index}.title`),
      excerpt: readString(
        item,
        'excerpt',
        fallbackReport.excerpt,
        TEXT_LIMITS.long,
        errors,
        `editorial.reports.${index}.excerpt`,
      ),
      href: readHref(item, 'href', fallbackReport.href, errors, `editorial.reports.${index}.href`),
    });
  }

  if (reports.length > 6) {
    errors.push('editorial.reports can contain at most 6 items.');
    return fallback;
  }

  return reports.length > 0 ? reports : fallback;
}

export function validateHomeContent(input: unknown): HomeContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const hero = isRecord(root['hero']) ? root['hero'] : {};
  const manifesto = isRecord(root['manifesto']) ? root['manifesto'] : {};
  const categories = isRecord(root['categories']) ? root['categories'] : {};
  const featured = isRecord(root['featured']) ? root['featured'] : {};
  const editorial = isRecord(root['editorial']) ? root['editorial'] : {};
  const recentlyViewed = isRecord(root['recentlyViewed']) ? root['recentlyViewed'] : {};

  const content: HomeContent = {
    hero: {
      status: readString(hero, 'status', HOME_CONTENT_DEFAULTS.hero.status, TEXT_LIMITS.short, errors, 'hero.status'),
      headlineLine1: readString(
        hero,
        'headlineLine1',
        HOME_CONTENT_DEFAULTS.hero.headlineLine1,
        TEXT_LIMITS.short,
        errors,
        'hero.headlineLine1',
      ),
      headlineLine2: readString(
        hero,
        'headlineLine2',
        HOME_CONTENT_DEFAULTS.hero.headlineLine2,
        TEXT_LIMITS.short,
        errors,
        'hero.headlineLine2',
      ),
      tags: readStringList(
        hero,
        'tags',
        HOME_CONTENT_DEFAULTS.hero.tags,
        18,
        40,
        errors,
        'hero.tags',
      ),
      description: readString(
        hero,
        'description',
        HOME_CONTENT_DEFAULTS.hero.description,
        TEXT_LIMITS.long,
        errors,
        'hero.description',
      ),
      primaryCtaLabel: readString(
        hero,
        'primaryCtaLabel',
        HOME_CONTENT_DEFAULTS.hero.primaryCtaLabel,
        TEXT_LIMITS.short,
        errors,
        'hero.primaryCtaLabel',
      ),
      primaryCtaHref: readHref(
        hero,
        'primaryCtaHref',
        HOME_CONTENT_DEFAULTS.hero.primaryCtaHref,
        errors,
        'hero.primaryCtaHref',
      ),
      secondaryCtaLabel: readString(
        hero,
        'secondaryCtaLabel',
        HOME_CONTENT_DEFAULTS.hero.secondaryCtaLabel,
        TEXT_LIMITS.short,
        errors,
        'hero.secondaryCtaLabel',
      ),
      secondaryCtaHref: readHref(
        hero,
        'secondaryCtaHref',
        HOME_CONTENT_DEFAULTS.hero.secondaryCtaHref,
        errors,
        'hero.secondaryCtaHref',
      ),
      stats: readStats(hero, 'stats', HOME_CONTENT_DEFAULTS.hero.stats, errors),
      panelStatus: readString(
        hero,
        'panelStatus',
        HOME_CONTENT_DEFAULTS.hero.panelStatus,
        TEXT_LIMITS.short,
        errors,
        'hero.panelStatus',
      ),
      panelTitle: readString(
        hero,
        'panelTitle',
        HOME_CONTENT_DEFAULTS.hero.panelTitle,
        TEXT_LIMITS.short,
        errors,
        'hero.panelTitle',
      ),
      panelSubtitle: readString(
        hero,
        'panelSubtitle',
        HOME_CONTENT_DEFAULTS.hero.panelSubtitle,
        TEXT_LIMITS.short,
        errors,
        'hero.panelSubtitle',
      ),
      panelPrice: readString(
        hero,
        'panelPrice',
        HOME_CONTENT_DEFAULTS.hero.panelPrice,
        TEXT_LIMITS.short,
        errors,
        'hero.panelPrice',
      ),
      bottomStripItems: readStringList(
        hero,
        'bottomStripItems',
        HOME_CONTENT_DEFAULTS.hero.bottomStripItems,
        24,
        40,
        errors,
        'hero.bottomStripItems',
      ),
    },
    manifesto: {
      marqueeItems: readStringList(
        manifesto,
        'marqueeItems',
        HOME_CONTENT_DEFAULTS.manifesto.marqueeItems,
        24,
        60,
        errors,
        'manifesto.marqueeItems',
      ),
      eyebrow: readString(
        manifesto,
        'eyebrow',
        HOME_CONTENT_DEFAULTS.manifesto.eyebrow,
        TEXT_LIMITS.short,
        errors,
        'manifesto.eyebrow',
      ),
      quotePrefix: readString(
        manifesto,
        'quotePrefix',
        HOME_CONTENT_DEFAULTS.manifesto.quotePrefix,
        TEXT_LIMITS.medium,
        errors,
        'manifesto.quotePrefix',
      ),
      quoteEmphasis: readString(
        manifesto,
        'quoteEmphasis',
        HOME_CONTENT_DEFAULTS.manifesto.quoteEmphasis,
        TEXT_LIMITS.medium,
        errors,
        'manifesto.quoteEmphasis',
      ),
      quoteSuffix: readString(
        manifesto,
        'quoteSuffix',
        HOME_CONTENT_DEFAULTS.manifesto.quoteSuffix,
        TEXT_LIMITS.medium,
        errors,
        'manifesto.quoteSuffix',
      ),
      body: readString(
        manifesto,
        'body',
        HOME_CONTENT_DEFAULTS.manifesto.body,
        TEXT_LIMITS.long,
        errors,
        'manifesto.body',
      ),
      ctaLabel: readString(
        manifesto,
        'ctaLabel',
        HOME_CONTENT_DEFAULTS.manifesto.ctaLabel,
        TEXT_LIMITS.short,
        errors,
        'manifesto.ctaLabel',
      ),
      ctaHref: readHref(
        manifesto,
        'ctaHref',
        HOME_CONTENT_DEFAULTS.manifesto.ctaHref,
        errors,
        'manifesto.ctaHref',
      ),
    },
    categories: {
      eyebrow: readString(
        categories,
        'eyebrow',
        HOME_CONTENT_DEFAULTS.categories.eyebrow,
        TEXT_LIMITS.short,
        errors,
        'categories.eyebrow',
      ),
      title: readString(
        categories,
        'title',
        HOME_CONTENT_DEFAULTS.categories.title,
        TEXT_LIMITS.short,
        errors,
        'categories.title',
      ),
      ctaLabel: readString(
        categories,
        'ctaLabel',
        HOME_CONTENT_DEFAULTS.categories.ctaLabel,
        TEXT_LIMITS.short,
        errors,
        'categories.ctaLabel',
      ),
      ctaHref: readHref(
        categories,
        'ctaHref',
        HOME_CONTENT_DEFAULTS.categories.ctaHref,
        errors,
        'categories.ctaHref',
      ),
      cards: readCategoryCards(categories, 'cards', HOME_CONTENT_DEFAULTS.categories.cards, errors),
    },
    featured: {
      liveEyebrow: readString(
        featured,
        'liveEyebrow',
        HOME_CONTENT_DEFAULTS.featured.liveEyebrow,
        TEXT_LIMITS.short,
        errors,
        'featured.liveEyebrow',
      ),
      fallbackEyebrow: readString(
        featured,
        'fallbackEyebrow',
        HOME_CONTENT_DEFAULTS.featured.fallbackEyebrow,
        TEXT_LIMITS.short,
        errors,
        'featured.fallbackEyebrow',
      ),
      title: readString(
        featured,
        'title',
        HOME_CONTENT_DEFAULTS.featured.title,
        TEXT_LIMITS.short,
        errors,
        'featured.title',
      ),
      filters: readStringList(
        featured,
        'filters',
        HOME_CONTENT_DEFAULTS.featured.filters,
        12,
        40,
        errors,
        'featured.filters',
      ),
      quickAddLabel: readString(
        featured,
        'quickAddLabel',
        HOME_CONTENT_DEFAULTS.featured.quickAddLabel,
        TEXT_LIMITS.short,
        errors,
        'featured.quickAddLabel',
      ),
      ctaLiveLabel: readString(
        featured,
        'ctaLiveLabel',
        HOME_CONTENT_DEFAULTS.featured.ctaLiveLabel,
        TEXT_LIMITS.short,
        errors,
        'featured.ctaLiveLabel',
      ),
      ctaFallbackLabel: readString(
        featured,
        'ctaFallbackLabel',
        HOME_CONTENT_DEFAULTS.featured.ctaFallbackLabel,
        TEXT_LIMITS.short,
        errors,
        'featured.ctaFallbackLabel',
      ),
      ctaHref: readHref(
        featured,
        'ctaHref',
        HOME_CONTENT_DEFAULTS.featured.ctaHref,
        errors,
        'featured.ctaHref',
      ),
    },
    editorial: {
      eyebrow: readString(
        editorial,
        'eyebrow',
        HOME_CONTENT_DEFAULTS.editorial.eyebrow,
        TEXT_LIMITS.short,
        errors,
        'editorial.eyebrow',
      ),
      title: readString(
        editorial,
        'title',
        HOME_CONTENT_DEFAULTS.editorial.title,
        TEXT_LIMITS.short,
        errors,
        'editorial.title',
      ),
      ctaLabel: readString(
        editorial,
        'ctaLabel',
        HOME_CONTENT_DEFAULTS.editorial.ctaLabel,
        TEXT_LIMITS.short,
        errors,
        'editorial.ctaLabel',
      ),
      ctaHref: readHref(
        editorial,
        'ctaHref',
        HOME_CONTENT_DEFAULTS.editorial.ctaHref,
        errors,
        'editorial.ctaHref',
      ),
      readLabel: readString(
        editorial,
        'readLabel',
        HOME_CONTENT_DEFAULTS.editorial.readLabel,
        TEXT_LIMITS.short,
        errors,
        'editorial.readLabel',
      ),
      reports: readEditorialReports(editorial, 'reports', HOME_CONTENT_DEFAULTS.editorial.reports, errors),
    },
    recentlyViewed: {
      eyebrow: readString(
        recentlyViewed,
        'eyebrow',
        HOME_CONTENT_DEFAULTS.recentlyViewed.eyebrow,
        TEXT_LIMITS.short,
        errors,
        'recentlyViewed.eyebrow',
      ),
      title: readString(
        recentlyViewed,
        'title',
        HOME_CONTENT_DEFAULTS.recentlyViewed.title,
        TEXT_LIMITS.short,
        errors,
        'recentlyViewed.title',
      ),
      ctaLabel: readString(
        recentlyViewed,
        'ctaLabel',
        HOME_CONTENT_DEFAULTS.recentlyViewed.ctaLabel,
        TEXT_LIMITS.short,
        errors,
        'recentlyViewed.ctaLabel',
      ),
      ctaHref: readHref(
        recentlyViewed,
        'ctaHref',
        HOME_CONTENT_DEFAULTS.recentlyViewed.ctaHref,
        errors,
        'recentlyViewed.ctaHref',
      ),
    },
  };

  return { content, errors };
}

export function normalizeHomeContent(input: unknown): HomeContent {
  return validateHomeContent(input).content;
}
