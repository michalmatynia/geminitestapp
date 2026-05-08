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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = await getHomeContent(locale);
  return {
    title: locale === 'pl'
      ? 'ARCANA - Anime, gaming i filmowe kolekcjonalia'
      : 'ARCANA - Anime, Gaming, and Film Collectibles',
    description: content.hero.description,
  };
}

export default async function HomePage() {
  const locale = await getRequestLocale();
  // Both fetches run in parallel; either can fail gracefully.
  const [{ products: dbProducts }, collectionCounts, homeContent] = await Promise.all([
    getMentiosProducts({ limit: 6, locale }),
    getMentiosCollectionCounts(),
    getHomeContent(locale),
  ]);

  const featuredProducts = dbProducts.length > 0 ? dbProducts.slice(0, 6) : null;

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
