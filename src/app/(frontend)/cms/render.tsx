import { type JSX } from 'react';

import {
  CmsPageShell,
  CmsPageRenderer,
  ThemeProvider,
} from '@/features/cms/public';

import type { SlugRenderData } from './slug-page-data';

export const renderCmsPage = (renderData: SlugRenderData): JSX.Element => {
  const content = (
    <CmsPageShell
      menu={renderData.menuSettings}
      theme={renderData.themeSettings}
      colorSchemes={renderData.colorSchemes}
      showMenu={renderData.showMenu}
    >
      <CmsPageRenderer
        components={renderData.rendererComponents}
        colorSchemes={renderData.colorSchemes}
        layout={renderData.layout}
        hoverEffect={renderData.hoverEffect}
        hoverScale={renderData.hoverScale}
        mediaVars={renderData.mediaVars}
        mediaStyles={renderData.mediaStyles}
      />
    </CmsPageShell>
  );

  return (
    <div className='min-h-screen'>
      {renderData.theme ? (
        <ThemeProvider theme={renderData.theme}>{content}</ThemeProvider>
      ) : (
        content
      )}
    </div>
  );
};
