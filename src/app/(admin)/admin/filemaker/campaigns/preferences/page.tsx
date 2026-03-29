import {
  generateFilemakerPreferencesMetadata,
  renderFilemakerPreferencesRoute,
} from '@/app/(frontend)/filemaker-preferences-route-helpers';

import type { Metadata } from 'next';
import type { JSX } from 'react';

type AdminFilemakerCampaignPreferencesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  return generateFilemakerPreferencesMetadata();
}

export default async function AdminFilemakerCampaignPreferencesPage({
  searchParams,
}: AdminFilemakerCampaignPreferencesPageProps): Promise<JSX.Element> {
  return renderFilemakerPreferencesRoute({
    searchParams: searchParams ? await searchParams : undefined,
  });
}
