'use client';

import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';
import { useMediaStyles } from '../media-styles-context';

import type { BlockInstance } from '../../../types/page-builder';

export function FrontendImageWithTextBlock(): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const image = settings['image'] as string | undefined;
  const placement = (settings['desktopImagePlacement'] as string) || 'image-first';
  const imageFirst = placement !== 'image-second';
  const mediaStyles = useMediaStyles();

  return (
    <div className={`flex flex-col gap-4 ${imageFirst ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
      {/* Image */}
      <div className='cms-media relative w-full md:w-2/5' style={mediaStyles ?? undefined}>
        {image ? (
          <Image
            src={image}
            alt=''
            fill
            className='object-cover'
            sizes='(max-width: 768px) 100vw, 40vw'
          />
        ) : (
          <div className='flex min-h-[120px] w-full items-center justify-center bg-gray-800'>
            <ImageIcon className='size-10 text-gray-600' />
          </div>
        )}
      </div>

      {/* Content */}
      <div className='flex w-full flex-col justify-center gap-3 md:w-3/5'>
        {blocks.map((block: BlockInstance) => (
          <FrontendBlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}
