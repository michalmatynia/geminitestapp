'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import type { BlockInstance } from '@/features/cms/types/page-builder';

import { useSectionLayout } from './SectionLayoutContext';
import {
  BlockRenderContext,
  BlockSettingsContext,
  useBlockSettings as useBlockSettingsFromBlockContext,
  useRequiredBlockRenderContext,
} from '../blocks/BlockContext';
import { ButtonBlock } from '../blocks/ButtonBlock';
import { HeadingBlock } from '../blocks/HeadingBlock';
import { ImageBlock, ImageElementBlock } from '../blocks/ImageBlock';
import { InputBlock } from '../blocks/InputBlock';
import {
  AnnouncementBlock,
  DividerBlock,
  SocialLinksBlock,
  IconBlock,
  VideoEmbedBlock,
} from '../blocks/MiscellaneousBlocks';
import { ProgressBlock } from '../blocks/ProgressBlock';
import { RepeaterBlock } from '../blocks/RepeaterBlock';
import { TextAtomBlock, TextAtomLetterBlock } from '../blocks/TextAtomBlock';
import { TextBlock, TextElementBlock } from '../blocks/TextBlock';
import {
  isCmsNodeVisible,
  resolveCmsConnectedSettings,
  useOptionalCmsRuntime,
} from '../CmsRuntimeContext';
import { CssAnimationWrapper } from '../CssAnimationWrapper';
import { GsapAnimationWrapper } from '../GsapAnimationWrapper';
import { useMediaStyles } from '../media-styles-context';

const Model3DBlock = dynamic(() => import('../blocks/Model3DBlock').then(mod => mod.Model3DBlock), { ssr: false });
const AppEmbedBlock = dynamic(() => import('../blocks/AppEmbedBlock').then(mod => mod.AppEmbedBlock));
const KangurWidgetBlock = dynamic(() => import('../blocks/KangurWidgetBlock').then(mod => mod.KangurWidgetBlock));
const RichTextBlock = dynamic(() => import('../blocks/RichTextBlock').then(mod => mod.RichTextBlock));


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
    case 'Repeater':
      return <RepeaterBlock />;
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
