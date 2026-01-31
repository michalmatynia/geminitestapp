import { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import { CmsPageRenderer } from "@/features/cms/components/frontend/CmsPageRenderer";
import { ThemeProvider } from "@/features/cms/components/frontend/ThemeProvider";
import type { Page, CmsTheme } from "@/features/cms/types";
import { getSlugForDomainByValue, resolveCmsDomainFromHeaders } from "@/features/cms/services/cms-domain";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Resolve slug → published page
// ---------------------------------------------------------------------------

async function resolveSlugToPage(slugSegments: string[]): Promise<Page | null> {
  try {
    const slugValue = slugSegments.join("/");
    const cmsRepository = await getCmsRepository();
    const hdrs = await headers();
    const domain = await resolveCmsDomainFromHeaders(hdrs);
    const domainSlug = await getSlugForDomainByValue(domain.id, slugValue, cmsRepository);
    if (!domainSlug) return null;
    const page = await cmsRepository.getPageBySlug(slugValue);
    if (!page) return null;
    // Only render published pages on the frontend
    if (page.status !== "published") return null;
    return page;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SEO metadata
// ---------------------------------------------------------------------------

interface SlugPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await resolveSlugToPage(slug);

  if (!page) {
    return { title: "Page Not Found" };
  }

  const metadata: Metadata = {
    title: page.seoTitle || page.name,
    robots: page.robotsMeta || "index,follow",
  };

  if (page.seoDescription) {
    metadata.description = page.seoDescription;
  }

  if (page.seoOgImage) {
    metadata.openGraph = {
      images: [{ url: page.seoOgImage }],
    };
  }

  if (page.seoCanonical) {
    metadata.alternates = {
      canonical: page.seoCanonical,
    };
  }

  return metadata;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function CmsSlugPage({ params }: SlugPageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const page = await resolveSlugToPage(slug);

  if (!page) {
    notFound();
  }

  let theme: CmsTheme | null = null;
  if (page.themeId) {
    const cmsRepository = await getCmsRepository();
    theme = await cmsRepository.getThemeById(page.themeId);
  }

  const content = <CmsPageRenderer components={page.components} />;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {theme ? <ThemeProvider theme={theme}>{content}</ThemeProvider> : content}
    </div>
  );
}
