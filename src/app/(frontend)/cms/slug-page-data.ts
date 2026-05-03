import { getUserPreferences } from '@/features/auth/server';
import {
  getMediaInlineStyles,
  getMediaStyleVars,
} from '@/features/cms/components/frontend/theme-styles';
import { getSlugForDomainByValue, resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { getCmsMenuSettings } from '@/features/cms/server';
import { getCmsRepository } from '@/features/cms/server';
import { getCmsThemeSettings } from '@/features/cms/server';
import type { CmsTheme, Page, PageComponent } from '@/shared/contracts/cms';
import { readOptionalServerAuthSession } from '@/features/auth/server';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';
import { isElevatedSession } from '@/shared/lib/auth/elevated-session-user';
import { readOptionalRequestHeaders } from '@/shared/lib/request/optional-headers';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { Metadata } from 'next';
import type { Session } from 'next-auth';


export type SlugRenderData = {
  theme: CmsTheme | null;
  menuSettings: Awaited<ReturnType<typeof getCmsMenuSettings>>;
  themeSettings: Awaited<ReturnType<typeof getCmsThemeSettings>>;
  colorSchemes: ReturnType<typeof buildColorSchemeMap>;
  showMenu: boolean;
  rendererComponents: PageComponent[];
  layout: { fullWidth: boolean };
  mediaVars: ReturnType<typeof getMediaStyleVars>;
  mediaStyles: ReturnType<typeof getMediaInlineStyles>;
  hoverEffect: Awaited<ReturnType<typeof getCmsThemeSettings>>['hoverEffect'] | undefined;
  hoverScale: Awaited<ReturnType<typeof getCmsThemeSettings>>['hoverScale'] | undefined;
};

type SlugResolutionOptions = {
  locale?: string;
  domainId?: string;
};

const normalizeRendererComponent = (
  pageId: string,
  component: Page['components'][number],
  index: number
): PageComponent => ({
  id: `${pageId}:component:${index}`,
  type: component.type,
  order: component.order,
  content: component.content,
  pageId,
});

const isAdminSession = isElevatedSession;

const canPreviewDrafts = async (session: Session | null): Promise<boolean> => {
  if (!isAdminSession(session)) return false;
  const userId = session?.user?.id;
  if (typeof userId !== 'string' || userId === '') return false;
  try {
    const prefs = await getUserPreferences(userId);
    return prefs.cmsPreviewEnabled === true;
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'frontend.slug-page-data',
      source: 'frontend.slug-page-data',
      action: 'canPreviewDrafts',
      userId,
    });
    return false;
  }
};

async function resolveDomainIdFromOptionsOrHeaders(options?: SlugResolutionOptions): Promise<string> {
  const domainId = options?.domainId;
  if (typeof domainId === 'string' && domainId !== '') {
    return domainId;
  }
  return (await resolveCmsDomainFromHeaders(await readOptionalRequestHeaders())).id;
}

async function resolveDraftPermission(page: Page): Promise<Page | null> {
  if (page.status === 'published') return page;

  const session = await readOptionalServerAuthSession();
  const allowDrafts = await canPreviewDrafts(session);
  return allowDrafts ? page : null;
}

export async function resolveSlugToPage(
  slugSegments: string[],
  options?: SlugResolutionOptions
): Promise<Page | null> {
  const slugValue = slugSegments.join('/');
  try {
    const cmsRepository = await getCmsRepository();
    const domainId = await resolveDomainIdFromOptionsOrHeaders(options);
    const domainSlug = await getSlugForDomainByValue(domainId, slugValue, cmsRepository, {
      locale: options?.locale,
    });
    if (domainSlug === null) return null;
    const page = await cmsRepository.getPageBySlug(slugValue, { locale: options?.locale });
    if (page === null) return null;

    return await resolveDraftPermission(page);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'frontend.slug-page-data',
      source: 'frontend.slug-page-data',
      action: 'resolveSlugToPage',
      slug: slugValue,
      locale: options?.locale ?? null,
    });
    return null;
  }
}

export async function resolvePublishedSlugToPageCached(
  domainId: string,
  slugSegments: string[],
  options?: Pick<SlugResolutionOptions, 'locale'>
): Promise<Page | null> {
  'use cache';
  applyCacheLife('hours');

  const slugValue = slugSegments.join('/');
  const cmsRepository = await getCmsRepository();
  const domainSlug = await getSlugForDomainByValue(domainId, slugValue, cmsRepository, {
    locale: options?.locale,
  });
  if (domainSlug === null) {
    return null;
  }

  const page = await cmsRepository.getPageBySlug(slugValue, { locale: options?.locale });
  if (page?.status !== 'published') {
    return null;
  }

  return page;
}

function getNonEmptyString(value: string | null | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

export const buildSlugMetadata = (page: Page): Metadata => {
  const metadata: Metadata = {
    title: getNonEmptyString(page.seoTitle) ?? page.name,
    robots: getNonEmptyString(page.robotsMeta) ?? 'index,follow',
  };

  const description = getNonEmptyString(page.seoDescription);
  if (description !== null) {
    metadata.description = description;
  }

  const ogImage = getNonEmptyString(page.seoOgImage);
  if (ogImage !== null) {
    metadata.openGraph = {
      images: [{ url: ogImage }],
    };
  }

  const canonical = getNonEmptyString(page.seoCanonical);
  if (canonical !== null) {
    metadata.alternates = {
      canonical,
    };
  }

  return metadata;
};

export const loadSlugRenderData = async (
  page: Page,
  options?: SlugResolutionOptions
): Promise<SlugRenderData> => {
  const domainId = await resolveDomainIdFromOptionsOrHeaders(options);
  const locale = options?.locale ?? page.locale;
  return buildSlugRenderDataForDomain(page, domainId, locale);
};

export const loadPublishedSlugRenderDataCached = async (
  pageId: string,
  domainId: string,
  options?: Pick<SlugResolutionOptions, 'locale'>
): Promise<SlugRenderData | null> => {
  'use cache';
  applyCacheLife('hours');

  const cmsRepository = await getCmsRepository();
  const page = await cmsRepository.getPageById(pageId);
  if (page?.status !== 'published') {
    return null;
  }

  const locale = options?.locale ?? page.locale;
  return buildSlugRenderDataForDomain(page, domainId, locale);
};

async function resolveTheme(themeId: string | null | undefined): Promise<CmsTheme | null> {
  const id = getNonEmptyString(themeId);
  if (id === null) {
    return null;
  }
  const cmsRepository = await getCmsRepository();
  return cmsRepository.getThemeById(id);
}

function resolveRendererComponents(page: Page): PageComponent[] {
  return [...page.components]
    .sort((left, right) => left.order - right.order)
    .map((component, index) => normalizeRendererComponent(page.id, component, index));
}

function buildSlugRenderData(
  page: Page,
  theme: CmsTheme | null,
  themeSettings: Awaited<ReturnType<typeof getCmsThemeSettings>>,
  menuSettings: Awaited<ReturnType<typeof getCmsMenuSettings>>
): SlugRenderData {
  const animationsEnabled = themeSettings.enableAnimations === true;
  const hoverEffect = animationsEnabled ? themeSettings.hoverEffect : undefined;
  const hoverScale = animationsEnabled ? themeSettings.hoverScale : undefined;

  return {
    theme,
    menuSettings,
    themeSettings,
    colorSchemes: buildColorSchemeMap(themeSettings),
    showMenu: page.showMenu !== false,
    rendererComponents: resolveRendererComponents(page),
    layout: { fullWidth: themeSettings.fullWidth === true },
    mediaVars: getMediaStyleVars(themeSettings),
    mediaStyles: getMediaInlineStyles(themeSettings),
    hoverEffect,
    hoverScale,
  };
}

const buildSlugRenderDataForDomain = async (
  page: Page,
  domainId: string,
  locale?: string
): Promise<SlugRenderData> => {
  const theme = await resolveTheme(page.themeId);
  const themeSettings = await getCmsThemeSettings();
  const menuSettings = await getCmsMenuSettings(domainId, locale);

  return buildSlugRenderData(page, theme, themeSettings, menuSettings);
};
