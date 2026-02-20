import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { JSX } from 'react';

import { auth } from '@/features/auth/auth';
import { CmsPageShell } from '@/features/cms/components/frontend/CmsPageShell';
import { getSlugsForDomain, resolveCmsDomainFromHeaders } from '@/features/cms/services/cms-domain';
import { getCmsMenuSettings } from '@/features/cms/services/cms-menu-settings';
import { getCmsRepository } from '@/features/cms/services/cms-repository';
import { getCmsThemeSettings } from '@/features/cms/services/cms-theme-settings';
import { productService } from '@/features/products/server';
import type { Slug } from '@/shared/contracts/cms';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';

import { HomeCmsDefaultContent } from './home-cms-default-content';
import { HomeFallbackContent } from './home-fallback-content';
import {
  canPreviewDrafts,
  FRONT_PAGE_ALLOWED,
  getFrontPageSetting,
  shouldUseFrontPageAppRedirect,
} from './home-helpers';
import { normalizeHomeProducts } from './home-product-normalize';
import { createHomeTimingRecorder } from './home-timing';

export const revalidate = 3600; // Hourly revalidation for CMS home page content

export default async function Home(): Promise<JSX.Element> {
  const { withTiming, flush } = createHomeTimingRecorder();

  const frontPageRedirectEnabled = shouldUseFrontPageAppRedirect();
  const [cmsRepository, frontPageApp] = await Promise.all([
    withTiming('cmsRepository', getCmsRepository),
    frontPageRedirectEnabled
      ? withTiming('frontPageSetting', getFrontPageSetting)
      : Promise.resolve<string | null>(null),
  ]);

  if (frontPageRedirectEnabled && frontPageApp && FRONT_PAGE_ALLOWED.has(frontPageApp)) {
    if (frontPageApp === 'chatbot') {
      redirect('/admin/chatbot');
    }
    if (frontPageApp === 'notes') {
      redirect('/admin/notes');
    }
  }

  const hdrs = await withTiming('headers', () => headers());
  const domain = await withTiming('cmsDomain', () => resolveCmsDomainFromHeaders(hdrs));
  const [slugs, themeSettings, menuSettings] = await Promise.all([
    withTiming('cmsSlugs', () => getSlugsForDomain(domain.id, cmsRepository)),
    withTiming('cmsTheme', () => getCmsThemeSettings()),
    withTiming('cmsMenu', () => getCmsMenuSettings(domain.id)),
  ]);
  const defaultSlug = slugs.find((s: Slug) => !!s.isDefault);
  const colorSchemes = buildColorSchemeMap(themeSettings);

  if (defaultSlug) {
    // Try to load the published CMS page linked to this slug
    const cmsPage = await withTiming('cmsPageBySlug', () => cmsRepository.getPageBySlug(defaultSlug.slug));
    let allowDrafts = false;
    if (cmsPage && cmsPage.status !== 'published') {
      const session = await withTiming('auth', () => auth());
      allowDrafts = await withTiming('canPreviewDrafts', () => canPreviewDrafts(session));
    }
    const hasCmsContent = Boolean(
      cmsPage &&
      (allowDrafts || cmsPage.status === 'published') &&
      cmsPage.components.length > 0
    );
    const rendererComponents = (cmsPage?.components ?? []).map((component) => ({
      type: component.type,
      order: component.order || 0,
      content: (component.content as Record<string, unknown>) ?? {},
    }));

    const showMenu = cmsPage?.showMenu !== false;
    await flush();
    return (
      <CmsPageShell
        menu={menuSettings}
        theme={themeSettings}
        colorSchemes={colorSchemes}
        showMenu={showMenu}
      >
        <HomeCmsDefaultContent
          themeSettings={themeSettings}
          colorSchemes={colorSchemes}
          hasCmsContent={hasCmsContent}
          defaultSlug={defaultSlug.slug}
          rendererComponents={rendererComponents}
        />
      </CmsPageShell>
    );
  }

  const productsRaw = await withTiming('products', () => productService.getProducts({ page: 1, pageSize: 20 }));
  const products = normalizeHomeProducts(productsRaw);

  const showFallbackHeader = !menuSettings.showMenu;
  await flush();
  return (
    <CmsPageShell
      menu={menuSettings}
      theme={themeSettings}
      colorSchemes={colorSchemes}
      showMenu={Boolean(menuSettings.showMenu)}
    >
      <HomeFallbackContent
        showFallbackHeader={showFallbackHeader}
        products={products}
        themeSettings={themeSettings}
      />
    </CmsPageShell>
  );
}
