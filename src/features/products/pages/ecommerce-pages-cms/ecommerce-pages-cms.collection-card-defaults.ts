import type { EcommercePagesCmsCollectionCard } from './ecommerce-pages-cms.collection-cards.server';

export const COLLECTION_CARD_DEFAULT_FALLBACK: EcommercePagesCmsCollectionCard = {
  id: 'objects',
  label: 'All Items',
  sublabel: 'Keychains · Pins · Charms',
  tag: 'Full Catalog',
  visible: true,
  href: '/products',
  imageUrl: '',
  selectorType: 'all',
  selectorValues: [],
  fallbackCount: 1800,
};

const ANIME_COLLECTION_CATEGORY_FILTERS = [
  'Anime Cards',
  'Anime Figurine',
  'Anime Keychain',
  'Anime Pendant',
  'Anime Pin',
  'Anime Plushie',
  'Anime Ring',
  'Anime Wallet',
];

const GAMING_COLLECTION_CATEGORY_FILTERS = [
  'Gaming Bottle Opener',
  'Gaming Bracelets',
  'Gaming Coins',
  'Gaming Cufflinks',
  'Gaming Keycap',
  'Gaming Keychain',
  'Gaming Magnet',
  'Gaming Notebook',
  'Gaming Pendant',
  'Gaming Pin',
  'Gaming Plushie',
  'Gaming Ring',
  'Gaming Sticker',
  'Gaming Wallet',
];

const MOVIE_COLLECTION_CATEGORY_FILTERS = [
  'Movie Bottle Opener',
  'Movie Comb',
  'Movie Figurine',
  'Movie Keychain',
  'Movie Magnet',
  'Movie Pendant',
  'Movie Pin',
  'Movie Ring',
  'Movie Wallet',
];

const buildCategoryFilterHref = (values: string[]): string =>
  `/products?categories=${values.map((value) => encodeURIComponent(value)).join(',')}`;

export const DEFAULT_COLLECTION_CARDS: EcommercePagesCmsCollectionCard[] = [
  COLLECTION_CARD_DEFAULT_FALLBACK,
  {
    id: 'womenswear',
    label: 'Anime',
    sublabel: 'Pins · Keychains · Jewellery',
    tag: 'New Season',
    visible: true,
    href: buildCategoryFilterHref(ANIME_COLLECTION_CATEGORY_FILTERS),
    imageUrl: '',
    selectorType: 'category',
    selectorValues: ANIME_COLLECTION_CATEGORY_FILTERS,
    fallbackCount: 640,
  },
  {
    id: 'menswear',
    label: 'Gaming',
    sublabel: 'RPG · FPS · Strategy Drops',
    tag: 'Hot Drops',
    visible: true,
    href: buildCategoryFilterHref(GAMING_COLLECTION_CATEGORY_FILTERS),
    imageUrl: '',
    selectorType: 'category',
    selectorValues: GAMING_COLLECTION_CATEGORY_FILTERS,
    fallbackCount: 520,
  },
  {
    id: 'accessories',
    label: 'Film & TV',
    sublabel: 'Cinema · Series · Icons',
    tag: 'Collector',
    visible: true,
    href: buildCategoryFilterHref(MOVIE_COLLECTION_CATEGORY_FILTERS),
    imageUrl: '',
    selectorType: 'category',
    selectorValues: MOVIE_COLLECTION_CATEGORY_FILTERS,
    fallbackCount: 380,
  },
];
