'use client';

import { Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import React from 'react';

import {
  getSectionContainerClass,
  getSectionStyles,
  getVerticalAlign,
  type ColorSchemeColors,
} from '@/features/cms/components/frontend/theme-styles';
import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import { usePreviewEditor } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import type { BlockInstance, SectionInstance } from '@/shared/contracts/cms';

interface PreviewImageWithTextSectionProps {
  section: SectionInstance;
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  mediaStyles?: React.CSSProperties | null | undefined;
  selectedRing: string;
  renderSectionActions: () => React.ReactNode;
  divider: React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
  handleSelect: () => void;
  PreviewBlockItem: React.ComponentType<{ block: BlockInstance }>;
  layout?: { fullWidth?: boolean } | undefined;
}

export function PreviewImageWithTextSection({
  section,
  colorSchemes,
  mediaStyles,
  selectedRing,
  renderSectionActions,
  divider,
  wrapInspector,
  handleSelect,
  PreviewBlockItem,
  layout,
}: PreviewImageWithTextSectionProps) {
  const { 
    inspectorSettings, 
    onOpenMedia,
  } = usePreviewEditor();

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
        <button
          type='button'
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onOpenMedia({
              kind: 'section',
              sectionId: section.id ?? '',
              key: 'image',
            });
          }}
          className='absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100 hover:text-white hover:bg-gray-900/90'
        >
          Replace image
        </button>
      )}
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
        <div className={`flex flex-col gap-8 md:gap-12 ${imageFirst ? 'md:flex-row' : 'md:flex-row-reverse'} ${verticalClass}`}>
          <div className={`cms-media relative w-full md:w-1/2 ${imgHeightClass}`} style={mediaStyles ?? undefined}>
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
              <div className={`flex ${imgHeightClass} w-full items-center justify-center bg-gray-800`}>
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
              <p className='text-gray-500'>Add content blocks</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>,
  );
}
