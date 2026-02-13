'use client';

import { buildScopedCustomCss, getCustomCssSelector } from '@/features/cms/utils/custom-css';

import { getSectionContainerClass, getSectionStyles } from '../theme-styles';
import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useOptionalSectionBlockData } from './SectionBlockContext';
import { SectionDataProvider } from './SectionDataContext';
import { useCmsPageContext } from '../CmsPageContext';

import type { BlockInstance } from '../../../types/page-builder';

interface FrontendSlideshowSectionProps {
  sectionId?: string | undefined;
  settings?: Record<string, unknown>;
  blocks?: BlockInstance[];
  layout?: { fullWidth?: boolean | undefined } | undefined;
}

export function FrontendSlideshowSection({
  sectionId: propSectionId,
  settings: propSettings,
  blocks: propBlocks,
  layout: propLayout,
}: FrontendSlideshowSectionProps): React.ReactNode {
  const sectionBlockData = useOptionalSectionBlockData();
  const sectionId = propSectionId ?? sectionBlockData?.sectionId;
  const settings = propSettings ?? sectionBlockData?.settings ?? {};
  const blocks = propBlocks ?? sectionBlockData?.blocks ?? [];
  const { colorSchemes, layout: contextLayout } = useCmsPageContext();
  const layout = propLayout ?? contextLayout;
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const sectionSelector = sectionId ? getCustomCssSelector(sectionId) : null;
  const sectionCustomCss = buildScopedCustomCss(settings['customCss'], sectionSelector);

  // Slideshow specific logic would go here (timer, active index, etc.)
  // For now, it renders blocks similar to a regular section but could be enhanced

  return (
    <SectionDataProvider settings={settings}>
      <section
        className={`w-full relative overflow-hidden${sectionId ? ` cms-node-${sectionId}` : ''}`}
        style={sectionStyles}
      >
        {sectionCustomCss ? <style data-cms-custom-css={sectionId}>{sectionCustomCss}</style> : null}
        <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
          <div className='slideshow-container relative w-full'>
            {blocks.map((block: BlockInstance) => (
              <FrontendBlockRenderer key={block.id} block={block} />
            ))}
            {blocks.length === 0 && (
              <div className='flex min-h-[300px] items-center justify-center bg-gray-800/20 text-gray-500 italic'>
                Empty slideshow
              </div>
            )}
          </div>
        </div>
      </section>
    </SectionDataProvider>
  );
}
