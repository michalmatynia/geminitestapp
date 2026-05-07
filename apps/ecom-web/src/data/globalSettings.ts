export interface FooterLink {
  label: string;
  href: string;
}

export interface GlobalSettings {
  announcementBanner: string;
  footerLinks: Record<string, FooterLink[]>;
  trendingSearches: string[];
}

export const GLOBAL_SETTINGS_DEFAULTS: GlobalSettings = {
  announcementBanner: 'Free shipping on orders over € 60 — New drops every week',
  footerLinks: {
    Shop: [
      { label: 'Anime Keychains', href: '/collections/womenswear' },
      { label: 'Gaming Pins', href: '/collections/menswear' },
      { label: 'Film Collectibles', href: '/collections/accessories' },
      { label: 'New Drops', href: '/products?new=1' },
      { label: 'All Items', href: '/products' },
    ],
    Company: [
      { label: 'About ARCANA', href: '/about' },
      { label: 'Sourcing & Ethics', href: '/sourcing' },
      { label: 'Press', href: '/press' },
      { label: 'Affiliates', href: '/affiliates' },
      { label: 'Careers', href: '/careers' },
    ],
    Support: [
      { label: 'Sizing Guide', href: '/sizing' },
      { label: 'Care Guide', href: '/care' },
      { label: 'Returns', href: '/returns' },
      { label: 'Shipping', href: '/shipping' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  trendingSearches: ['Anime', 'Attack on Titan', 'Keychain', 'Elden Ring', 'Ghibli'],
};

export function normalizeGlobalSettings(input: unknown): GlobalSettings {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return GLOBAL_SETTINGS_DEFAULTS;
  }
  const src = input as Record<string, unknown>;
  return {
    announcementBanner:
      typeof src['announcementBanner'] === 'string'
        ? src['announcementBanner'].trim().slice(0, 240) || GLOBAL_SETTINGS_DEFAULTS.announcementBanner
        : GLOBAL_SETTINGS_DEFAULTS.announcementBanner,
    footerLinks: isValidFooterLinks(src['footerLinks'])
      ? (src['footerLinks'] as Record<string, FooterLink[]>)
      : GLOBAL_SETTINGS_DEFAULTS.footerLinks,
    trendingSearches: Array.isArray(src['trendingSearches'])
      ? (src['trendingSearches'] as unknown[])
          .filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
          .map((t) => t.trim())
          .slice(0, 20)
      : GLOBAL_SETTINGS_DEFAULTS.trendingSearches,
  };
}

function isValidFooterLinks(value: unknown): value is Record<string, FooterLink[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (group) =>
      Array.isArray(group) &&
      group.every(
        (link): link is FooterLink =>
          typeof (link as Record<string, unknown>)['label'] === 'string' &&
          typeof (link as Record<string, unknown>)['href'] === 'string',
      ),
  );
}
