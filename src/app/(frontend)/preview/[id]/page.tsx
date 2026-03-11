import { notFound } from 'next/navigation';
import { JSX } from 'react';

import { auth } from '@/features/auth/auth';
import { CmsPageRenderer } from '@/features/cms/components/frontend/CmsPageRenderer';
import { CmsPageShell } from '@/features/cms/components/frontend/CmsPageShell';
import { ThemeProvider } from '@/features/cms/components/frontend/ThemeProvider';

import { isAdminSession, loadPreviewRenderData } from './preview-page-data';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Preview ${id}`,
    robots: 'noindex,nofollow',
  };
}

export default async function CmsPreviewPage({ params }: PreviewPageProps): Promise<JSX.Element> {
  const session = await auth();
  if (!isAdminSession(session)) {
    notFound();
  }

  const { id } = await params;
  const previewData = await loadPreviewRenderData(id);
  if (!previewData) {
    notFound();
  }
  const content = (
    <CmsPageShell
      menu={previewData.menuSettings}
      theme={previewData.themeSettings}
      colorSchemes={previewData.colorSchemes}
      showMenu={previewData.showMenu}
    >
      <CmsPageRenderer
        components={previewData.rendererComponents}
        colorSchemes={previewData.colorSchemes}
        layout={previewData.layout}
        hoverEffect={previewData.hoverEffect}
        hoverScale={previewData.hoverScale}
        mediaVars={previewData.mediaVars}
        mediaStyles={previewData.mediaStyles}
      />
    </CmsPageShell>
  );

  return (
    <div className='min-h-screen'>
      {previewData.theme ? (
        <ThemeProvider theme={previewData.theme}>{content}</ThemeProvider>
      ) : (
        content
      )}
    </div>
  );
}
