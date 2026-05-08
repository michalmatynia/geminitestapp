import type { Metadata } from 'next';
import type { JSX } from 'react';
import { ContactPageClient } from '@/app/contact/ContactPageClient';
import { getContactContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getContactContent(locale);
  const title = `${content.hero.watermark} - ARCANA`;
  const description = content.hero.body;
  return {
    title,
    description,
    openGraph: { type: 'website', title, description },
    twitter: { card: 'summary', title, description },
  };
}

export default async function ContactPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const content = await getContactContent(locale);
  return <ContactPageClient content={content} />;
}
