'use client';

import { EmptyState } from '@/shared/ui';

import { getSectionContainerClass, getSectionStyles } from '../theme-styles';
import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useCmsPageContext } from '../CmsPageContext';
import { useMediaStyles } from '../media-styles-context';
import { useSectionBlockData } from './SectionBlockContext';
import { SectionDataProvider } from './SectionDataContext';

import type { BlockInstance } from '../../../types/page-builder';

export function FrontendHeroSection(): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const image = settings['image'] as string | undefined;
  const imageHeight = (settings['imageHeight'] as string) || 'large';
  const mediaStyles = useMediaStyles();

  const heightClass =
    imageHeight === 'small'
      ? 'min-h-[300px]'
      : imageHeight === 'large'
        ? 'min-h-[600px]'
        : 'min-h-[450px]'; // medium or adapt

  return (
    <SectionDataProvider settings={settings}>
      <section
        className={`cms-media relative w-full ${heightClass} flex items-center justify-center overflow-hidden`}
        style={{ ...sectionStyles, ...(mediaStyles ?? {}) }}
      >
        {/* Background image or gradient */}
        {image ? (
          <div
            className='absolute inset-0 bg-cover bg-center'
            style={{ backgroundImage: `url(${image})` }}
          >
            <div className='absolute inset-0 bg-black/50' />
          </div>
        ) : (
          <div className='absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900' />
        )}

        {/* Content overlay */}
        <div
          className={`relative z-10 ${getSectionContainerClass({
            fullWidth: layout?.fullWidth,
            maxWidthClass: 'max-w-3xl',
            paddingClass: 'px-6',
          })} text-center`}
        >
          <div className='space-y-4'>
            {blocks.map((block: BlockInstance) => (
              <FrontendBlockRenderer key={block.id} block={block} />
            ))}
          </div>
          {blocks.length === 0 && (
            <EmptyState
              title='Hero section'
              description='Add content blocks here.'
              variant='compact'
              className='bg-transparent border-none'
            />
          )}
        </div>
      </section>
    </SectionDataProvider>
  );
}
