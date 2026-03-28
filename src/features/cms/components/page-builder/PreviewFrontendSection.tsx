'use client';

import React from 'react';

import { SectionRenderer as FrontendSectionRenderer } from '../frontend/CmsPageRenderer';
import type { SectionRendererProps as PreviewFrontendSectionProps } from '../frontend/CmsPageRenderer';

export function PreviewFrontendSection(props: PreviewFrontendSectionProps): React.JSX.Element {
  const { type, sectionId, settings, blocks } = props;

  return (
    <FrontendSectionRenderer
      type={type}
      sectionId={sectionId}
      settings={settings}
      blocks={blocks}
    />
  );
}
