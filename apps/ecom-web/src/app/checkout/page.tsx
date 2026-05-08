import type { Metadata } from 'next';
import type { JSX } from 'react';
import { CheckoutPageClient } from '@/app/checkout/CheckoutPageClient';
import { getCheckoutContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getCheckoutContent(locale);
  return {
    title: `${content.orderSummary.title} - ARCANA`,
    description: locale === 'pl'
      ? 'Dokończ zamówienie ARCANA.'
      : 'Complete your ARCANA order.',
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const content = await getCheckoutContent(locale);
  return <CheckoutPageClient content={content} />;
}
