import { stripSiteLocalePrefix } from '@/shared/lib/i18n/site-locale';

export type FrontendPublicOwner = 'cms' | 'kangur';

export type FrontendPublicRouteFamily = 'studiq' | 'cms' | 'products' | 'preview';

export const resolveFrontendPublicRouteFamily = ({
  pathname,
  publicOwner,
}: {
  pathname: string | null;
  publicOwner: FrontendPublicOwner;
}): FrontendPublicRouteFamily => {
  const normalizedPathname = stripSiteLocalePrefix(pathname?.trim() || '/');

  if (normalizedPathname.startsWith('/products/')) {
    return 'products';
  }

  if (normalizedPathname.startsWith('/preview/')) {
    return 'preview';
  }

  if (
    publicOwner === 'kangur' ||
    normalizedPathname === '/kangur' ||
    normalizedPathname.startsWith('/kangur/')
  ) {
    return 'studiq';
  }

  return 'cms';
};
