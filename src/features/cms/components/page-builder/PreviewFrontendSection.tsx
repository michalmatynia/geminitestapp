'use client';

import React from 'react';

import { SectionRenderer as FrontendSectionRenderer } from '../frontend/CmsPageRenderer';

import type { BlockInstance } from '@/shared/contracts/cms';

export type PreviewFrontendSectionProps = {
  type: string;
  sectionId: string;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
};

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
