import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
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
  const metadataTranslations = await getTranslations('Metadata');
  return {
    title: metadataTranslations('previewTitle', { id }),
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
