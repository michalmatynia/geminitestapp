import { headers } from 'next/headers';

import { auth } from '@/features/auth/auth';
import { getUserPreferences } from '@/features/auth/server';
import { getMediaInlineStyles, getMediaStyleVars } from '@/features/cms/components/frontend/theme-styles';
import { getSlugForDomainByValue, resolveCmsDomainFromHeaders } from '@/features/cms/services/cms-domain';
import { getCmsMenuSettings } from '@/features/cms/services/cms-menu-settings';
import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { getCmsThemeSettings } from '@/features/cms/services/cms-theme-settings';
import type { CmsTheme, Page, PageComponent } from '@/shared/contracts/cms';
import { buildColorSchemeMap } from '@/shared/contracts/cms/theme-settings';

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

const isAdminSession = (session: Session | null): boolean => {
  if (!session?.user) return false;
  const user = session.user as Session['user'] & { isElevated?: boolean; role?: string | null };
  if (user.isElevated) return true;
  const role = user.role ?? '';
  return ['admin', 'super_admin', 'superuser'].includes(role);
};

const canPreviewDrafts = async (
  session: Session | null
): Promise<boolean> => {
  if (!isAdminSession(session)) return false;
  const userId = session?.user?.id;
  if (!userId) return false;
  try {
    const prefs = await getUserPreferences(userId);
    return prefs.cmsPreviewEnabled === true;
  } catch {
    return false;
  }
};

export async function resolveSlugToPage(slugSegments: string[]): Promise<Page | null> {
  try {
    const slugValue = slugSegments.join('/');
    const cmsRepository = await getCmsRepository();
    const hdrs = await headers();
    const domain = await resolveCmsDomainFromHeaders(hdrs);
    const domainSlug = await getSlugForDomainByValue(domain.id, slugValue, cmsRepository);
    if (!domainSlug) return null;
    const page = await cmsRepository.getPageBySlug(slugValue);
    if (!page) return null;
    if (page.status === 'published') return page;
    const session = await auth();
    const allowDrafts = await canPreviewDrafts(session);
    if (!allowDrafts) return null;
    return page;
  } catch {
    return null;
  }
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

export const loadSlugRenderData = async (page: Page): Promise<SlugRenderData> => {
  let theme: CmsTheme | null = null;
  if (page.themeId) {
    const cmsRepository = await getCmsRepository();
    theme = await cmsRepository.getThemeById(page.themeId);
  }

  const hdrs = await headers();
  const domain = await resolveCmsDomainFromHeaders(hdrs);
  const themeSettings = await getCmsThemeSettings();
  const menuSettings = await getCmsMenuSettings(domain.id);
  const colorSchemes = buildColorSchemeMap(themeSettings);
  const layout = { fullWidth: Boolean(themeSettings.fullWidth) };
  const mediaVars = getMediaStyleVars(themeSettings);
  const mediaStyles = getMediaInlineStyles(themeSettings);
  const hoverEffect = themeSettings.enableAnimations ? themeSettings.hoverEffect : undefined;
  const hoverScale = themeSettings.enableAnimations ? themeSettings.hoverScale : undefined;
  const showMenu = page.showMenu !== false;
  const rendererComponents: PageComponent[] = (page.components ?? []).map((component) => ({
    id: component.id ?? `component-${Math.random().toString(36).slice(2, 9)}`,
    type: component.type,
    order: component.order || 0,
    content: (component.content as Record<string, unknown>) ?? {},
    pageId: page.id,
  }));

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
