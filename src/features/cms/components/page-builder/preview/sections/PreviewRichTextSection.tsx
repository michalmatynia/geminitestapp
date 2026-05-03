import React from 'react';
import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { usePreviewEditorActions, usePreviewEditorState } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';
import { getSectionContainerClass } from '@/features/cms/public';
import { PreviewSectionFrame } from './PreviewSectionFrame';
import { PreviewSectionMediaButton } from './PreviewSectionMediaButton';

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
        {/* Note: Modularized PreviewSectionBlocks implementation here */}
      </div>
    </PreviewSectionFrame>
  );
}
