'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import type { PreviewBlockItemProps as FrontendBlockRendererProps } from '@/shared/contracts/cms';

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

function BlockContent(): React.JSX.Element | null {
  const { block } = useRequiredBlockRenderContext();
  
  if (isTextBlock(block.type)) return <TextBlockComponents type={block.type} />;
  if (isImageBlock(block.type)) return <ImageBlockComponents type={block.type} />;
  if (isInteractiveBlock(block.type)) return <InteractiveBlockComponents type={block.type} />;
  if (isMediaBlock(block.type)) return <MediaBlockComponents type={block.type} />;

  return null;
}

function isTextBlock(type: string): boolean {
  return ['Heading', 'Text', 'TextElement', 'TextAtom', 'TextAtomLetter', 'RichText'].includes(type);
}

function TextBlockComponents({ type }: { type: string }): React.JSX.Element | null {
  switch (type) {
    case 'Heading': return <HeadingBlock />;
    case 'Text': return <TextBlock />;
    case 'TextElement': return <TextElementBlock />;
    case 'TextAtom': return <TextAtomBlock />;
    case 'TextAtomLetter': return <TextAtomLetterBlock />;
    case 'RichText': return <RichTextBlock />;
    default: return null;
  }
}

function isImageBlock(type: string): boolean {
  return ['ImageElement', 'Image'].includes(type);
}

function ImageBlockComponents({ type }: { type: string }): React.JSX.Element | null {
  switch (type) {
    case 'ImageElement': return <ImageElementBlock />;
    case 'Image': return <ImageBlock />;
    default: return null;
  }
}

function isInteractiveBlock(type: string): boolean {
  return ['Announcement', 'Button', 'Input', 'Progress', 'Repeater', 'AppEmbed', 'KangurWidget'].includes(type);
}

function InteractiveBlockComponents({ type }: { type: string }): React.JSX.Element | null {
  switch (type) {
    case 'Announcement': return <AnnouncementBlock />;
    case 'Button': return <ButtonBlock />;
    case 'Input': return <InputBlock />;
    case 'Progress': return <ProgressBlock />;
    case 'Repeater': return <RepeaterBlock />;
    case 'AppEmbed': return <AppEmbedBlock />;
    case 'KangurWidget': return <KangurWidgetBlock />;
    default: return null;
  }
}

function isMediaBlock(type: string): boolean {
  return ['Model3D', 'VideoEmbed', 'Divider', 'SocialLinks', 'Icon'].includes(type);
}

function MediaBlockComponents({ type }: { type: string }): React.JSX.Element | null {
  switch (type) {
    case 'Model3D': return <Model3DBlock />;
    case 'VideoEmbed': return <VideoEmbedBlock />;
    case 'Divider': return <DividerBlock />;
    case 'SocialLinks': return <SocialLinksBlock />;
    case 'Icon': return <IconBlock />;
    default: return null;
  }
}
