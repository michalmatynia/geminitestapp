import React from 'react';

import { CmsPageRendererBase, type CmsPageRendererProps } from './CmsPageRendererBase';

export type { CmsPageRendererProps } from './CmsPageRendererBase';

export function CmsPageRenderer(props: CmsPageRendererProps): React.ReactNode {
  return <CmsPageRendererBase {...props} runtime={null} />;
}
