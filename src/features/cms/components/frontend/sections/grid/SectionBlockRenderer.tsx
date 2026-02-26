'use client';

import React from 'react';
import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import { GsapAnimationWrapper } from '../../GsapAnimationWrapper';
import { CssAnimationWrapper } from '../../CssAnimationWrapper';
import { FrontendImageWithTextBlock } from '../FrontendImageWithTextBlock';
import { FrontendHeroBlock } from '../FrontendHeroBlock';
import { FrontendBlockRenderer } from '../FrontendBlockRenderer';
import { FrontendCarousel } from '../FrontendCarousel';
import { FrontendSlideshowSection } from '../FrontendSlideshowSection';
import { BlockRenderContext } from '../../blocks/BlockContext';
import { BlockSettingsContext } from '../FrontendBlockRenderer';
import { SectionLayoutProvider, useSectionLayout } from '../SectionLayoutContext';
import { useSectionData } from '../SectionDataContext';
import { getSectionStyles, getTextAlign } from '../../theme-styles';
import { getCustomCssSelector, buildScopedCustomCss } from '@/features/cms/utils/custom-css';
import { resolveJustifyContent, resolveAlignItems } from './frontend-grid-utils';
import type { CmsBlockInstanceDto as BlockInstance } from '@/shared/contracts/cms';

export function SectionBlockRenderer({
  block,
}: {
  block: BlockInstance;
}): React.ReactNode {
  const children = block.blocks ?? [];
  const { stretch } = useSectionLayout();
  const stretchClass = stretch ? 'h-full' : '';
  const stretchStyle = stretch ? { height: '100%' } : undefined;
  const { colorSchemes } = useSectionData();

  const wrapInline = (node: React.ReactNode): React.ReactNode => (
    <EventEffectsWrapper>
      {node}
    </EventEffectsWrapper>
  );
  const wrapEventsOnly = (node: React.ReactNode): React.ReactNode => (
    <EventEffectsWrapper>{node}</EventEffectsWrapper>
  );

  const content = ((): React.ReactNode => {
    if (block.type === 'ImageWithText') {
      return (
        <GsapAnimationWrapper>
          <CssAnimationWrapper>
            {wrapInline(
              <div className={stretchClass} style={stretchStyle}>
                <FrontendImageWithTextBlock />
              </div>
            )}
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      );
    }
    if (block.type === 'Hero') {
      return (
        <GsapAnimationWrapper>
          <CssAnimationWrapper>
            {wrapInline(
              <div className={stretchClass} style={stretchStyle}>
                <FrontendHeroBlock />
              </div>
            )}
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      );
    }
    if (block.type === 'RichText') {
      const sectionStyles = getSectionStyles(block.settings, colorSchemes);
      return (
        <GsapAnimationWrapper>
          <CssAnimationWrapper>
            {wrapInline(
              <div style={{ ...sectionStyles, ...(stretchStyle ?? {}) }} className={stretchClass}>
                <div className='space-y-4'>
                  {children.length > 0 ? (
                    children.map((child: BlockInstance) => (
                      <SectionLayoutProvider key={child.id} stretch={false}>
                        <FrontendBlockRenderer block={child} />
                      </SectionLayoutProvider>
                    ))
                  ) : (
                    <p className='text-gray-500'>Rich text section</p>
                  )}
                </div>
              </div>
            )}
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      );
    }
    if (block.type === 'Block') {
      const sectionStyles = {
        ...getSectionStyles(block.settings, colorSchemes),
        ...getTextAlign(block.settings['contentAlignment']),
      };
      const alignment = (block.settings['contentAlignment'] as string) || 'left';
      const blockGap = typeof block.settings['blockGap'] === 'number' ? block.settings['blockGap'] : 0;
      const direction = (block.settings['layoutDirection'] as string) || 'row';
      const wrap = (block.settings['wrap'] as string) || 'wrap';
      const justifySetting = (block.settings['justifyContent'] as string) || 'inherit';
      const justifyContent =
        resolveJustifyContent(justifySetting === 'inherit' ? alignment : justifySetting) ??
        (alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start');
      const alignItems = resolveAlignItems(block.settings['alignItems']) ?? 'center';
      const flexDirClass = direction === 'column' ? 'flex-col' : 'flex-row';
      const wrapClass = direction === 'column' ? '' : wrap === 'nowrap' ? 'flex-nowrap' : 'flex-wrap';
      const shouldStretchChildren = stretch && children.length === 1;
      const linkUrl = (block.settings['linkUrl'] as string) || '';
      const linkTarget = (block.settings['linkTarget'] as string) || '_self';
      const linkRel = linkTarget === '_blank' ? 'noopener noreferrer' : undefined;
      const blockSelector = getCustomCssSelector(block.id);
      const blockCustomCss = buildScopedCustomCss(block.settings['customCss'], blockSelector);
      const innerContent = (
        <div
          className={`flex ${flexDirClass} ${wrapClass}`}
          style={{ gap: `${blockGap}px`, justifyContent, alignItems }}
        >
          {children.map((child: BlockInstance) => (
            <SectionLayoutProvider key={child.id} stretch={shouldStretchChildren}>
              <FrontendBlockRenderer block={child} />
            </SectionLayoutProvider>
          ))}
        </div>
      );
      return (
        <GsapAnimationWrapper>
          <CssAnimationWrapper>
            {wrapEventsOnly(
              <div
                style={{ ...sectionStyles, ...(stretchStyle ?? {}) }}
                className={`${stretchClass} cms-node-${block.id}`.trim()}
              >
                {blockCustomCss ? <style data-cms-custom-css={block.id}>{blockCustomCss}</style> : null}
                {linkUrl ? (
                  <a href={linkUrl} target={linkTarget} rel={linkRel} className='block w-full'>
                    {innerContent}
                  </a>
                ) : (
                  innerContent
                )}
              </div>
            )}
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      );
    }
    if (block.type === 'TextAtom') {
      const text = (block.settings['text'] as string) || '';
      const alignment = (block.settings['alignment'] as string) || 'left';
      const letterGap = (block.settings['letterGap'] as number) || 0;
      const lineGap = (block.settings['lineGap'] as number) || 0;
      const wrap = (block.settings['wrap'] as string) || 'wrap';
      const letters = (block.blocks ?? []).length
        ? (block.blocks ?? [])
        : Array.from(text).map((char: string, index: number): BlockInstance => ({
          id: `text-atom-${block.id}-${index}`,
          type: 'TextAtomLetter',
          settings: { textContent: char },
        }));

      const justifyContent =
        alignment === 'center'
          ? 'center'
          : alignment === 'right'
            ? 'flex-end'
            : 'flex-start';

      const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: wrap === 'nowrap' ? 'nowrap' : 'wrap',
        justifyContent,
        alignItems: 'baseline',
        columnGap: letterGap,
        rowGap: lineGap,
        whiteSpace: wrap === 'nowrap' ? 'pre' : 'pre-wrap',
      };

      return (
        <GsapAnimationWrapper>
          <CssAnimationWrapper>
            {wrapInline(
              <div style={{ ...containerStyle, ...(stretchStyle ?? {}) }} className={stretchClass}>
                {letters.length > 0 ? (
                  letters.map((letter: BlockInstance) => (
                    <SectionLayoutProvider key={letter.id} stretch={false}>
                      <FrontendBlockRenderer block={letter} />
                    </SectionLayoutProvider>
                  ))
                ) : (
                  <span className='text-sm text-gray-400'>Text atoms</span>
                )}
              </div>
            )}
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      );
    }
    if (block.type === 'Carousel') {
      return (
        <GsapAnimationWrapper>
          <CssAnimationWrapper>
            {wrapInline(
              <div className={stretchClass} style={stretchStyle}>
                <FrontendCarousel />
              </div>
            )}
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      );
    }
    if (block.type === 'Slideshow') {
      return (
        <GsapAnimationWrapper>
          <CssAnimationWrapper>
            {wrapInline(
              <div className={stretchClass} style={stretchStyle}>
                <FrontendSlideshowSection layout={{ fullWidth: true }} />
              </div>
            )}
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      );
    }

    return null;
  })();

  return (
    <BlockRenderContext.Provider value={{ block, mediaStyles: null, stretch }}>
      <BlockSettingsContext.Provider value={block.settings}>
        <SectionBlockProvider settings={block.settings} blocks={children}>
          {content}
        </SectionBlockProvider>
      </BlockSettingsContext.Provider>
    </BlockRenderContext.Provider>
  );
}
