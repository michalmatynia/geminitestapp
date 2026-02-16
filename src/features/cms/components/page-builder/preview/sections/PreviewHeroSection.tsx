'use client';

import React from 'react';

import {
  getSectionContainerClass,
  getSectionStyles,
  type ColorSchemeColors,
} from '@/features/cms/components/frontend/theme-styles';
import type { BlockInstance, SectionInstance } from '@/features/cms/types/page-builder';
import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import { usePreviewEditor } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';

interface PreviewHeroSectionProps {
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

export function PreviewHeroSection({
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
}: PreviewHeroSectionProps) {
  const { 
    inspectorSettings, 
    onOpenMedia,
  } = usePreviewEditor();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const sectionStyles = getSectionStyles(section.settings, colorSchemes);
  const sectionImage = section.settings['image'] as string | undefined;

  const imageHeight = (section.settings['imageHeight'] as string) || 'large';
  const heightClass =
    imageHeight === 'small'
      ? 'min-h-[300px]'
      : imageHeight === 'large'
        ? 'min-h-[600px]'
        : 'min-h-[450px]';

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
          className='absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100'
        >
          Replace image
        </button>
      )}
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
          <div className='space-y-4'>
            <BlockContextProvider value={{ contained: true }}>
              {section.blocks.map((block: BlockInstance) => (
                <PreviewBlockItem key={block.id} block={block} />
              ))}
            </BlockContextProvider>
          </div>
          {section.blocks.length === 0 && (
            <p className='text-lg text-gray-400'>Hero section</p>
          )}
        </div>
      </div>
    </div>,
  );
}
