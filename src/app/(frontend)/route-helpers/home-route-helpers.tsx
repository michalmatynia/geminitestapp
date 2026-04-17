import { redirect } from 'next/navigation';
import { type JSX } from 'react';

import type { CmsDomain, Slug } from '@/shared/contracts/cms';
import { getCmsRepository, getSlugsForDomain, isDomainZoningEnabled, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { getKangurPublicLaunchHref } from '@/features/kangur/public';
import { getKangurConfiguredLaunchRoute } from '@/features/kangur/server/launch-route';
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';
import { buildLocalizedPathname, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { readOptionalRequestHeaders } from '@/shared/lib/request/optional-headers';

import { HomeContent } from '../home/HomeContent';
import { resolveFrontPageSelection } from '../home/home-helpers';
import { createHomeTimingRecorder } from '../home/home-timing';

type RenderHomeRouteOptions = {
  locale?: string | null;
};

type RequestHeaders = 
  | Headers 
  | { get: (key: string) => string | null }
  | Record<string, unknown>;

const localizePublicPath = (pathname: string, locale?: string): string => {
  if (typeof locale !== 'string' || locale === '' || pathname.startsWith('/admin')) {
    return pathname;
  }

  return buildLocalizedPathname(pathname, locale);
};

const resolveHomeLocale = (locale?: string | null): string | undefined =>
  typeof locale === 'string' ? normalizeSiteLocale(locale) : undefined;

function getHostFromHeadersObject(headers: { get: (key: string) => string | null }): string | undefined {
  return headers.get('x-forwarded-host') ?? headers.get('host') ?? undefined;
}

function getHostFromPlainObject(headers: Record<string, unknown>): string | undefined {
  if (Array.isArray(headers)) return undefined;
  const val = headers['x-forwarded-host'] ?? headers['X-Forwarded-Host'] ?? headers['host'] ?? headers['Host'];
  return typeof val === 'string' ? val : undefined;
}

function getHostFromHeaders(headers: RequestHeaders | null | undefined): string | undefined {
  if (headers === null || headers === undefined) return undefined;
  if (typeof (headers as { get?: unknown }).get === 'function') {
    return getHostFromHeadersObject(headers as { get: (key: string) => string | null });
  }
  if (typeof headers === 'object') {
    return getHostFromPlainObject(headers as Record<string, unknown>);
  }
  return undefined;
}

function parseHost(rawHost: string): string {
  try {
    return new URL(`http://${rawHost}`).hostname.toLowerCase();
  } catch {
    return rawHost.toLowerCase();
  }
}

function resolveRawHost(forwardedHost: string | undefined): string {
  if (typeof forwardedHost !== 'string' || forwardedHost.trim().length === 0) return '';
  return forwardedHost.split(',')[0]?.trim() ?? '';
}

function getAppHostname(): string {
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? process.env['NEXTAUTH_URL'] ?? 'http://localhost';
  try {
    return new URL(appUrl).hostname.toLowerCase();
  } catch {
    return 'localhost';
  }
}

const getFallbackHomeHost = (
  headers: RequestHeaders | null | undefined
): string => {
  const rawHost = resolveRawHost(getHostFromHeaders(headers));
  if (rawHost !== '') return parseHost(rawHost);
  return getAppHostname();
};

const buildFallbackHomeDomain = (
  headers: RequestHeaders | null | undefined
): CmsDomain => {
  const now = new Date().toISOString();
  const host = getFallbackHomeHost(headers);

  return {
    id: 'default-domain',
    name: 'Default domain',
    domain: host,
    createdAt: now,
    updatedAt: now,
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
    const slugsLocale = typeof locale === 'string' && locale !== '' ? { locale } : undefined;
    return await getSlugsForDomain(domainId, cmsRepository, slugsLocale);
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

async function handleFrontPageRedirects(
  selection: Awaited<ReturnType<typeof resolveFrontPageSelection>>,
  resolvedLocale: string | undefined,
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>,
  flush: () => Promise<void>
): Promise<void> {
  if (!selection.enabled) return;

  const redirectPath = selection.redirectPath;
  if (typeof redirectPath === 'string' && redirectPath !== '') {
    await flush();
    redirect(localizePublicPath(redirectPath, resolvedLocale));
  }

  if (selection.publicOwner === 'kangur') {
    const route = await withTiming('kangurLaunchRoute', getKangurConfiguredLaunchRoute);
    await flush();
    redirect(localizePublicPath(getKangurPublicLaunchHref(route), resolvedLocale));
  }
}

export const renderHomeRoute = async ({
  locale,
}: RenderHomeRouteOptions = {}): Promise<JSX.Element | null> => {
  const resolvedLocale = resolveHomeLocale(locale);
  const { withTiming, flush } = createHomeTimingRecorder();

  const frontPageSelection = await withTiming('frontPageSelection', resolveFrontPageSelection);
  await handleFrontPageRedirects(frontPageSelection, resolvedLocale, withTiming, flush);

  let hdrs: RequestHeaders | null | undefined = null;
  let content: JSX.Element;

  try {
    const zoningEnabled = await isDomainZoningEnabled();
    hdrs = zoningEnabled ? await withTiming('headers', readOptionalRequestHeaders) : null;
    const domain = await withTiming('cmsDomain', () => resolveHomeDomainWithRecovery(hdrs));
    const slugs = await withTiming('cmsSlugs', () => getHomeSlugsForDomainCached({ domainId: domain.id, locale: resolvedLocale }));

    content = await withTiming('homeContent', () => HomeContent({ domainId: domain.id, slugs, withTiming, locale: resolvedLocale }));
  } catch (error) {
    if (!isTransientMongoConnectionError(error)) throw error;

    const fallbackDomain = buildFallbackHomeDomain(hdrs);
    content = await withTiming('homeContentTransientFallback', () => HomeContent({ domainId: fallbackDomain.id, slugs: [], withTiming, locale: resolvedLocale }));
  }

  await flush();
  return content;
};
