import type { Metadata } from 'next';
import { SiteNav } from '@/components/SiteNav';
import { HeroSection } from '@/components/HeroSection';
import { CategoriesGrid } from '@/components/CategoriesGrid';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { ManifestoBanner } from '@/components/ManifestoBanner';
import { EditorialStrip } from '@/components/EditorialStrip';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { SiteFooter } from '@/components/SiteFooter';
import { getMentiosProducts, getMentiosCollectionCounts } from '@/lib/mentios';
import { getHomeContent } from '@/lib/cms';
import { getRequestLocale } from '@/lib/request-locale';

export const revalidate = 120; // ISR — revalidate every 2 minutes
const FEATURED_PRODUCT_COUNT = 12;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getHomeContent(locale);
  const title = locale === 'pl'
    ? 'ARCANA - Anime, gaming i filmowe kolekcjonalia'
    : 'ARCANA - Anime, Gaming, and Film Collectibles';
  const description = content.hero.description;
  return {
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: 'ARCANA',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function HomePage() {
  const locale = await getRequestLocale();
  // Both fetches run in parallel; either can fail gracefully.
  const [{ products: dbProducts }, collectionCounts, homeContent] = await Promise.all([
    getMentiosProducts({ limit: FEATURED_PRODUCT_COUNT, locale }),
    getMentiosCollectionCounts(),
    getHomeContent(locale),
  ]);

  const featuredProducts = dbProducts.length > 0 ? dbProducts.slice(0, FEATURED_PRODUCT_COUNT) : null;

  return (
    <>
      <SiteNav />
      <main>
        <HeroSection content={homeContent.hero} />
        <CategoriesGrid counts={collectionCounts} content={homeContent.categories} />
        <FeaturedProducts products={featuredProducts} content={homeContent.featured} />
        <ManifestoBanner content={homeContent.manifesto} locale={locale} />
        <EditorialStrip content={homeContent.editorial} />
        <RecentlyViewed content={homeContent.recentlyViewed} />
        <SiteFooter />
      </main>
    </>
  );
}
