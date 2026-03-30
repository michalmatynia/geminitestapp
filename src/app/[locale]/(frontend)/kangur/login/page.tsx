import { type JSX } from 'react';

import { renderKangurLoginAliasRoute } from '@/app/(frontend)/route-helpers/kangur-login-alias-route-helpers';

type LocalizedKangurAliasLoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LocalizedKangurLoginPage({
  params,
  searchParams,
}: LocalizedKangurAliasLoginPageProps): Promise<JSX.Element> {
  const { locale } = await params;
  return renderKangurLoginAliasRoute({
    locale,
    searchParams: searchParams ? await searchParams : undefined,
  });
}
