import { type JSX } from 'react';

import {
  generateCmsSlugRouteMetadata,
  renderCmsSlugRoute,
} from '../route-helpers/slug-route-helpers';

import type { Metadata } from 'next';

interface SlugPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateCmsSlugRouteMetadata({ slug });
}

export default async function CmsSlugPage({
  params,
  searchParams,
}: SlugPageProps): Promise<JSX.Element | null> {
  const { slug } = await params;
  return renderCmsSlugRoute({
    slug,
    searchParams: searchParams ? await searchParams : undefined,
  });
}
