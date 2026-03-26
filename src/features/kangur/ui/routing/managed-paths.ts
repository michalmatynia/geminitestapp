import type { Session } from 'next-auth';

import {
  KANGUR_BASE_PATH,
  getKangurCanonicalPublicHref,
  normalizeKangurBasePath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import {
  canAccessKangurPage,
  resolveAccessibleKangurPageKey,
} from '@/features/kangur/config/page-access';
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

const ABSOLUTE_URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

const canonicalizeKangurPublicAliasPathnameUnsafe = (pathname: string): string => {
  const normalizedPathname = stripSiteLocalePrefix(pathname);

  if (normalizedPathname !== '/kangur' && !normalizedPathname.startsWith('/kangur/')) {
    return pathname;
  }

  const slugSegments = normalizedPathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .slice(1);
  const localizedAliasLocale = getPathLocale(pathname);
  const canonicalPathname = getKangurCanonicalPublicHref(slugSegments);

  return localizedAliasLocale
    ? buildLocalizedPathname(canonicalPathname, localizedAliasLocale)
    : canonicalPathname;
};

export const canonicalizeKangurPublicAliasPathname = (pathname: string): string =>
  withKangurClientErrorSync(
    {
      source: 'kangur.routing',
      action: 'canonicalize-public-alias-pathname',
      description: 'Canonicalizes /kangur alias pathnames to the public Kangur route space.',
      context: { pathname },
    },
    () => canonicalizeKangurPublicAliasPathnameUnsafe(pathname),
    { fallback: pathname }
  );

export const canonicalizeKangurPublicAliasHref = (href: string): string => {
  if (!isManagedLocalHref(href)) {
    return href;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.routing',
      action: 'canonicalize-public-alias-href',
      description: 'Canonicalizes /kangur alias hrefs to the public Kangur route space.',
      context: { href },
    },
    () => {
      const parsed = new URL(href, 'https://kangur.local');
      const canonicalPathname = canonicalizeKangurPublicAliasPathnameUnsafe(parsed.pathname);
      return `${canonicalPathname}${parsed.search}${parsed.hash}`;
    },
    { fallback: href }
  );
};

export const resolveRouteAwareManagedKangurHref = ({
  href,
  pathname,
  currentOrigin,
  canonicalizePublicAlias = false,
}: {
  href: string | null | undefined;
  pathname: string | null;
  currentOrigin?: string | null;
  canonicalizePublicAlias?: boolean;
}): string | undefined => {
  const trimmedHref = typeof href === 'string' ? href.trim() : '';

  if (!trimmedHref) {
    return undefined;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.routing',
      action: 'resolve-route-aware-href',
      description:
        'Resolves managed Kangur hrefs against the active locale and public alias mode.',
      context: {
        href: trimmedHref,
        pathname,
        currentOrigin,
        canonicalizePublicAlias,
      },
    },
    () => {
      let managedHref = trimmedHref;

      if (!managedHref.startsWith('/')) {
        if (!ABSOLUTE_URL_SCHEME_PATTERN.test(managedHref)) {
          return managedHref;
        }

        if (!currentOrigin) {
          return managedHref;
        }

        const parsed = new URL(managedHref);

        if (parsed.origin !== currentOrigin) {
          return managedHref;
        }

        managedHref = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      const localizedHref = localizeManagedKangurHref({
        href: managedHref,
        locale: normalizeSiteLocale(getPathLocale(pathname)),
        pathname,
      });

      return canonicalizePublicAlias
        ? canonicalizeKangurPublicAliasHref(localizedHref)
        : localizedHref;
    },
    { fallback: trimmedHref }
  );
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

export const resolveAccessibleManagedKangurPageKeyFromHref = <TPageKey extends string>(input: {
  href: string;
  basePath: string;
  session?: Session | null;
  fallbackPageKey: TPageKey;
}): TPageKey => {
  const { href, basePath, session, fallbackPageKey } = input;
  const resolvedPageKey = resolveManagedKangurPageKeyFromHref(href, basePath);

  return resolveAccessibleKangurPageKey(resolvedPageKey as TPageKey | null, session, fallbackPageKey);
};

export const resolveManagedKangurEmbeddedFromHref = ({
  href,
  basePath,
}: {
  href: string | null | undefined;
  basePath: string;
}): boolean | null => {
  const normalizedBasePath = normalizeKangurBasePath(basePath);

  if (normalizedBasePath !== '/') {
    return false;
  }

  if (typeof href !== 'string' || !href.trim() || !isManagedLocalHref(href.trim())) {
    return null;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.routing',
      action: 'resolve-embedded-from-href',
      description: 'Resolves whether a managed Kangur href should render in embedded mode.',
      context: { href, basePath: normalizedBasePath },
    },
    () => {
      const parsed = new URL(href, 'https://kangur.local');
      const normalizedPathname = normalizeManagedKangurPathname(parsed.pathname);

      if (!normalizedPathname) {
        return null;
      }

      return normalizedPathname === '/';
    },
    { fallback: null }
  );
};

export const sanitizeAccessibleManagedKangurHref = ({
  href,
  pathname,
  currentOrigin,
  canonicalizePublicAlias = false,
  basePath = KANGUR_BASE_PATH,
  fallbackHref,
  session,
}: {
  href: string | null | undefined;
  pathname: string | null;
  currentOrigin?: string | null;
  canonicalizePublicAlias?: boolean;
  basePath?: string | null;
  fallbackHref: string;
  session?: Session | null;
}): string | undefined => {
  const resolvedHref = resolveRouteAwareManagedKangurHref({
    href,
    pathname,
    currentOrigin,
    canonicalizePublicAlias,
  });

  if (!resolvedHref) {
    return undefined;
  }

  const effectiveBasePath = normalizeKangurBasePath(basePath ?? KANGUR_BASE_PATH);
  const resolvedPageKey = resolveManagedKangurPageKeyFromHref(resolvedHref, effectiveBasePath);

  if (!resolvedPageKey || canAccessKangurPage(resolvedPageKey, session)) {
    return resolvedHref;
  }

  return (
    resolveRouteAwareManagedKangurHref({
      href: fallbackHref,
      pathname,
      currentOrigin,
      canonicalizePublicAlias,
    }) ?? fallbackHref
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
