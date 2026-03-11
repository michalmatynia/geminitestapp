import { auth } from '@/features/auth/auth';
import { CmsPageShell } from '@/features/cms/components/frontend/CmsPageShell';
import { getCmsMenuSettings } from '@/features/cms/server';
import { getCmsRepository } from '@/features/cms/server';
import { getCmsThemeSettings } from '@/features/cms/server';
import { productService } from '@/features/products/server';
import type { Page, Slug } from '@/shared/contracts/cms';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';

import { HomeCmsDefaultContent } from './home-cms-default-content';
import { HomeFallbackContent } from './home-fallback-content';
import { canPreviewDrafts } from './home-helpers';
import { normalizeHomeProducts } from './home-product-normalize';

type HomeContentProps = {
  domainId: string;
  slugs: Slug[];
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
};

export async function HomeContent({
  domainId,
  slugs,
  withTiming,
}: HomeContentProps): Promise<React.JSX.Element> {
  const [cmsRepository, themeSettings, menuSettings] = await Promise.all([
    withTiming('cmsRepository', getCmsRepository),
    withTiming('cmsTheme', () => getCmsThemeSettings()),
    withTiming('cmsMenu', () => getCmsMenuSettings(domainId)),
  ]);

  const defaultSlug = slugs.find((s: Slug) => !!s.isDefault);
  const colorSchemes = buildColorSchemeMap(themeSettings);

  if (defaultSlug) {
    const cmsPage: Page | null = await withTiming('cmsPageBySlug', () =>
      cmsRepository.getPageBySlug(defaultSlug.slug)
    );
    let allowDrafts = false;
    if (cmsPage && cmsPage.status !== 'published') {
      const session = await withTiming('auth', () => auth());
      allowDrafts = await withTiming('canPreviewDrafts', () => canPreviewDrafts(session));
    }

    const hasCmsContent = Boolean(
      cmsPage && (allowDrafts || cmsPage.status === 'published') && cmsPage.components.length > 0
    );

    const rendererComponents = [...(cmsPage?.components ?? [])].sort(
      (left, right) => left.order - right.order
    );

    const showMenu = cmsPage?.showMenu !== false;

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

  const hasDatabase = typeof process.env['MONGODB_URI'] === 'string';

  const productsRaw = hasDatabase
    ? await withTiming('products', () => productService.getProducts({ page: 1, pageSize: 20 }))
    : null;
  const products = productsRaw ? normalizeHomeProducts(productsRaw) : [];

  const showFallbackHeader = !menuSettings.showMenu;

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
        appearanceTone={{
          background: themeSettings.backgroundColor,
          text: themeSettings.textColor,
          border: themeSettings.borderColor,
          accent: themeSettings.accentColor || themeSettings.primaryColor || themeSettings.textColor,
        }}
      />
    </CmsPageShell>
  );
}
