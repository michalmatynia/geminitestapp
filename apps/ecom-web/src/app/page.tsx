import { SiteNav } from '@/components/SiteNav';
import { HeroSection } from '@/components/HeroSection';
import { CategoriesGrid } from '@/components/CategoriesGrid';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { ManifestoBanner } from '@/components/ManifestoBanner';
import { EditorialStrip } from '@/components/EditorialStrip';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { SiteFooter } from '@/components/SiteFooter';
import { getMentiosProducts, getMentiosCollectionCounts } from '@/lib/mentios';

export const revalidate = 120; // ISR — revalidate every 2 minutes

export default async function HomePage() {
  // Both fetches run in parallel; either can fail gracefully.
  const [{ products: dbProducts }, collectionCounts] = await Promise.all([
    getMentiosProducts({ limit: 6 }),
    getMentiosCollectionCounts(),
  ]);

  const featuredProducts = dbProducts.length > 0 ? dbProducts.slice(0, 6) : null;

  return (
    <>
      <SiteNav />
      <main>
        <HeroSection />
        <CategoriesGrid counts={collectionCounts} />
        <FeaturedProducts products={featuredProducts} />
        <ManifestoBanner />
        <EditorialStrip />
        <RecentlyViewed />
        <SiteFooter />
      </main>
    </>
  );
}
