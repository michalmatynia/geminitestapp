import { getCmsMenuSettings } from '@/features/cms/server';
import { getCmsRepository } from '@/features/cms/server';
import { getCmsThemeSettings } from '@/features/cms/server';
import { productService } from '@/shared/lib/products/services/productService';
import type { Slug } from '@/shared/contracts/cms';
import { readOptionalServerAuthSession } from '@/features/auth/server';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { applyCacheLife } from '@/shared/lib/next/cache-life';

import { canPreviewDrafts } from './home-helpers';
import { normalizeHomeProducts } from './home-product-normalize';
import { HomeContentClient } from '@/features/cms/public';

type HomeContentProps = {
  domainId: string;
  slugs: Slug[];
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
  locale?: string;
};

type HomeContentClientProps = React.ComponentProps<typeof HomeContentClient>;
type CmsHomeContentClientProps = Extract<HomeContentClientProps, { variant: 'cms' }>;
type FallbackHomeContentClientProps = Extract<HomeContentClientProps, { variant: 'fallback' }>;

const buildCmsHomeClientProps = ({
  defaultSlug,
  menuSettings,
  themeSettings,
  showMenu,
  rendererComponents,
  hasCmsContent,
}: {
  defaultSlug: string;
  menuSettings: Awaited<ReturnType<typeof getCmsMenuSettings>>;
  themeSettings: Awaited<ReturnType<typeof getCmsThemeSettings>>;
  showMenu: boolean;
  rendererComponents: CmsHomeContentClientProps['rendererComponents'];
  hasCmsContent: boolean;
}): CmsHomeContentClientProps => ({
  variant: 'cms',
  menu: menuSettings,
  theme: themeSettings,
  colorSchemes: buildColorSchemeMap(themeSettings),
  showMenu,
  hasCmsContent,
  defaultSlug,
  rendererComponents,
});

const buildFallbackHomeClientProps = ({
  menuSettings,
  themeSettings,
  products,
}: {
  menuSettings: Awaited<ReturnType<typeof getCmsMenuSettings>>;
  themeSettings: Awaited<ReturnType<typeof getCmsThemeSettings>>;
  products: ReturnType<typeof normalizeHomeProducts>;
}): FallbackHomeContentClientProps => ({
  variant: 'fallback',
  menu: menuSettings,
  theme: themeSettings,
  colorSchemes: buildColorSchemeMap(themeSettings),
  showMenu: Boolean(menuSettings.showMenu),
  showFallbackHeader: !menuSettings.showMenu,
  products,
  appearanceTone: {
    background: themeSettings.backgroundColor,
    text: themeSettings.textColor,
    border: themeSettings.borderColor,
    accent: themeSettings.accentColor || themeSettings.primaryColor || themeSettings.textColor,
  },
});

const getPublishedHomeCmsClientPropsCached = async ({
  domainId,
  defaultSlug,
  locale,
}: {
  domainId: string;
  defaultSlug: string;
  locale?: string;
}): Promise<HomeContentClientProps | null> => {
  'use cache';
  applyCacheLife('swr300');

  const [cmsRepository, themeSettings, menuSettings] = await Promise.all([
    getCmsRepository(),
    getCmsThemeSettings(),
    getCmsMenuSettings(domainId, locale),
  ]);
  const cmsPage = await cmsRepository.getPageBySlug(defaultSlug, { locale });
  if (!cmsPage || cmsPage.status !== 'published') {
    return null;
  }

  return buildCmsHomeClientProps({
    defaultSlug,
    menuSettings,
    themeSettings,
    showMenu: cmsPage.showMenu !== false,
    hasCmsContent: cmsPage.components.length > 0,
    rendererComponents: [...cmsPage.components].sort((left, right) => left.order - right.order),
  });
};

const getFallbackHomeClientPropsCached = async ({
  domainId,
  locale,
}: {
  domainId: string;
  locale?: string;
}): Promise<HomeContentClientProps> => {
  'use cache';
  applyCacheLife('swr300');

  const [themeSettings, menuSettings] = await Promise.all([
    getCmsThemeSettings(),
    getCmsMenuSettings(domainId, locale),
  ]);
  const hasDatabase = typeof process.env['MONGODB_URI'] === 'string';
  const productsRaw = hasDatabase
    ? await productService.getProducts({ page: 1, pageSize: 20 })
    : null;

  return buildFallbackHomeClientProps({
    menuSettings,
    themeSettings,
    products: productsRaw ? normalizeHomeProducts(productsRaw) : [],
  });
};

export async function HomeContent({
  domainId,
  slugs,
  withTiming,
  locale,
}: HomeContentProps): Promise<React.JSX.Element> {
  const resolvedLocale = normalizeSiteLocale(locale);

  const defaultSlug = slugs.find((s: Slug) => !!s.isDefault);

  if (defaultSlug) {
    const publishedHomeProps = await withTiming('publishedHomeCmsData', () =>
      getPublishedHomeCmsClientPropsCached({
        domainId,
        defaultSlug: defaultSlug.slug,
        locale: resolvedLocale,
      })
    );
    if (publishedHomeProps) {
      return <HomeContentClient {...publishedHomeProps} />;
    }

    const [cmsRepository, themeSettings, menuSettings] = await Promise.all([
      withTiming('cmsRepository', getCmsRepository),
      withTiming('cmsTheme', () => getCmsThemeSettings()),
      withTiming('cmsMenu', () => getCmsMenuSettings(domainId, resolvedLocale)),
    ]);
    const cmsPage = await withTiming('cmsPageBySlug', () =>
      cmsRepository.getPageBySlug(defaultSlug.slug, { locale: resolvedLocale })
    );
    let allowDrafts = false;

    if (cmsPage && cmsPage.status !== 'published') {
      const session = await withTiming('auth', readOptionalServerAuthSession);
      allowDrafts = await withTiming('canPreviewDrafts', () => canPreviewDrafts(session));
    }

    return (
      <HomeContentClient
        {...buildCmsHomeClientProps({
          defaultSlug: defaultSlug.slug,
          menuSettings,
          themeSettings,
          showMenu: cmsPage?.showMenu !== false,
          hasCmsContent: Boolean(
            cmsPage && (allowDrafts || cmsPage.status === 'published') && cmsPage.components.length > 0
          ),
          rendererComponents: [...(cmsPage?.components ?? [])].sort(
            (left, right) => left.order - right.order
          ),
        })}
      />
    );
  }

  const fallbackHomeProps = await withTiming('fallbackHomeData', () =>
    getFallbackHomeClientPropsCached({
      domainId,
      locale: resolvedLocale,
    })
  );

  return <HomeContentClient {...fallbackHomeProps} />;
}
