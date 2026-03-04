'use client';

import { Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';

import {
  getSectionContainerClass,
  getSectionStyles,
  getVerticalAlign,
} from '@/features/cms/components/frontend/theme-styles';
import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { useMediaStyles } from '@/features/cms/components/frontend/media-styles-context';
import { usePreviewEditor } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';

import { PreviewSectionBlocks } from './PreviewSectionBlocks';
import { PreviewSectionFrame } from './PreviewSectionFrame';
import { PreviewSectionMediaButton } from './PreviewSectionMediaButton';

export function PreviewImageWithTextSection() {
  const { colorSchemes, layout } = useCmsPageContext();
  const mediaStyles = useMediaStyles();
  const {
    section,
    selectedRing,
    renderSectionActions,
    divider,
    wrapInspector,
    handleSelect,
    PreviewBlockItem,
  } = usePreviewSectionContext();

  const { inspectorSettings, onOpenMedia } = usePreviewEditor();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const sectionStyles = getSectionStyles(section.settings, colorSchemes);
  const sectionImage = section.settings['image'] as string | undefined;

  const placement = section.settings['desktopImagePlacement'] as string | undefined;
  const imageFirst = placement !== 'image-second';
  const contentPosition = section.settings['desktopContentPosition'] as string | undefined;
  const verticalClass = getVerticalAlign(contentPosition);
  const imageHeight = (section.settings['imageHeight'] as string) || 'medium';
  const imgHeightClass =
    imageHeight === 'small'
      ? 'min-h-[200px]'
      : imageHeight === 'large'
        ? 'min-h-[500px]'
        : 'min-h-[350px]';

  return (
    <PreviewSectionFrame
      sectionId={section.id}
      selectedRing={selectedRing}
      sectionStyles={sectionStyles}
      onSelect={handleSelect}
      wrapInspector={wrapInspector}
      renderSectionActions={renderSectionActions}
      divider={divider}
      topSlot={
        <PreviewSectionMediaButton
          show={showEditorChrome}
          onOpenMedia={onOpenMedia}
          sectionId={section.id ?? ''}
          mediaKey='image'
          className='bg-card/70 hover:bg-card/90'
        />
      }
    >
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
        <div
          className={`flex flex-col gap-8 md:gap-12 ${imageFirst ? 'md:flex-row' : 'md:flex-row-reverse'} ${verticalClass}`}
        >
          <div
            className={`cms-media relative w-full md:w-1/2 ${imgHeightClass}`}
            style={mediaStyles ?? undefined}
          >
            {sectionImage ? (
              <NextImage
                src={sectionImage}
                alt=''
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 50vw'
                unoptimized
              />
            ) : showEditorChrome ? (
              <div
                className={`flex ${imgHeightClass} w-full items-center justify-center bg-card/40`}
              >
                <ImageIcon className='size-16 text-gray-600' />
              </div>
            ) : null}
          </div>
          <div className='flex w-full flex-col justify-center md:w-1/2'>
            <PreviewSectionBlocks
              blocks={section.blocks}
              PreviewBlockItem={PreviewBlockItem}
              showEmptyState={showEditorChrome}
              emptyState={{
                title: 'No content',
                description: 'Add content blocks here.',
                className: 'bg-card/20',
              }}
            />
          </div>
        </div>
      </div>
    </PreviewSectionFrame>
  );
}
