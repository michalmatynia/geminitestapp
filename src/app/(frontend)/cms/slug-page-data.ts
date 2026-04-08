import { getUserPreferences } from '@/features/auth/server';
import {
  getMediaInlineStyles,
  getMediaStyleVars,
} from '@/features/cms/public';
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
  if (!userId) return false;
  try {
    const prefs = await getUserPreferences(userId);
    return prefs.cmsPreviewEnabled === true;
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'frontend.slug-page-data',
      source: 'frontend.slug-page-data',
      action: 'canPreviewDrafts',
      userId,
    });
    return false;
  }
};

export async function resolveSlugToPage(
  slugSegments: string[],
  options?: SlugResolutionOptions
): Promise<Page | null> {
  const slugValue = slugSegments.join('/');
  try {
    const cmsRepository = await getCmsRepository();
    const domainId = options?.domainId ?? (await resolveCmsDomainFromHeaders(await readOptionalRequestHeaders())).id;
    const domainSlug = await getSlugForDomainByValue(domainId, slugValue, cmsRepository, {
      locale: options?.locale,
    });
    if (!domainSlug) return null;
    const page = await cmsRepository.getPageBySlug(slugValue, { locale: options?.locale });
    if (!page) return null;
    if (page.status === 'published') return page;
    const session = await readOptionalServerAuthSession();
    const allowDrafts = await canPreviewDrafts(session);
    if (!allowDrafts) return null;
    return page;
  } catch (error) {
    void ErrorSystem.captureException(error, {
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
  if (!domainSlug) {
    return null;
  }

  const page = await cmsRepository.getPageBySlug(slugValue, { locale: options?.locale });
  if (!page || page.status !== 'published') {
    return null;
  }

  return page;
}

export const buildSlugMetadata = (page: Page): Metadata => {
  const metadata: Metadata = {
    title: page.seoTitle || page.name,
    robots: page.robotsMeta || 'index,follow',
  };

  if (page.seoDescription) {
    metadata.description = page.seoDescription;
  }

  if (page.seoOgImage) {
    metadata.openGraph = {
      images: [{ url: page.seoOgImage }],
    };
  }

  if (page.seoCanonical) {
    metadata.alternates = {
      canonical: page.seoCanonical,
    };
  }

  return metadata;
};

export const loadSlugRenderData = async (
  page: Page,
  options?: SlugResolutionOptions
): Promise<SlugRenderData> => {
  const domainId =
    options?.domainId ?? (await resolveCmsDomainFromHeaders(await readOptionalRequestHeaders())).id;
  return buildSlugRenderDataForDomain(page, domainId, options?.locale ?? page.locale ?? undefined);
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
  if (!page || page.status !== 'published') {
    return null;
  }

  return buildSlugRenderDataForDomain(page, domainId, options?.locale ?? page.locale ?? undefined);
};

const buildSlugRenderDataForDomain = async (
  page: Page,
  domainId: string,
  locale?: string
): Promise<SlugRenderData> => {
  let theme: CmsTheme | null = null;
  if (page.themeId) {
    const cmsRepository = await getCmsRepository();
    theme = await cmsRepository.getThemeById(page.themeId);
  }

  const themeSettings = await getCmsThemeSettings();
  const menuSettings = await getCmsMenuSettings(
    domainId,
    locale
  );
  const colorSchemes = buildColorSchemeMap(themeSettings);
  const layout = { fullWidth: Boolean(themeSettings.fullWidth) };
  const mediaVars = getMediaStyleVars(themeSettings);
  const mediaStyles = getMediaInlineStyles(themeSettings);
  const hoverEffect = themeSettings.enableAnimations ? themeSettings.hoverEffect : undefined;
  const hoverScale = themeSettings.enableAnimations ? themeSettings.hoverScale : undefined;
  const showMenu = page.showMenu !== false;
  const rendererComponents = [...page.components]
    .sort((left, right) => left.order - right.order)
    .map((component, index) => normalizeRendererComponent(page.id, component, index));

  return {
    theme,
    menuSettings,
    themeSettings,
    colorSchemes,
    showMenu,
    rendererComponents,
    layout,
    mediaVars,
    mediaStyles,
    hoverEffect,
    hoverScale,
  };
};
