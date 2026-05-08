import type { Metadata } from 'next';
import type { JSX } from 'react';
import { ContactPageClient } from '@/app/contact/ContactPageClient';
import { getContactContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getContactContent(locale);
  return {
    title: `${content.hero.watermark} - ARCANA`,
    description: content.hero.body,
  };
}

export default async function ContactPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const content = await getContactContent(locale);
  return <ContactPageClient content={content} />;
}
