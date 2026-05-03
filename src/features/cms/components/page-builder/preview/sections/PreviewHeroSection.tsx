import { useCmsPageContext } from '@/features/cms/components/frontend/CmsPageContext';
import { useMediaStyles } from '@/features/cms/components/frontend/media-styles-context';
import { usePreviewEditorActions, usePreviewEditorState } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import { usePreviewSectionContext } from '@/features/cms/components/page-builder/preview/context/PreviewSectionContext';
import { PreviewSectionFrame } from './PreviewSectionFrame';
import { PreviewSectionMediaButton } from './PreviewSectionMediaButton';

export function PreviewHeroSection(): React.JSX.Element {
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
      </div>
    </PreviewSectionFrame>
  );
}
