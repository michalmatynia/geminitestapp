import { notFound } from 'next/navigation';
import { JSX } from 'react';

import { CmsPageRenderer } from '@/features/cms/components/frontend/CmsPageRenderer';
import { CmsPageShell } from '@/features/cms/components/frontend/CmsPageShell';
import { ThemeProvider } from '@/features/cms/components/frontend/ThemeProvider';

import { buildSlugMetadata, loadSlugRenderData, resolveSlugToPage } from './slug-page-data';

import type { Metadata } from 'next';

export const revalidate = 3600; // Hourly revalidation for CMS slug pages

interface SlugPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await resolveSlugToPage(slug);

  if (!page) {
    return { title: 'Page Not Found' };
  }

  return buildSlugMetadata(page);
}

export default async function CmsSlugPage({ params }: SlugPageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const page = await resolveSlugToPage(slug);

  if (!page) {
    notFound();
  }

  const renderData = await loadSlugRenderData(page);
  const content = (
    <CmsPageShell
      menu={renderData.menuSettings}
      theme={renderData.themeSettings}
      colorSchemes={renderData.colorSchemes}
      showMenu={renderData.showMenu}
    >
      <CmsPageRenderer
        components={renderData.rendererComponents}
        colorSchemes={renderData.colorSchemes}
        layout={renderData.layout}
        hoverEffect={renderData.hoverEffect}
        hoverScale={renderData.hoverScale}
        mediaVars={renderData.mediaVars}
        mediaStyles={renderData.mediaStyles}
      />
    </CmsPageShell>
  );

  return (
    <div className='min-h-screen bg-gray-950 text-white'>
      {renderData.theme ? (
        <ThemeProvider theme={renderData.theme}>{content}</ThemeProvider>
      ) : (
        content
      )}
    </div>
  );
}
