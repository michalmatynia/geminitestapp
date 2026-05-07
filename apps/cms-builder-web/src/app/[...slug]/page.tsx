import { type JSX } from 'react';

import {
  generateCmsPublicSlugRouteMetadata,
  renderCmsPublicSlugRoute,
} from '../_public/cms-public-routes';

import type { Metadata } from 'next';

type SlugPageProps = {
  params: Promise<{ slug: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateCmsPublicSlugRouteMetadata({ slug });
}

export default async function CmsSlugPage({
  params,
  searchParams,
}: SlugPageProps): Promise<JSX.Element> {
  const { slug } = await params;
  return renderCmsPublicSlugRoute({
    slug,
    searchParams: searchParams ? await searchParams : undefined,
  });
}
