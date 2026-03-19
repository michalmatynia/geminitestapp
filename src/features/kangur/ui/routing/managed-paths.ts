import {
  normalizeKangurBasePath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';

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
