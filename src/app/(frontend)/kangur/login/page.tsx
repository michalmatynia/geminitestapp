/*
 * StudiQ alias login route
 *
 * Purpose: Lightweight alias route used to redirect or render the Kangur login
 * experience inside the storefront routing layer. Keep this component minimal so
 * accessibility behaviour (labels, focus) is resolved by the rendered login
 * shell returned by renderKangurLoginAliasRoute.
 */
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
