import {
  generateFilemakerUnsubscribeMetadata,
  renderFilemakerUnsubscribeRoute,
} from '@/app/(frontend)/filemaker-unsubscribe-route-helpers';

import type { Metadata } from 'next';
import type { JSX } from 'react';

type LocalizedFilemakerUnsubscribePageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return generateFilemakerUnsubscribeMetadata();
}

export default async function LocalizedFilemakerUnsubscribePage({
  params,
  searchParams,
}: LocalizedFilemakerUnsubscribePageProps): Promise<JSX.Element> {
  await params;
  return renderFilemakerUnsubscribeRoute({
    searchParams: searchParams ? await searchParams : undefined,
  });
}
