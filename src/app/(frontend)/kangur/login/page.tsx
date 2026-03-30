import { type JSX } from 'react';

import { renderKangurLoginAliasRoute } from '@/app/(frontend)/route-helpers/kangur-login-alias-route-helpers';

type KangurAliasLoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({
  searchParams,
}: KangurAliasLoginPageProps): Promise<JSX.Element> {
  return renderKangurLoginAliasRoute({
    searchParams: searchParams ? await searchParams : undefined,
  });
}
