import { JSX } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/features/auth/auth";
import type { Session } from "next-auth";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import { getCmsThemeSettings } from "@/features/cms/services/cms-theme-settings";
import { CmsPageRenderer } from "@/features/cms/components/frontend/CmsPageRenderer";
import { ThemeProvider } from "@/features/cms/components/frontend/ThemeProvider";
import type { CmsTheme } from "@/features/cms/types";
import { buildColorSchemeMap } from "@/features/cms/types/theme-settings";
import { getMediaInlineStyles, getMediaStyleVars } from "@/features/cms/components/frontend/theme-styles";

const isAdminSession = (session: Session | null): boolean => {
  if (!session?.user) return false;
  const user = session.user as Session["user"] & { isElevated?: boolean; role?: string | null };
  if (user.isElevated) return true;
  const role = user.role ?? "";
  return ["admin", "super_admin", "superuser"].includes(role);
};

export const dynamic = "force-dynamic";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Preview ${id}`,
    robots: "noindex,nofollow",
  };
}

export default async function CmsPreviewPage({ params }: PreviewPageProps): Promise<JSX.Element> {
  const session = await auth();
  if (!isAdminSession(session)) {
    notFound();
  }

  const { id } = await params;
  const cmsRepository = await getCmsRepository();
  const page = await cmsRepository.getPageById(id);
  if (!page) {
    notFound();
  }

  let theme: CmsTheme | null = null;
  if (page.themeId) {
    theme = await cmsRepository.getThemeById(page.themeId);
  }

  const themeSettings = await getCmsThemeSettings();
  const colorSchemes = buildColorSchemeMap(themeSettings);
  const layout = { fullWidth: themeSettings.fullWidth };
  const mediaVars = getMediaStyleVars(themeSettings);
  const mediaStyles = getMediaInlineStyles(themeSettings);
  const hoverEffect = themeSettings.enableAnimations ? themeSettings.hoverEffect : undefined;
  const hoverScale = themeSettings.enableAnimations ? themeSettings.hoverScale : undefined;
  const content = (
    <CmsPageRenderer
      components={page.components ?? []}
      colorSchemes={colorSchemes}
      layout={layout}
      hoverEffect={hoverEffect}
      hoverScale={hoverScale}
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
