import {
  generateFilemakerUnsubscribeMetadata,
  renderFilemakerUnsubscribeRoute,
} from '@/app/(frontend)/filemaker-unsubscribe-route-helpers';

import type { Metadata } from 'next';
import type { JSX } from 'react';

type AdminFilemakerCampaignUnsubscribePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  return generateFilemakerUnsubscribeMetadata();
}

export default async function AdminFilemakerCampaignUnsubscribePage({
  searchParams,
}: AdminFilemakerCampaignUnsubscribePageProps): Promise<JSX.Element> {
  return renderFilemakerUnsubscribeRoute({
    searchParams: searchParams ? await searchParams : undefined,
  });
}
