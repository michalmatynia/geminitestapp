import { JSX } from 'react';

import {
  generateCmsSlugRouteMetadata,
  renderCmsSlugRoute,
} from '../route-helpers/slug-route-helpers';

import type { Metadata } from 'next';

export const revalidate = 3600; // Hourly revalidation for CMS slug pages

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
