import 'server-only';

import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { type JSX } from 'react';

import { renderCmsPage } from '@/app/(frontend)/cms/render';
import {
  buildSlugMetadata,
  loadPublishedSlugRenderDataCached,
  loadSlugRenderData,
  resolvePublishedSlugToPageCached,
  resolveSlugToPage,
  type SlugRenderData,
} from '@/app/(frontend)/cms/slug-page-data';
import { HomeContent } from '@/app/(frontend)/home/HomeContent';
import { createHomeTimingRecorder } from '@/app/(frontend)/home/home-timing';
import {
  getCmsRepository,
  getCmsThemeSettings,
  getSlugsForDomain,
  isDomainZoningEnabled,
  resolveCmsDomainFromHeaders,
} from '@/features/cms/server';
import type { CmsDomain, Slug } from '@/shared/contracts/cms';
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { readOptionalRequestHeaders } from '@/shared/lib/request/optional-headers';
import { CmsStorefrontAppearanceProvider } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';

import type { Metadata } from 'next';

type RequestHeaders =
  | Headers
  | { get: (key: string) => string | null }
  | Record<string, unknown>;

type SlugSearchParams = Record<string, string | string[] | undefined>;

type CmsPublicSlugRouteOptions = {
  locale?: string | null;
  slug: string[];
  searchParams?: SlugSearchParams;
};

type CmsPublicHomeRouteOptions = {
  locale?: string | null;
};

const getHostFromHeadersObject = (
  headers: { get: (key: string) => string | null }
): string | undefined => headers.get('x-forwarded-host') ?? headers.get('host') ?? undefined;

const getHostFromPlainObject = (headers: Record<string, unknown>): string | undefined => {
  if (Array.isArray(headers)) return undefined;
  const value =
    headers['x-forwarded-host'] ??
    headers['X-Forwarded-Host'] ??
    headers['host'] ??
    headers['Host'];
  return typeof value === 'string' ? value : undefined;
};

const getHostFromHeaders = (headers: RequestHeaders | null | undefined): string | undefined => {
  if (headers === null || headers === undefined) return undefined;
  if (typeof (headers as { get?: unknown }).get === 'function') {
    return getHostFromHeadersObject(headers as { get: (key: string) => string | null });
  }
  if (typeof headers === 'object') {
    return getHostFromPlainObject(headers as Record<string, unknown>);
  }
  return undefined;
};

const parseHost = (rawHost: string): string => {
  try {
    return new URL(`http://${rawHost}`).hostname.toLowerCase();
  } catch {
    return rawHost.toLowerCase();
  }
};

const resolveRawHost = (forwardedHost: string | undefined): string => {
  if (typeof forwardedHost !== 'string' || forwardedHost.trim().length === 0) return '';
  return forwardedHost.split(',')[0]?.trim() ?? '';
};

const getAppHostname = (): string => {
  const appUrl =
    process.env['NEXT_PUBLIC_APP_URL'] ??
    process.env['NEXTAUTH_URL'] ??
    'http://localhost';
  try {
    return new URL(appUrl).hostname.toLowerCase();
  } catch {
    return 'localhost';
  }
};

const getFallbackHomeHost = (headers: RequestHeaders | null | undefined): string => {
  const rawHost = resolveRawHost(getHostFromHeaders(headers));
  if (rawHost !== '') return parseHost(rawHost);
  return getAppHostname();
};

const buildFallbackHomeDomain = (headers: RequestHeaders | null | undefined): CmsDomain => {
  const host = getFallbackHomeHost(headers);

  return {
    id: 'default-domain',
    name: 'Default domain',
    domain: host,
    createdAt: '1970-01-01T00:00:00.000Z',
    updatedAt: '1970-01-01T00:00:00.000Z',
  };
};

const getHomeSlugsForDomainCached = async ({
  domainId,
  locale,
}: {
  domainId: string;
  locale?: string;
}): Promise<Slug[]> => {
  'use cache';
  applyCacheLife('swr300');

  try {
    const cmsRepository = await getCmsRepository();
    const lookupOptions = typeof locale === 'string' && locale !== '' ? { locale } : undefined;
    return await getSlugsForDomain(domainId, cmsRepository, lookupOptions);
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
      return [];
    }
    throw error;
  }
};

const resolveHomeDomainWithRecovery = async (
  headers: RequestHeaders | null | undefined
): Promise<CmsDomain> => {
  try {
    return await resolveCmsDomainFromHeaders(headers);
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
      return buildFallbackHomeDomain(headers);
    }
    throw error;
  }
};

const resolveRouteLocale = (locale?: string | null): string | undefined =>
  typeof locale === 'string' ? normalizeSiteLocale(locale) : undefined;

const getCmsAppearanceMode = (
  themeSettings: Awaited<ReturnType<typeof getCmsThemeSettings>>
): 'dark' | 'default' => (themeSettings.darkMode === true ? 'dark' : 'default');

async function renderCmsPublicHomePage(children: JSX.Element): Promise<JSX.Element> {
  const themeSettings = await getCmsThemeSettings();

  return (
    <CmsStorefrontAppearanceProvider initialMode={getCmsAppearanceMode(themeSettings)}>
      {children}
    </CmsStorefrontAppearanceProvider>
  );
}

function renderCmsPublicSlugPage(renderData: SlugRenderData): JSX.Element {
  return (
    <CmsStorefrontAppearanceProvider initialMode={getCmsAppearanceMode(renderData.themeSettings)}>
      {renderCmsPage(renderData)}
    </CmsStorefrontAppearanceProvider>
  );
}

export const generateCmsPublicSlugRouteMetadata = async ({
  locale,
  slug,
}: Pick<CmsPublicSlugRouteOptions, 'locale' | 'slug'>): Promise<Metadata> => {
  const resolvedLocale = resolveRouteLocale(locale);
  const hasLocale = typeof resolvedLocale === 'string' && resolvedLocale !== '';
  const routeTranslations = hasLocale
    ? await getTranslations({ locale: resolvedLocale, namespace: 'Routes' })
    : await getTranslations('Routes');

  const domain = await resolveCmsDomainFromHeaders(await readOptionalRequestHeaders());
  const page =
    (await resolvePublishedSlugToPageCached(domain.id, slug, {
      locale: resolvedLocale,
    })) ??
    (await resolveSlugToPage(slug, {
      locale: resolvedLocale,
      domainId: domain.id,
    }));

  if (page === null) {
    return { title: routeTranslations('pageNotFoundTitle') };
  }

  return buildSlugMetadata(page);
};

export const renderCmsPublicSlugRoute = async ({
  locale,
  slug,
}: CmsPublicSlugRouteOptions): Promise<JSX.Element> => {
  const resolvedLocale = resolveRouteLocale(locale);
  const domain = await resolveCmsDomainFromHeaders(await readOptionalRequestHeaders());
  const page =
    (await resolvePublishedSlugToPageCached(domain.id, slug, {
      locale: resolvedLocale,
    })) ??
    (await resolveSlugToPage(slug, {
      locale: resolvedLocale,
      domainId: domain.id,
    }));

  if (page === null) {
    notFound();
  }

  const renderData =
    (page.status === 'published'
      ? await loadPublishedSlugRenderDataCached(page.id, domain.id, {
          locale: resolvedLocale,
        })
      : null) ??
    (await loadSlugRenderData(page, {
      locale: resolvedLocale,
      domainId: domain.id,
    }));

  return renderCmsPublicSlugPage(renderData);
};

export const renderCmsPublicHomeRoute = async ({
  locale,
}: CmsPublicHomeRouteOptions = {}): Promise<JSX.Element> => {
  await connection();

  const resolvedLocale = resolveRouteLocale(locale);
  const { withTiming, flush } = createHomeTimingRecorder();
  let headers: RequestHeaders | null | undefined = null;
  let content: JSX.Element;

  try {
    const zoningEnabled = await isDomainZoningEnabled();
    headers = zoningEnabled ? await withTiming('headers', readOptionalRequestHeaders) : null;
    const domain = await withTiming('cmsDomain', () => resolveHomeDomainWithRecovery(headers));
    const slugs = await withTiming('cmsSlugs', () =>
      getHomeSlugsForDomainCached({ domainId: domain.id, locale: resolvedLocale })
    );

    content = await withTiming('homeContent', () =>
      HomeContent({ domainId: domain.id, slugs, withTiming, locale: resolvedLocale })
    );
  } catch (error) {
    if (!isTransientMongoConnectionError(error)) throw error;

    const fallbackDomain = buildFallbackHomeDomain(headers);
    content = await withTiming('homeContentTransientFallback', () =>
      HomeContent({
        domainId: fallbackDomain.id,
        slugs: [],
        withTiming,
        locale: resolvedLocale,
      })
    );
  }

  await flush();
  return renderCmsPublicHomePage(content);
};
