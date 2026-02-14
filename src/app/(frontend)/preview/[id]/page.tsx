import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { JSX } from 'react';

import { auth } from '@/features/auth/auth';
import { CmsPageRenderer } from '@/features/cms/components/frontend/CmsPageRenderer';
import { CmsPageShell } from '@/features/cms/components/frontend/CmsPageShell';
import { getMediaInlineStyles, getMediaStyleVars } from '@/features/cms/components/frontend/theme-styles';
import { ThemeProvider } from '@/features/cms/components/frontend/ThemeProvider';
import { resolveCmsDomainFromHeaders } from '@/features/cms/services/cms-domain';
import { getCmsMenuSettings } from '@/features/cms/services/cms-menu-settings';
import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { getCmsThemeSettings } from '@/features/cms/services/cms-theme-settings';
import type { CmsTheme, PageComponent } from '@/features/cms/types';
import { buildColorSchemeMap } from '@/features/cms/types/theme-settings';

import type { Metadata } from 'next';
import type { Session } from 'next-auth';

const isAdminSession = (session: Session | null): boolean => {
  if (!session?.user) return false;
  const user = session.user as Session['user'] & { isElevated?: boolean; role?: string | null };
  if (user.isElevated) return true;
  const role = user.role ?? '';
  return ['admin', 'super_admin', 'superuser'].includes(role);
};

export const dynamic = 'force-dynamic';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Preview ${id}`,
    robots: 'noindex,nofollow',
  };
}

export default async function CmsPreviewPage({ params }: PreviewPageProps): Promise<JSX.Element> {
  const session = await auth();
  if (!isAdminSession(session)) {
    notFound();
  }

  const { id } = await params;
  const cmsRepository = await getCmsRepository();
  const page = await cmsRepository.getPageById(id);
  if (!page) {
    notFound();
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
  const layout = { fullWidth: themeSettings.fullWidth };
  const mediaVars = getMediaStyleVars(themeSettings);
  const mediaStyles = getMediaInlineStyles(themeSettings);
  const hoverEffect = themeSettings.enableAnimations ? themeSettings.hoverEffect : undefined;
  const hoverScale = themeSettings.enableAnimations ? themeSettings.hoverScale : undefined;
  const showMenu = page.showMenu !== false;
  const rendererComponents: PageComponent[] = (page.components ?? []).map((component) => ({
    type: component.type,
    order: component.order || 0,
    content: (component.content as Record<string, unknown>) ?? {},
  }));
  const content = (
    <CmsPageShell
      menu={menuSettings}
      theme={themeSettings}
      colorSchemes={colorSchemes}
      showMenu={showMenu}
    >
      <CmsPageRenderer
        components={rendererComponents}
        colorSchemes={colorSchemes}
        layout={layout}
        hoverEffect={hoverEffect}
        hoverScale={hoverScale}
        mediaVars={mediaVars}
        mediaStyles={mediaStyles}
      />
    </CmsPageShell>
  );

  return (
    <div className='min-h-screen bg-gray-950 text-white'>
      {theme ? <ThemeProvider theme={theme}>{content}</ThemeProvider> : content}
    </div>
  );
}
