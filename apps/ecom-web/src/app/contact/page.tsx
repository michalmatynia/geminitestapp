import type { Metadata } from 'next';
import type { JSX } from 'react';
import { ContactPageClient } from '@/app/contact/ContactPageClient';
import { getContactContent } from '@/lib/cms';

export const metadata: Metadata = {
  title: 'Contact - ARCANA',
  description: 'Contact ARCANA for product enquiries, order support, press, wholesale, and editorial requests.',
};

export default async function ContactPage(): Promise<JSX.Element> {
  const content = await getContactContent();
  return <ContactPageClient content={content} />;
}
