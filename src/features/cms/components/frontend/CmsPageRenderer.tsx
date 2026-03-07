'use client';

import React from 'react';

import { useOptionalCmsRuntime } from './CmsRuntimeContext';
import {
  CmsPageRendererBase,
  SectionRendererBase,
  type CmsPageRendererProps,
  type SectionRendererProps,
} from './CmsPageRendererBase';

export type { CmsPageRendererProps } from './CmsPageRendererBase';

export function CmsPageRenderer(props: CmsPageRendererProps): React.ReactNode {
  const runtime = useOptionalCmsRuntime();

  return <CmsPageRendererBase {...props} runtime={runtime} />;
}

export function SectionRenderer(props: SectionRendererProps): React.ReactNode {
  const runtime = useOptionalCmsRuntime();

  return <SectionRendererBase {...props} runtime={runtime} />;
}
