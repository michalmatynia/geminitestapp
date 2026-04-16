import type React from 'react';

import { renderCmsPageRenderer, type CmsPageRendererProps } from './CmsPageRendererBase';

export type { CmsPageRendererProps } from './CmsPageRendererBase';

export function CmsPageRenderer(props: CmsPageRendererProps): React.ReactNode {
  return renderCmsPageRenderer({
    ...props,
    runtime: null,
    appearanceMode: props.appearanceMode ?? 'default',
  });
}
