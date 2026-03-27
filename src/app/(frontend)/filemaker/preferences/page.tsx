import {
  generateFilemakerPreferencesMetadata,
  renderFilemakerPreferencesRoute,
} from '@/app/(frontend)/filemaker-preferences-route-helpers';

import type { Metadata } from 'next';
import type { JSX } from 'react';

type FilemakerPreferencesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return generateFilemakerPreferencesMetadata();
}

export default async function FilemakerPreferencesPage({
  searchParams,
}: FilemakerPreferencesPageProps): Promise<JSX.Element> {
  return renderFilemakerPreferencesRoute({
    searchParams: searchParams ? await searchParams : undefined,
  });
}
