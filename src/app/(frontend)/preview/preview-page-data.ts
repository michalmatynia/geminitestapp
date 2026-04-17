import {
  getMediaInlineStyles,
  getMediaStyleVars,
} from '@/features/cms/public';
import { resolveCmsDomainFromHeaders } from '@/features/cms/server';
import { getCmsMenuSettings } from '@/features/cms/server';
import { getCmsRepository } from '@/features/cms/server';
import { getCmsThemeSettings } from '@/features/cms/server';
import type { CmsTheme, Page, PageComponent } from '@/shared/contracts/cms';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';
import { isElevatedSession } from '@/shared/lib/auth/elevated-session-user';
import { readOptionalRequestHeaders } from '@/shared/lib/request/optional-headers';

import type { SlugRenderData as PreviewRenderData } from '../cms/slug-page-data';

export type { PreviewRenderData };

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

export const isAdminSession = isElevatedSession;

export const loadPreviewRenderData = async (id: string): Promise<PreviewRenderData | null> => {
  const cmsRepository = await getCmsRepository();
  const page = await cmsRepository.getPageById(id);
  if (page === null) {
    return null;
  }

  let theme: CmsTheme | null = null;
  const themeId = page.themeId;
  if (typeof themeId === 'string' && themeId !== '') {
    theme = await cmsRepository.getThemeById(themeId);
  }

  const hdrs = await readOptionalRequestHeaders();
  const domain = await resolveCmsDomainFromHeaders(hdrs);
  const themeSettings = await getCmsThemeSettings();
  const menuSettings = await getCmsMenuSettings(domain.id, page.locale);
  const colorSchemes = buildColorSchemeMap(themeSettings);
  const layout = { fullWidth: themeSettings.fullWidth === true };
  const mediaVars = getMediaStyleVars(themeSettings);
  const mediaStyles = getMediaInlineStyles(themeSettings);
  const animationsEnabled = themeSettings.enableAnimations === true;
  const hoverEffect = animationsEnabled ? themeSettings.hoverEffect : undefined;
  const hoverScale = animationsEnabled ? themeSettings.hoverScale : undefined;
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
