'use client';

import React from 'react';
import { usePreviewEditor } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import {
  getSectionContainerClass,
  getSectionStyles,
  type ColorSchemeColors,
} from '@/features/cms/components/frontend/theme-styles';
import type { BlockInstance, SectionInstance } from '@/features/cms/types/page-builder';

interface PreviewRichTextSectionProps {
  section: SectionInstance;
  colorSchemes?: Record<string, ColorSchemeColors>;
  mediaStyles?: React.CSSProperties | null;
  selectedRing: string;
  renderSectionActions: () => React.ReactNode;
  divider: React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
  handleSelect: () => void;
  PreviewBlockItem: React.ComponentType<{ block: BlockInstance }>;
  layout?: { fullWidth?: boolean };
}

export function PreviewRichTextSection({
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
}: PreviewRichTextSectionProps) {
  const { 
    inspectorSettings, 
    onOpenMedia,
    showEditorChrome: globalShowEditorChrome 
  } = usePreviewEditor();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? globalShowEditorChrome ?? false;
  const sectionStyles = getSectionStyles(section.settings, colorSchemes);

  return wrapInspector(
    <div
      role='button'
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') handleSelect();
      }}
      style={sectionStyles}
      className={`relative group w-full text-left transition cursor-pointer ${selectedRing} cms-node-${section.id}`}
    >
      {renderSectionActions()}
      {showEditorChrome && onOpenMedia && (
        <button
          type='button'
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onOpenMedia({
              kind: 'section',
              sectionId: section.id ?? '',
              key: 'src',
            });
          }}
          className='absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100'
        >
          Replace image
        </button>
      )}
      {divider}
      <div
        className={getSectionContainerClass({
          fullWidth: layout?.fullWidth,
          maxWidthClass: 'max-w-3xl',
        })}
      >
        <div className='space-y-4'>
          <BlockContextProvider value={{ contained: true }}>
            {section.blocks.map((block: BlockInstance) => (
              <PreviewBlockItem key={block.id} block={block} />
            ))}
          </BlockContextProvider>
          {showEditorChrome && section.blocks.length === 0 && (
            <p className='text-gray-500'>Rich text section</p>
          )}
        </div>
      </div>
    </div>,
  );
}
