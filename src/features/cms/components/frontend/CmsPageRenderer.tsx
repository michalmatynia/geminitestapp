'use client';

import type React from 'react';

import {
  renderCmsPageRenderer,
  renderSectionRenderer,
  type CmsPageRendererProps,
  type SectionRendererProps,
} from './CmsPageRendererBase';
import { useOptionalCmsStorefrontAppearance } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import { useOptionalCmsRuntime } from './CmsRuntimeContext';

export type { CmsPageRendererProps } from './CmsPageRendererBase';
export type { SectionRendererProps } from './CmsPageRendererBase';

export function CmsPageRenderer(props: CmsPageRendererProps): React.ReactNode {
  const runtime = useOptionalCmsRuntime();
  const appearance = useOptionalCmsStorefrontAppearance();

  return renderCmsPageRenderer({
    ...props,
    runtime,
    appearanceMode: props.appearanceMode ?? appearance?.mode ?? 'default',
  });
}

export function SectionRenderer(props: SectionRendererProps): React.ReactNode {
  const runtime = useOptionalCmsRuntime();

  return renderSectionRenderer({ ...props, runtime });
}
