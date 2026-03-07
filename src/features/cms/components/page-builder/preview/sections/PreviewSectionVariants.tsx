'use client';

import { Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import React from 'react';

import {
  getSectionContainerClass,
  getVerticalAlign,
} from '@/features/cms/public';
import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { useMediaStyles } from '@/features/cms/components/frontend/media-styles-context';
import {
  usePreviewEditorActions,
  usePreviewEditorState,
} from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';

import { PreviewSectionBlocks } from './PreviewSectionBlocks';
import { PreviewSectionFrame } from './PreviewSectionFrame';
import { PreviewSectionMediaButton } from './PreviewSectionMediaButton';

export function PreviewHeroSection(): React.JSX.Element {
  const { layout } = useCmsPageContext();
  const mediaStyles = useMediaStyles();
  const { section, PreviewBlockItem } = usePreviewSectionContext();
  const { inspectorSettings } = usePreviewEditorState();
  const { onOpenMedia } = usePreviewEditorActions();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const sectionImage = section.settings['image'] as string | undefined;
  const imageHeight = (section.settings['imageHeight'] as string) || 'large';
  const heightClass =
    imageHeight === 'small'
      ? 'min-h-[300px]'
      : imageHeight === 'large'
        ? 'min-h-[600px]'
        : 'min-h-[450px]';

  return (
    <PreviewSectionFrame
      topSlot={
        <PreviewSectionMediaButton
          show={showEditorChrome}
          onOpenMedia={onOpenMedia}
          sectionId={section.id ?? ''}
          mediaKey='image'
        />
      }
    >
      <div
        className={`cms-media relative w-full ${heightClass} flex items-center justify-center overflow-hidden`}
        style={mediaStyles ?? undefined}
      >
        {sectionImage ? (
          <div
            className='absolute inset-0 bg-cover bg-center'
            style={{ backgroundImage: `url(${sectionImage})` }}
          >
            <div className='absolute inset-0 bg-black/50' />
          </div>
        ) : (
          <div className='absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900' />
        )}
        <div
          className={`relative z-10 ${getSectionContainerClass({
            fullWidth: layout?.fullWidth,
            maxWidthClass: 'max-w-3xl',
            paddingClass: 'px-6',
          })} text-center`}
        >
          <PreviewSectionBlocks
            blocks={section.blocks}
            PreviewBlockItem={PreviewBlockItem}
            emptyState={{
              title: 'Hero section',
              description: 'Add content blocks here.',
              className: 'bg-transparent border-none',
            }}
          />
        </div>
      </div>
    </PreviewSectionFrame>
  );
}

export function PreviewImageWithTextSection(): React.JSX.Element {
  const { layout } = useCmsPageContext();
  const mediaStyles = useMediaStyles();
  const { section, PreviewBlockItem } = usePreviewSectionContext();
  const { inspectorSettings } = usePreviewEditorState();
  const { onOpenMedia } = usePreviewEditorActions();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
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

export function PreviewRichTextSection(): React.JSX.Element {
  const { layout } = useCmsPageContext();
  const { section, PreviewBlockItem } = usePreviewSectionContext();
  const { inspectorSettings } = usePreviewEditorState();
  const { onOpenMedia } = usePreviewEditorActions();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;

  return (
    <PreviewSectionFrame
      dividerPosition='after'
      topSlot={
        <PreviewSectionMediaButton
          show={showEditorChrome}
          onOpenMedia={onOpenMedia}
          sectionId={section.id ?? ''}
          mediaKey='src'
        />
      }
    >
      <div
        className={getSectionContainerClass({
          fullWidth: layout?.fullWidth,
          maxWidthClass: 'max-w-3xl',
        })}
      >
        <PreviewSectionBlocks
          blocks={section.blocks}
          PreviewBlockItem={PreviewBlockItem}
          showEmptyState={showEditorChrome}
          emptyState={{
            title: 'Rich text section',
            description: 'Add content blocks here.',
            className: 'bg-card/20',
          }}
        />
      </div>
    </PreviewSectionFrame>
  );
}
