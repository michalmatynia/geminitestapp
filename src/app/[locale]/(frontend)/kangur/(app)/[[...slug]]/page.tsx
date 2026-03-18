import { redirect } from 'next/navigation';

import { getFrontPageSetting, shouldApplyFrontPageAppSelection } from '@/app/(frontend)/home-helpers';
import { getKangurCanonicalPublicHref } from '@/features/kangur/config/routing';
import {
  buildLocalizedPathname,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
import { getFrontPagePublicOwner } from '@/shared/lib/front-page-app';

type LocalizedKangurAliasPageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LocalizedKangurAliasPage({
  params,
  searchParams,
}: LocalizedKangurAliasPageProps): Promise<null> {
  if (shouldApplyFrontPageAppSelection()) {
    const frontPageSetting = await getFrontPageSetting();

    if (getFrontPagePublicOwner(frontPageSetting) === 'kangur') {
      const { locale, slug = [] } = await params;
      const resolvedSearchParams = searchParams ? await searchParams : undefined;
      redirect(
        buildLocalizedPathname(
          getKangurCanonicalPublicHref(slug, resolvedSearchParams),
          normalizeSiteLocale(locale)
        )
      );
    }
  }

  return null;
}
