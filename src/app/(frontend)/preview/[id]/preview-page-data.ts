import { headers } from 'next/headers';

import {
  getMediaInlineStyles,
  getMediaStyleVars,
} from '@/features/cms/components/frontend/theme-styles';
import { resolveCmsDomainFromHeaders } from '@/features/cms/services/cms-domain';
import { getCmsMenuSettings } from '@/features/cms/services/cms-menu-settings';
import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { getCmsThemeSettings } from '@/features/cms/services/cms-theme-settings';
import type { CmsTheme, Page, PageComponent } from '@/shared/contracts/cms';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';

import type { Session } from 'next-auth';

export type PreviewRenderData = {
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

const normalizeRendererComponent = (
  pageId: string,
  component: Page['components'][number],
  index: number
): PageComponent => ({
  id: component.id ?? `${pageId}:component:${index}`,
  type: component.type,
  order: component.order,
  content: component.content,
  pageId: component.pageId ?? pageId,
  ...(component.createdAt ? { createdAt: component.createdAt } : {}),
  ...(component.updatedAt !== undefined ? { updatedAt: component.updatedAt } : {}),
});

export const isAdminSession = (session: Session | null): boolean => {
  if (!session?.user) return false;
  const user = session.user as Session['user'] & {
    isElevated?: boolean;
    role?: string | null;
  };
  if (user.isElevated) return true;
  const role = user.role ?? '';
  return ['admin', 'super_admin', 'superuser'].includes(role);
};

export const loadPreviewRenderData = async (id: string): Promise<PreviewRenderData | null> => {
  const cmsRepository = await getCmsRepository();
  const page = await cmsRepository.getPageById(id);
  if (!page) {
    return null;
  }

  let theme: CmsTheme | null = null;
  if (page.themeId) {
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
