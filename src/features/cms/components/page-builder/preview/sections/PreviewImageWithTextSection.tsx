'use client';

import { Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import React from 'react';

import {
  getSectionContainerClass,
  getSectionStyles,
  getVerticalAlign,
} from '@/features/cms/components/frontend/theme-styles';
import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { useMediaStyles } from '@/features/cms/components/frontend/media-styles-context';
import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import { usePreviewEditor } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';
import type { BlockInstance } from '@/shared/contracts/cms';
import { EmptyState, Button } from '@/shared/ui';

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

  return wrapInspector(
    <div
      role='button'
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') handleSelect();
      }}
      style={sectionStyles}
      className={`relative w-full text-left transition cursor-pointer group ${selectedRing} cms-node-${section.id}`}
    >
      {renderSectionActions()}
      {divider}
      {showEditorChrome && onOpenMedia && (
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onOpenMedia({
              kind: 'section',
              sectionId: section.id ?? '',
              key: 'image',
            });
          }}
          className='absolute left-3 top-3 z-10 h-7 rounded-full border-border/40 bg-card/70 px-2 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100 hover:bg-card/90 hover:text-white'
        >
          Replace image
        </Button>
      )}
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
          <div className='flex w-full flex-col justify-center gap-4 md:w-1/2'>
            {section.blocks.length > 0 ? (
              <BlockContextProvider value={{ contained: true }}>
                {section.blocks.map((block: BlockInstance) => (
                  <PreviewBlockItem key={block.id} block={block} />
                ))}
              </BlockContextProvider>
            ) : showEditorChrome ? (
              <EmptyState
                title='No content'
                description='Add content blocks here.'
                variant='compact'
                className='bg-card/20'
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
