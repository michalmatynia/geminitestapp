import { JSX } from 'react';

import {
  generateCmsSlugRouteMetadata,
  renderCmsSlugRoute,
} from '@/app/(frontend)/route-helpers/slug-route-helpers';

import type { Metadata } from 'next';

export const revalidate = 3600;

type LocalizedSlugPageProps = {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: LocalizedSlugPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  return generateCmsSlugRouteMetadata({ locale, slug });
}

export default async function LocalizedCmsSlugPage({
  params,
  searchParams,
}: LocalizedSlugPageProps): Promise<JSX.Element | null> {
  const { locale, slug } = await params;
  return renderCmsSlugRoute({
    locale,
    slug,
    searchParams: searchParams ? await searchParams : undefined,
  });
}
