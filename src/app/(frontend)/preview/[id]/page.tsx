import { JSX } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCmsRepository } from "@/features/cms/services/cms-repository";
import { CmsPageRenderer } from "@/features/cms/components/frontend/CmsPageRenderer";
import { ThemeProvider } from "@/features/cms/components/frontend/ThemeProvider";
import type { CmsTheme } from "@/features/cms/types";

export const dynamic = "force-dynamic";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { id } = await params;
  const cmsRepository = await getCmsRepository();
  const page = await cmsRepository.getPageById(id);
  if (!page) {
    return { title: "Preview Not Found" };
  }
  return {
    title: `Preview: ${page.name}`,
    robots: "noindex,nofollow",
  };
}

export default async function CmsPreviewPage({ params }: PreviewPageProps): Promise<JSX.Element> {
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

  const content = <CmsPageRenderer components={page.components} />;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {theme ? <ThemeProvider theme={theme}>{content}</ThemeProvider> : content}
    </div>
  );
}
