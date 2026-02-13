
'use client';

import { getSectionContainerClass, getSectionStyles, getTextAlign } from '../theme-styles';
import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useOptionalSectionBlockData } from './SectionBlockContext';
import { useCmsPageContext } from '../CmsPageContext';

import type { BlockInstance } from '../../../types/page-builder';

interface FrontendAnnouncementBarSectionProps {
  settings?: Record<string, unknown>;
  blocks?: BlockInstance[];
}

export function FrontendAnnouncementBarSection({
  settings: propSettings,
  blocks: propBlocks,
}: FrontendAnnouncementBarSectionProps): React.ReactNode {
  const sectionBlockData = useOptionalSectionBlockData();
  const settings = propSettings ?? sectionBlockData?.settings ?? {};
  const blocks = propBlocks ?? sectionBlockData?.blocks ?? [];
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = {
    ...getSectionStyles(settings, colorSchemes),
    ...getTextAlign(settings['contentAlignment']),
  };
  const alignment = (settings['contentAlignment'] as string) || 'center';
  const alignmentClass =
    alignment === 'left'
      ? 'justify-start'
      : alignment === 'right'
        ? 'justify-end'
        : 'justify-center';

  return (
    <section className='w-full' style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: 'max-w-6xl' })}>
        <div className={`flex flex-wrap items-center gap-3 ${alignmentClass}`}>
          {blocks.length === 0 ? (
            <p className='text-sm text-gray-400'>Announcement bar</p>
          ) : (
            blocks.map((block: BlockInstance) => (
              <FrontendBlockRenderer key={block.id} block={block} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
