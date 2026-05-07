import { type JSX } from 'react';

import {
  generateCmsPublicSlugRouteMetadata,
  renderCmsPublicSlugRoute,
} from '../../_public/cms-public-routes';

import type { Metadata } from 'next';

type LocalizedSlugPageProps = {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: LocalizedSlugPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  return generateCmsPublicSlugRouteMetadata({ locale, slug });
}

export default async function LocalizedCmsSlugPage({
  params,
  searchParams,
}: LocalizedSlugPageProps): Promise<JSX.Element> {
  const { locale, slug } = await params;
  return renderCmsPublicSlugRoute({
    locale,
    slug,
    searchParams: searchParams ? await searchParams : undefined,
  });
}
