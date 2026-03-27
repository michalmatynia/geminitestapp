import {
  generateFilemakerUnsubscribeMetadata,
  renderFilemakerUnsubscribeRoute,
} from '@/app/(frontend)/filemaker-unsubscribe-route-helpers';

import type { Metadata } from 'next';
import type { JSX } from 'react';

type FilemakerUnsubscribePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  return generateFilemakerUnsubscribeMetadata();
}

export default async function FilemakerUnsubscribePage({
  searchParams,
}: FilemakerUnsubscribePageProps): Promise<JSX.Element> {
  return renderFilemakerUnsubscribeRoute({
    searchParams: searchParams ? await searchParams : undefined,
  });
}
