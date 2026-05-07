import { SiteNav } from '@/components/SiteNav';
import { HeroSection } from '@/components/HeroSection';
import { CategoriesGrid } from '@/components/CategoriesGrid';
import { FeaturedProducts } from '@/components/FeaturedProducts';
import { ManifestoBanner } from '@/components/ManifestoBanner';
import { EditorialStrip } from '@/components/EditorialStrip';
import { SiteFooter } from '@/components/SiteFooter';

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main>
        <HeroSection />
        <CategoriesGrid />
        <FeaturedProducts />
        <ManifestoBanner />
        <EditorialStrip />
        <SiteFooter />
      </main>
    </>
  );
}
