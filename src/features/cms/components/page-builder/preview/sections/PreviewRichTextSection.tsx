'use client';

import React from 'react';

import {
  getSectionContainerClass,
  getSectionStyles,
} from '@/features/cms/components/frontend/theme-styles';
import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import { usePreviewEditor } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';
import type { BlockInstance } from '@/shared/contracts/cms';
import { EmptyState } from '@/shared/ui';

export function PreviewRichTextSection() {
  const { colorSchemes, layout } = useCmsPageContext();
  const { 
    section,
    selectedRing,
    renderSectionActions,
    divider,
    wrapInspector,
    handleSelect,
    PreviewBlockItem,
  } = usePreviewSectionContext();

  const { 
    inspectorSettings, 
    onOpenMedia,
  } = usePreviewEditor();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
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
          className='absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100 hover:text-white hover:bg-gray-900/90'
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
            <EmptyState
              title='Rich text section'
              description='Add content blocks here.'
              variant='compact'
              className='bg-card/20'
            />
          )}
        </div>
      </div>
    </div>,
  );
}
