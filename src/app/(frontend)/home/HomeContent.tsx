import { getCmsMenuSettings } from '@/features/cms/server';
import { getCmsRepository } from '@/features/cms/server';
import { getCmsThemeSettings } from '@/features/cms/server';
import { productService } from '@/shared/lib/products/services/productService';
import type { Page, Slug } from '@/shared/contracts/cms';
import { readOptionalServerAuthSession } from '@/features/auth/server';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';
import { isTransientMongoConnectionError } from '@/shared/lib/db/utils/mongo';
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

function getAccentColor(themeSettings: Awaited<ReturnType<typeof getCmsThemeSettings>>): string {
  const accent = themeSettings.accentColor;
  if (typeof accent === 'string' && accent !== '') return accent;
  const primary = themeSettings.primaryColor;
  if (typeof primary === 'string' && primary !== '') return primary;
  return themeSettings.textColor;
}

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
  showMenu: menuSettings.showMenu === true,
  showFallbackHeader: menuSettings.showMenu !== true,
  products,
  appearanceTone: {
    background: themeSettings.backgroundColor,
    text: themeSettings.textColor,
    border: themeSettings.borderColor,
    accent: getAccentColor(themeSettings),
  },
});

const readHomeCmsPageBySlugWithRecovery = async (
  defaultSlug: string,
  locale?: string
): Promise<Page | null> => {
  try {
    const cmsRepository = await getCmsRepository();
    return await cmsRepository.getPageBySlug(defaultSlug, { locale });
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
      return null;
    }
    throw error;
  }
};

const readHomeProductsWithRecovery = async (): Promise<
  Awaited<ReturnType<typeof productService.getProducts>> | null
> => {
  try {
    return await productService.getProducts({ page: 1, pageSize: 20 });
  } catch (error) {
    if (isTransientMongoConnectionError(error)) {
      return null;
    }
    throw error;
  }
};

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

  const [themeSettings, menuSettings] = await Promise.all([
    getCmsThemeSettings(),
    getCmsMenuSettings(domainId, locale),
  ]);
  const cmsPage = await readHomeCmsPageBySlugWithRecovery(defaultSlug, locale);
  if (cmsPage?.status !== 'published') {
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
  const productsRaw = hasDatabase ? await readHomeProductsWithRecovery() : null;

  return buildFallbackHomeClientProps({
    menuSettings,
    themeSettings,
    products: productsRaw ? normalizeHomeProducts(productsRaw) : [],
  });
};

async function resolveDraftSettings(
  cmsPage: Page | null,
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>
): Promise<boolean> {
  if (cmsPage !== null && cmsPage.status !== 'published') {
    const session = await withTiming('auth', readOptionalServerAuthSession);
    return await withTiming('canPreviewDrafts', () => canPreviewDrafts(session));
  }
  return false;
}

async function resolveDefaultSlugContent({
  domainId,
  defaultSlug,
  resolvedLocale,
  withTiming,
}: {
  domainId: string;
  defaultSlug: Slug;
  resolvedLocale: string;
  withTiming: <T>(label: string, fn: () => Promise<T>) => Promise<T>;
}): Promise<React.JSX.Element | null> {
  const publishedHomeProps = await withTiming('publishedHomeCmsData', () =>
    getPublishedHomeCmsClientPropsCached({
      domainId,
      defaultSlug: defaultSlug.slug,
      locale: resolvedLocale,
    })
  );
  if (publishedHomeProps !== null) {
    return <HomeContentClient {...publishedHomeProps} />;
  }

  const [themeSettings, menuSettings] = await Promise.all([
    withTiming('cmsTheme', () => getCmsThemeSettings()),
    withTiming('cmsMenu', () => getCmsMenuSettings(domainId, resolvedLocale)),
  ]);
  const cmsPage = await withTiming('cmsPageBySlug', () =>
    readHomeCmsPageBySlugWithRecovery(defaultSlug.slug, resolvedLocale)
  );
  
  const allowDrafts = await resolveDraftSettings(cmsPage, withTiming);
  const hasCmsContent = cmsPage !== null && (allowDrafts || cmsPage.status === 'published') && cmsPage.components.length > 0;

  return (
    <HomeContentClient
      {...buildCmsHomeClientProps({
        defaultSlug: defaultSlug.slug,
        menuSettings,
        themeSettings,
        showMenu: cmsPage?.showMenu !== false,
        hasCmsContent,
        rendererComponents: [...(cmsPage?.components ?? [])].sort(
          (left, right) => left.order - right.order
        ),
      })}
    />
  );
}

export async function HomeContent({
  domainId,
  slugs,
  withTiming,
  locale,
}: HomeContentProps): Promise<React.JSX.Element> {
  const resolvedLocale = normalizeSiteLocale(locale);

  const defaultSlug = slugs.find((s: Slug) => s.isDefault === true);

  if (defaultSlug !== undefined) {
    const content = await resolveDefaultSlugContent({
      domainId,
      defaultSlug,
      resolvedLocale,
      withTiming,
    });
    if (content !== null) {
      return content;
    }
  }

  const fallbackHomeProps = await withTiming('fallbackHomeData', () =>
    getFallbackHomeClientPropsCached({
      domainId,
      locale: resolvedLocale,
    })
  );

  return <HomeContentClient {...fallbackHomeProps} />;
}
