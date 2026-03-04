'use client';

import {
  getSectionContainerClass,
  getSectionStyles,
} from '@/features/cms/components/frontend/theme-styles';
import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { useMediaStyles } from '@/features/cms/components/frontend/media-styles-context';
import { usePreviewEditor } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';

import { PreviewSectionBlocks } from './PreviewSectionBlocks';
import { PreviewSectionFrame } from './PreviewSectionFrame';
import { PreviewSectionMediaButton } from './PreviewSectionMediaButton';

export function PreviewHeroSection() {
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

  const imageHeight = (section.settings['imageHeight'] as string) || 'large';
  const heightClass =
    imageHeight === 'small'
      ? 'min-h-[300px]'
      : imageHeight === 'large'
        ? 'min-h-[600px]'
        : 'min-h-[450px]';

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
