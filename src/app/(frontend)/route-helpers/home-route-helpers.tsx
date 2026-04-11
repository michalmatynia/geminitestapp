import 'server-only';

import { redirect } from 'next/navigation';
import { JSX } from 'react';

import type { CmsDomain } from '@/shared/contracts/cms';
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

const localizePublicPath = (pathname: string, locale?: string): string => {
  if (!locale || pathname.startsWith('/admin')) {
    return pathname;
  }

  return buildLocalizedPathname(pathname, locale);
};

const resolveHomeLocale = (locale?: string | null): string | undefined =>
  typeof locale === 'string' ? normalizeSiteLocale(locale) : undefined;

const getFallbackHomeHost = (
  headers:
    | Headers
    | { get?: (key: string) => string | null }
    | Record<string, unknown>
    | null
    | undefined
): string => {
  const forwardedHost =
    typeof headers?.get === 'function'
      ? (headers.get('x-forwarded-host') ?? headers.get('host'))
      : (() => {
          if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) {
            return undefined;
          }

          const record = headers as Record<string, unknown>;
          return (
            record['x-forwarded-host'] ??
            record['X-Forwarded-Host'] ??
            record['host'] ??
            record['Host']
          );
        })();

  const rawHost =
    typeof forwardedHost === 'string' && forwardedHost.trim().length > 0
      ? forwardedHost.split(',')[0]?.trim() ?? ''
      : '';
  if (rawHost) {
    try {
      return new URL(`http://${rawHost}`).hostname.toLowerCase();
    } catch {
      return rawHost.toLowerCase();
    }
  }

  const appUrl =
    process.env['NEXT_PUBLIC_APP_URL'] ?? process.env['NEXTAUTH_URL'] ?? 'http://localhost';
  try {
    return new URL(appUrl).hostname.toLowerCase();
  } catch {
    return 'localhost';
  }
};

const buildFallbackHomeDomain = (
  headers:
    | Headers
    | { get?: (key: string) => string | null }
    | Record<string, unknown>
    | null
    | undefined
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
}) => {
  'use cache';
  applyCacheLife('swr300');

  try {
    const cmsRepository = await getCmsRepository();
    return await getSlugsForDomain(domainId, cmsRepository, locale ? { locale } : undefined);
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
      return [];
    }
    throw error;
  }
};

const resolveHomeDomainWithRecovery = async (
  headers:
    | Headers
    | { get?: (key: string) => string | null }
    | Record<string, unknown>
    | null
    | undefined
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

export const renderHomeRoute = async ({
  locale,
}: RenderHomeRouteOptions = {}): Promise<JSX.Element | null> => {
  const resolvedLocale = resolveHomeLocale(locale);
  const { withTiming, flush } = createHomeTimingRecorder();

  const frontPageSelection = await withTiming('frontPageSelection', resolveFrontPageSelection);
  const publicOwner = frontPageSelection.publicOwner;
  const redirectPath = frontPageSelection.redirectPath;
  const kangurLaunchRoute =
    frontPageSelection.enabled && publicOwner === 'kangur'
      ? await withTiming('kangurLaunchRoute', () => getKangurConfiguredLaunchRoute())
      : null;

  if (frontPageSelection.enabled && redirectPath) {
    await flush();
    redirect(localizePublicPath(redirectPath, resolvedLocale));
  }

  if (frontPageSelection.enabled && publicOwner === 'kangur') {
    await flush();
    redirect(localizePublicPath(getKangurPublicLaunchHref(kangurLaunchRoute ?? undefined), resolvedLocale));
  }

  let hdrs:
    | Headers
    | { get?: (key: string) => string | null }
    | Record<string, unknown>
    | null
    | undefined = null;

  let content: JSX.Element;

  try {
    const zoningEnabled = await isDomainZoningEnabled();
    hdrs = zoningEnabled ? await withTiming('headers', readOptionalRequestHeaders) : null;
    const domain = await withTiming('cmsDomain', () => resolveHomeDomainWithRecovery(hdrs));
    const slugs = await withTiming('cmsSlugs', () =>
      getHomeSlugsForDomainCached({
        domainId: domain.id,
        locale: resolvedLocale,
      })
    );

    content = await withTiming('homeContent', () =>
      HomeContent({
        domainId: domain.id,
        slugs,
        withTiming,
        locale: resolvedLocale,
      })
    );
  } catch (error) {
    if (!isTransientMongoConnectionError(error)) {
      throw error;
    }

    const fallbackDomain = buildFallbackHomeDomain(hdrs);
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
  return content;
};
