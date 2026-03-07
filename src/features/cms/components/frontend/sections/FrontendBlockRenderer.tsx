'use client';

import React from 'react';

import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';

import { AppEmbedBlock } from '../blocks/AppEmbedBlock';
import { ButtonBlock } from '../blocks/ButtonBlock';
import { HeadingBlock } from '../blocks/HeadingBlock';
import { ImageBlock, ImageElementBlock } from '../blocks/ImageBlock';
import { InputBlock } from '../blocks/InputBlock';
import { KangurWidgetBlock } from '../blocks/KangurWidgetBlock';
import {
  isCmsNodeVisible,
  resolveCmsConnectedSettings,
  useOptionalCmsRuntime,
} from '../CmsRuntimeContext';
import {
  AnnouncementBlock,
  DividerBlock,
  SocialLinksBlock,
  IconBlock,
  VideoEmbedBlock,
} from '../blocks/MiscellaneousBlocks';
import { Model3DBlock } from '../blocks/Model3DBlock';
import { ProgressBlock } from '../blocks/ProgressBlock';
import { RichTextBlock } from '../blocks/RichTextBlock';
import { CssAnimationWrapper } from '../CssAnimationWrapper';
import { GsapAnimationWrapper } from '../GsapAnimationWrapper';
import { useMediaStyles } from '../media-styles-context';
import { useSectionLayout } from './SectionLayoutContext';
import {
  BlockRenderContext,
  BlockSettingsContext,
  useBlockSettings as useBlockSettingsFromBlockContext,
  useRequiredBlockRenderContext,
} from '../blocks/BlockContext';
import { TextAtomBlock, TextAtomLetterBlock } from '../blocks/TextAtomBlock';
import { TextBlock, TextElementBlock } from '../blocks/TextBlock';

import type { BlockInstance } from '../../../types/page-builder';

export { BlockSettingsContext };
export const useBlockSettings = useBlockSettingsFromBlockContext;

interface FrontendBlockRendererProps {
  block: BlockInstance;
}

export function FrontendBlockRenderer({ block }: FrontendBlockRendererProps): React.ReactNode {
  const mediaStyles = useMediaStyles();
  const { stretch } = useSectionLayout();
  const runtime = useOptionalCmsRuntime();
  const resolvedSettings = React.useMemo(
    () => resolveCmsConnectedSettings(block.type, block.settings, runtime),
    [block.type, block.settings, runtime]
  );

  if (!isCmsNodeVisible(block.settings, runtime)) {
    return null;
  }

  return (
    <BlockRenderContext.Provider value={{ block, mediaStyles, stretch: stretch ?? false }}>
      <BlockSettingsContext.Provider value={resolvedSettings}>
        <GsapAnimationWrapper>
          <CssAnimationWrapper>
            <EventEffectsWrapper>
              <BlockContent />
            </EventEffectsWrapper>
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      </BlockSettingsContext.Provider>
    </BlockRenderContext.Provider>
  );
}

function BlockContent(): React.ReactNode {
  const { block } = useRequiredBlockRenderContext();
  switch (block.type) {
    case 'Heading':
      return <HeadingBlock />;
    case 'Text':
      return <TextBlock />;
    case 'TextElement':
      return <TextElementBlock />;
    case 'TextAtom':
      return <TextAtomBlock />;
    case 'TextAtomLetter':
      return <TextAtomLetterBlock />;
    case 'Announcement':
      return <AnnouncementBlock />;
    case 'Button':
      return <ButtonBlock />;
    case 'RichText':
      return <RichTextBlock />;
    case 'ImageElement':
      return <ImageElementBlock />;
    case 'Image':
      return <ImageBlock />;
    case 'Input':
      return <InputBlock />;
    case 'Progress':
      return <ProgressBlock />;
    case 'Model3D':
      return <Model3DBlock />;
    case 'VideoEmbed':
      return <VideoEmbedBlock />;
    case 'Divider':
      return <DividerBlock />;
    case 'SocialLinks':
      return <SocialLinksBlock />;
    case 'Icon':
      return <IconBlock />;
    case 'AppEmbed':
      return <AppEmbedBlock />;
    case 'KangurWidget':
      return <KangurWidgetBlock />;
    default:
      return null;
  }
}
