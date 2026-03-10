'use client';

import React from 'react';

import {
  renderCmsPageRenderer,
  renderSectionRenderer,
  type CmsPageRendererProps,
  type SectionRendererProps,
} from './CmsPageRendererBase';
import { useOptionalCmsRuntime } from './CmsRuntimeContext';

export type { CmsPageRendererProps } from './CmsPageRendererBase';

export function CmsPageRenderer(props: CmsPageRendererProps): React.ReactNode {
  const runtime = useOptionalCmsRuntime();

  return renderCmsPageRenderer({ ...props, runtime });
}

export function SectionRenderer(props: SectionRendererProps): React.ReactNode {
  const runtime = useOptionalCmsRuntime();

  return renderSectionRenderer({ ...props, runtime });
}
