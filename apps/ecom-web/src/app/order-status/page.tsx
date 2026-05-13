import type { Metadata } from 'next';
import type { JSX } from 'react';
import { OrderStatusPageClient } from '@/app/order-status/OrderStatusPageClient';
import { getRequestLocale } from '@/lib/request-locale';

type SearchParams = Promise<{ order?: string }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const title = locale === 'pl' ? 'Śledź zamówienie - STARGATER' : 'Track order - STARGATER';
  const description = locale === 'pl'
    ? 'Sprawdź aktualny status zamówienia STARGATER.'
    : 'Check the current status of your STARGATER order.';
  return {
    title,
    description,
    robots: { index: false, follow: false },
  };
}

export default async function OrderStatusPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}): Promise<JSX.Element> {
  const params: unknown = await (searchParams ?? Promise.resolve({}));
  const initialOrderId = isRecord(params) && typeof params['order'] === 'string' ? params['order'] : '';
  return <OrderStatusPageClient initialOrderId={initialOrderId} />;
}
