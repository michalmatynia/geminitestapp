'use client';

import type { BlockInstance } from '@/shared/contracts/cms';

import { useCmsPageContext } from '../CmsPageContext';
import { getSectionContainerClass, getSectionStyles } from '../theme-styles';
import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';

export function FrontendRichTextSection(): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);

  return (
    <section style={sectionStyles}>
      <div
        className={getSectionContainerClass({
          fullWidth: layout?.fullWidth,
          maxWidthClass: 'max-w-3xl',
        })}
      >
        <div className='space-y-4'>
          {blocks.map((block: BlockInstance) => (
            <FrontendBlockRenderer key={block.id} block={block} />
          ))}
          {blocks.length === 0 && <p className='text-gray-500'>Rich text section</p>}
        </div>
      </div>
    </section>
  );
}
