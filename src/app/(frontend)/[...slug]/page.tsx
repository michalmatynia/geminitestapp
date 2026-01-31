import { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import { getCmsThemeSettings } from "@/features/cms/services/cms-theme-settings";
import { CmsPageRenderer } from "@/features/cms/components/frontend/CmsPageRenderer";
import { ThemeProvider } from "@/features/cms/components/frontend/ThemeProvider";
import type { Page, CmsTheme } from "@/features/cms/types";
import { getSlugForDomainByValue, resolveCmsDomainFromHeaders } from "@/features/cms/services/cms-domain";
import { buildColorSchemeMap } from "@/features/cms/types/theme-settings";
import { getMediaInlineStyles, getMediaStyleVars } from "@/features/cms/components/frontend/theme-styles";
import { auth } from "@/features/auth/auth";
import type { Session } from "next-auth";
import { getUserPreferences } from "@/shared/lib/services/user-preferences-repository";

const isAdminSession = (session: Session | null): boolean => {
  if (!session?.user) return false;
  const user = session.user as Session["user"] & { isElevated?: boolean; role?: string | null };
  if (user.isElevated) return true;
  const role = user.role ?? "";
  return ["admin", "super_admin", "superuser"].includes(role);
};

const canPreviewDrafts = async (
  session: Session | null
): Promise<boolean> => {
  if (!isAdminSession(session)) return false;
  const userId = session?.user?.id;
  if (!userId) return false;
  try {
    const prefs = await getUserPreferences(userId);
    return prefs.cmsPreviewEnabled === true;
  } catch {
    return false;
  }
};

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Resolve slug → published page
// ---------------------------------------------------------------------------

async function resolveSlugToPage(slugSegments: string[]): Promise<Page | null> {
  try {
    const slugValue = slugSegments.join("/");
    const session = await auth();
    const allowDrafts = await canPreviewDrafts(session);
    const cmsRepository = await getCmsRepository();
    const hdrs = await headers();
    const domain = await resolveCmsDomainFromHeaders(hdrs);
    const domainSlug = await getSlugForDomainByValue(domain.id, slugValue, cmsRepository);
    if (!domainSlug) return null;
    const page = await cmsRepository.getPageBySlug(slugValue);
    if (!page) return null;
    // Only render published pages on the frontend
    if (!allowDrafts && page.status !== "published") return null;
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

  const themeSettings = await getCmsThemeSettings();
  const colorSchemes = buildColorSchemeMap(themeSettings);
  const layout = { fullWidth: themeSettings.fullWidth };
  const mediaVars = getMediaStyleVars(themeSettings);
  const mediaStyles = getMediaInlineStyles(themeSettings);
  const content = (
    <CmsPageRenderer
      components={page.components ?? []}
      colorSchemes={colorSchemes}
      layout={layout}
      hoverEffect={themeSettings.enableAnimations ? themeSettings.hoverEffect : undefined}
      hoverScale={themeSettings.enableAnimations ? themeSettings.hoverScale : undefined}
      mediaVars={mediaVars}
      mediaStyles={mediaStyles}
    />
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {theme ? <ThemeProvider theme={theme}>{content}</ThemeProvider> : content}
    </div>
  );
}
