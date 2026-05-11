export type HomeUniverseCategoryPrefix = 'Anime' | 'Gaming' | 'Movie';

export const HOME_UNIVERSE_CATEGORY_FILTERS: Record<HomeUniverseCategoryPrefix, string[]> = {
  Anime: [
    'Anime Cards',
    'Anime Figurine',
    'Anime Keychain',
    'Anime Pendant',
    'Anime Pin',
    'Anime Plushie',
    'Anime Ring',
    'Anime Wallet',
  ],
  Gaming: [
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
  ],
  Movie: [
    'Movie Bottle Opener',
    'Movie Comb',
    'Movie Figurine',
    'Movie Keychain',
    'Movie Magnet',
    'Movie Pendant',
    'Movie Pin',
    'Movie Ring',
    'Movie Wallet',
  ],
};

export function buildCategoryFilterHref(values: string[]): string {
  return `/products?categories=${values.map((value) => encodeURIComponent(value)).join(',')}`;
}
