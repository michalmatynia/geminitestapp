import type { Metadata } from 'next';
import type { JSX } from 'react';
import { SiteNav } from '@/components/SiteNav';
import { HeroSection } from '@/components/HeroSection';
import { CategoriesGrid } from '@/components/CategoriesGrid';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { ManifestoBanner } from '@/components/ManifestoBanner';
import { EditorialStrip } from '@/components/EditorialStrip';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { SiteFooter } from '@/components/SiteFooter';
import { HOME_CONTENT_DEFAULTS } from '@/data/homeContent';
import { getMentiosCategories, getMentiosProducts, getMentiosCollectionCounts, getMentiosHomeStats } from '@/lib/mentios';
import { getHomeContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';
import type { EcomLocale } from '@/lib/locales';

export const revalidate = 120; // ISR — revalidate every 2 minutes
const FEATURED_PRODUCT_COUNT = 24;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getHomeContent(locale).catch(() => HOME_CONTENT_DEFAULTS);
  const title = locale === 'pl'
    ? 'STARGATER - Anime, gaming i filmowe kolekcjonalia'
    : 'STARGATER - Anime, Gaming, and Film Collectibles';
  const description = content.hero.description;
  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: 'STARGATER',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function formatStatValue(value: number, locale: EcomLocale): string {
  return value.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-US');
}

export default async function HomePage(): Promise<JSX.Element> {
  const locale = await getRequestLocale();
  const [{ products: dbProducts }, collectionCounts, homeContent, homeStats, catalogCategories] = await Promise.all([
    getMentiosProducts({ limit: FEATURED_PRODUCT_COUNT, locale }).catch(() => ({ products: [], total: 0 })),
    getMentiosCollectionCounts().catch(() => ({})),
    getHomeContent(locale).catch(() => HOME_CONTENT_DEFAULTS),
    getMentiosHomeStats(locale).catch(() => null),
    getMentiosCategories(locale).catch(() => []),
  ]);

  const featuredProducts = dbProducts.length > 0 ? dbProducts.slice(0, FEATURED_PRODUCT_COUNT) : null;
  const liveStatValues = homeStats
    ? [
        formatStatValue(homeStats.itemCount, locale),
        formatStatValue(homeStats.categoryCount, locale),
        formatStatValue(homeStats.loreCount, locale),
      ]
    : [];
  const heroContent = liveStatValues.length > 0
    ? {
        ...homeContent.hero,
        stats: homeContent.hero.stats.map((stat, index) => ({
          ...stat,
          value: liveStatValues[index] ?? stat.value,
        })),
      }
    : homeContent.hero;

  return (
    <>
      <SiteNav />
      <main>
        <HeroSection content={heroContent} catalogCategories={catalogCategories} />
        <CategoriesGrid counts={collectionCounts} content={homeContent.categories} catalogCategories={catalogCategories} />
        <FeaturedProducts products={featuredProducts} content={homeContent.featured} catalogCategories={catalogCategories} />
        <ManifestoBanner
          content={homeContent.manifesto}
          locale={locale}
          allowedCategoryNames={catalogCategories.map((category) => category.name)}
        />
        <EditorialStrip content={homeContent.editorial} />
        <RecentlyViewed content={homeContent.recentlyViewed} />
        <SiteFooter />
      </main>
    </>
  );
}
