import { getTranslations } from 'next-intl/server';

import { auth } from '@/features/auth/server';
import { getCmsMenuSettings } from '@/features/cms/server';
import { getCmsRepository } from '@/features/cms/server';
import { getCmsThemeSettings } from '@/features/cms/server';
import { productService } from '@/shared/lib/products/services/productService';
import type { Slug } from '@/shared/contracts/cms';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import { canPreviewDrafts } from './home-helpers';
import { normalizeHomeProducts } from './home-product-normalize';
import { HomeContentClient } from '@/features/cms/components/frontend/home/HomeContentClient';

type HomeContentProps = {
  domainId: string;
  slugs: Slug[];
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
  locale?: string;
};

export async function HomeContent({
  domainId,
  slugs,
  withTiming,
  locale,
}: HomeContentProps): Promise<React.JSX.Element> {
  const resolvedLocale = normalizeSiteLocale(locale);
  const [commonTranslations, cmsRepository, themeSettings, menuSettings] = await Promise.all([
    getTranslations({ locale: resolvedLocale, namespace: 'Common' }),
    withTiming('cmsRepository', getCmsRepository),
    withTiming('cmsTheme', () => getCmsThemeSettings()),
    withTiming('cmsMenu', () => getCmsMenuSettings(domainId, resolvedLocale)),
  ]);

  const defaultSlug = slugs.find((s: Slug) => !!s.isDefault);
  const colorSchemes = buildColorSchemeMap(themeSettings);

  if (defaultSlug) {
    const [cmsPage, session] = await Promise.all([
      withTiming('cmsPageBySlug', () =>
        cmsRepository.getPageBySlug(defaultSlug.slug, { locale: resolvedLocale })
      ),
      withTiming('auth', () => auth()),
    ]);
    let allowDrafts = false;
    if (cmsPage && cmsPage.status !== 'published') {
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
      <HomeContentClient
        variant='cms'
        menu={menuSettings}
        theme={themeSettings}
        colorSchemes={colorSchemes}
        showMenu={showMenu}
        loadingLabel={commonTranslations('loadingStorefront')}
        hasCmsContent={hasCmsContent}
        defaultSlug={defaultSlug.slug}
        rendererComponents={rendererComponents}
      />
    );
  }

  const hasDatabase = typeof process.env['MONGODB_URI'] === 'string';

  const productsRaw = hasDatabase
    ? await withTiming('products', () => productService.getProducts({ page: 1, pageSize: 20 }))
    : null;
  const products = productsRaw ? normalizeHomeProducts(productsRaw) : [];

  const showFallbackHeader = !menuSettings.showMenu;

  return (
    <HomeContentClient
      variant='fallback'
      menu={menuSettings}
      theme={themeSettings}
      colorSchemes={colorSchemes}
      showMenu={Boolean(menuSettings.showMenu)}
      loadingLabel={commonTranslations('loadingStorefront')}
      showFallbackHeader={showFallbackHeader}
      products={products}
      appearanceTone={{
        background: themeSettings.backgroundColor,
        text: themeSettings.textColor,
        border: themeSettings.borderColor,
        accent: themeSettings.accentColor || themeSettings.primaryColor || themeSettings.textColor,
      }}
    />
  );
}
