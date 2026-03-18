import { notFound } from 'next/navigation';
import { JSX } from 'react';

import { auth } from '@/features/auth/auth';

import { renderCmsPage } from '../../cms-render';
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
  return renderCmsPage(previewData);
}
