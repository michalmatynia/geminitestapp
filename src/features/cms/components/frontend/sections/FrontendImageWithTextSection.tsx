'use client';


import { Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';


import { useMediaStyles } from '../media-styles-context';
import { getSectionContainerClass, getSectionStyles, getVerticalAlign, type ColorSchemeColors } from '../theme-styles';
import { FrontendBlockRenderer } from './FrontendBlockRenderer';

import type { BlockInstance } from '../../../types/page-builder';

interface FrontendImageWithTextSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean | undefined } | undefined;
}

export function FrontendImageWithTextSection({ settings, blocks, colorSchemes, layout }: FrontendImageWithTextSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const image = settings['image'] as string | undefined;
  const placement = (settings['desktopImagePlacement'] as string) || 'image-first';
  const imageFirst = placement !== 'image-second';
  const contentPosition = settings['desktopContentPosition'] as string | undefined;
  const verticalClass = getVerticalAlign(contentPosition);
  const imageHeight = (settings['imageHeight'] as string) || 'medium';
  const mediaStyles = useMediaStyles();

  const imgHeightClass =
    imageHeight === 'small' ? 'min-h-[200px]'
      : imageHeight === 'large' ? 'min-h-[500px]'
        : 'min-h-[350px]'; // medium

  return (
    <section style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
        <div className={`flex flex-col gap-8 md:gap-12 ${imageFirst ? 'md:flex-row' : 'md:flex-row-reverse'} ${verticalClass}`}>
          {/* Image */}
          <div className={`cms-media relative w-full md:w-1/2 ${imgHeightClass}`} style={mediaStyles ?? undefined}>
            {image ? (
              <Image
                src={image}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className={`flex ${imgHeightClass} w-full items-center justify-center bg-gray-800`}>
                <ImageIcon className="size-16 text-gray-600" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex w-full flex-col justify-center gap-4 md:w-1/2">
            {blocks.map((block: BlockInstance) => (
              <FrontendBlockRenderer key={block.id} block={block} />
            ))}
            {blocks.length === 0 && (
              <p className="text-gray-500">Add content blocks</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
