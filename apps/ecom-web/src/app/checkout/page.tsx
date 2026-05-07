import type { Metadata } from 'next';
import type { JSX } from 'react';
import { CheckoutPageClient } from '@/app/checkout/CheckoutPageClient';
import { getCheckoutContent } from '@/lib/cms';

export const metadata: Metadata = {
  title: 'Checkout - ARCANA',
  description: 'Complete your ARCANA order.',
};

export default async function CheckoutPage(): Promise<JSX.Element> {
  const content = await getCheckoutContent();
  return <CheckoutPageClient content={content} />;
}
