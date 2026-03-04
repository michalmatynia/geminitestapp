'use client';

import {
  getSectionContainerClass,
  getSectionStyles,
} from '@/features/cms/components/frontend/theme-styles';
import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { usePreviewEditor } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';

import { PreviewSectionBlocks } from './PreviewSectionBlocks';
import { PreviewSectionFrame } from './PreviewSectionFrame';
import { PreviewSectionMediaButton } from './PreviewSectionMediaButton';

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

  const { inspectorSettings, onOpenMedia } = usePreviewEditor();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const sectionStyles = getSectionStyles(section.settings, colorSchemes);

  return (
    <PreviewSectionFrame
      sectionId={section.id}
      selectedRing={selectedRing}
      sectionStyles={sectionStyles}
      onSelect={handleSelect}
      wrapInspector={wrapInspector}
      renderSectionActions={renderSectionActions}
      divider={divider}
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
