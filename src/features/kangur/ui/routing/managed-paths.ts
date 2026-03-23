import {
  normalizeKangurBasePath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import {
  buildLocalizedPathname,
  getPathLocale,
  normalizeSiteLocale,
  stripSiteLocalePrefix,
} from '@/shared/lib/i18n/site-locale';

export const isManagedLocalHref = (href: string): boolean =>
  href.startsWith('/') && !href.startsWith('//');

export const normalizeManagedKangurPathname = (
  pathname: string | null | undefined
): string | null => {
  if (typeof pathname !== 'string') {
    return null;
  }

  const trimmed = pathname.trim();
  if (!trimmed) {
    return null;
  }

  const withoutQuery = trimmed.split('?')[0] ?? trimmed;
  const withoutHash = withoutQuery.split('#')[0] ?? withoutQuery;
  const localeStrippedPath = stripSiteLocalePrefix(withoutHash);
  return localeStrippedPath.replace(/\/+$/, '') || '/';
};

export const getKangurSlugFromPathname = (
  pathname: string | null | undefined,
  normalizedBasePath: string
): string[] => {
  const normalizedPathname =
    normalizeManagedKangurPathname(pathname) ?? normalizedBasePath;

  if (normalizedBasePath === '/') {
    return normalizedPathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  if (
    normalizedPathname === normalizedBasePath ||
    normalizedPathname === `${normalizedBasePath}/`
  ) {
    return [];
  }

  if (!normalizedPathname.startsWith(`${normalizedBasePath}/`)) {
    return [];
  }

  return normalizedPathname
    .slice(normalizedBasePath.length + 1)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
};

export const resolveManagedKangurPageKeyFromHref = (
  href: string,
  basePath: string
): string | null => {
  if (!isManagedLocalHref(href)) {
    return null;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.routing',
      action: 'resolve-page-key',
      description: 'Resolves the Kangur page key from a managed href.',
      context: { href, basePath },
    },
    () => {
      const parsed = new URL(href, 'https://kangur.local');
      const normalizedBasePath = normalizeKangurBasePath(basePath);
      const normalizedPathname = normalizeManagedKangurPathname(parsed.pathname);

      if (!normalizedPathname) {
        return null;
      }

      if (
        normalizedBasePath !== '/' &&
        normalizedPathname !== normalizedBasePath &&
        !normalizedPathname.startsWith(`${normalizedBasePath}/`)
      ) {
        return null;
      }

      const slug = getKangurSlugFromPathname(normalizedPathname, normalizedBasePath);
      return resolveKangurPageKeyFromSlug(slug[0] ?? null);
    },
    { fallback: null }
  );
};

export const localizeManagedKangurHref = ({
  href,
  locale,
  pathname,
  transitionKind,
}: {
  href: string;
  locale: string;
  pathname: string | null;
  transitionKind?: 'navigation' | 'locale-switch' | null;
}): string => {
  if (!isManagedLocalHref(href)) {
    return href;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.routing',
      action: 'localize-managed-href',
      description: 'Localizes managed Kangur hrefs to the active route locale.',
      context: {
        href,
        locale,
        pathname,
      },
    },
    () => {
      const parsed = new URL(href, 'https://kangur.local');
      const hrefLocale = getPathLocale(parsed.pathname);
      if (hrefLocale) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      if (transitionKind === 'locale-switch') {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      const explicitPathLocale = getPathLocale(pathname);
      const normalizedPathname = stripSiteLocalePrefix(parsed.pathname);
      const normalizedCurrentPathname = stripSiteLocalePrefix(pathname);
      if (explicitPathLocale && normalizedCurrentPathname === normalizedPathname) {
        return `${normalizedPathname}${parsed.search}${parsed.hash}`;
      }

      const localizedPathname = explicitPathLocale
        ? normalizedPathname === '/'
          ? `/${explicitPathLocale}`
          : `/${explicitPathLocale}${normalizedPathname}`
        : buildLocalizedPathname(normalizedPathname, normalizeSiteLocale(locale));

      return `${localizedPathname}${parsed.search}${parsed.hash}`;
    },
    { fallback: href }
  );
};
