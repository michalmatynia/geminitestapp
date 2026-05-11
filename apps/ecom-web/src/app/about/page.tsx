import type { Metadata } from 'next';
import type { JSX } from 'react';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { getAboutContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';
import { HeroSection } from './sections/HeroSection';
import { OriginSection } from './sections/OriginSection';
import { TimelineSection } from './sections/TimelineSection';
import { ArtisansSection } from './sections/ArtisansSection';
import { ValuesSection } from './sections/ValuesSection';
import { ClosingSection } from './sections/ClosingSection';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getAboutContent(locale);
  const title = `${content.hero.title} - STARGATER`;
  const description = content.hero.body;
  return {
    title,
    description,
    openGraph: { type: 'website', title, description },
    twitter: { card: 'summary', title, description },
  };
}

const ARTISAN_GRADIENTS = [
  'linear-gradient(145deg, #C4A882 0%, #8C7260 100%)',
  'linear-gradient(145deg, #2C4A3E 0%, #1A3028 100%)',
  'linear-gradient(145deg, #5C3D2A 0%, #3E2618 100%)',
  'linear-gradient(145deg, #4A5A6A 0%, #2C3A48 100%)',
];

export default async function AboutPage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const content = await getAboutContent(locale);

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)' }}>
        <HeroSection content={content.hero} />
        <OriginSection content={content} />
        <TimelineSection content={content} />
        <ArtisansSection content={content} locale={locale} gradients={ARTISAN_GRADIENTS} />
        <ValuesSection content={content} />
        <ClosingSection content={content.closing} locale={locale} />
      </main>
      <SiteFooter />
    </>
  );
}
