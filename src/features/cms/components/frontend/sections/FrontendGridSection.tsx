'use client';

import Image from 'next/image';
import { Fragment } from 'react';

import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import { buildScopedCustomCss, getCustomCssSelector } from '@/features/cms/utils/custom-css';


import { getSectionContainerClass, getSectionStyles, getTextAlign } from '../theme-styles';
import { FrontendBlockRenderer, BlockSettingsContext } from './FrontendBlockRenderer';
import { FrontendCarousel } from './FrontendCarousel';
import { FrontendHeroBlock } from './FrontendHeroBlock';
import { FrontendImageWithTextBlock } from './FrontendImageWithTextBlock';
import { FrontendSlideshowSection } from './FrontendSlideshowSection';
import { SectionBlockProvider, useSectionBlockData } from './SectionBlockContext';
import { SectionDataProvider, useSectionData } from './SectionDataContext';
import { SectionLayoutProvider, useSectionLayout } from './SectionLayoutContext';
import { useCmsPageContext } from '../CmsPageContext';
import { CssAnimationWrapper } from '../CssAnimationWrapper';
import { GsapAnimationWrapper } from '../GsapAnimationWrapper';

import type { BlockInstance } from '../../../types/page-builder';


// Section-type blocks that need special rendering inside columns
const SECTION_BLOCK_TYPES = new Set(['ImageWithText', 'Hero', 'RichText', 'Block', 'TextAtom', 'Carousel', 'Slideshow']);

const getGapClass = (gap?: string): string => {
  if (gap === 'none') return 'gap-0';
  if (gap === 'small') return 'gap-4';
  if (gap === 'large') return 'gap-12';
  return 'gap-8';
};

const resolveGapValue = (gap: unknown, fallback: string): string => {
  if (typeof gap === 'string' && gap !== 'inherit') return gap;
  return fallback;
};

const getGapStyle = (gapPx: unknown): React.CSSProperties | undefined => {
  if (typeof gapPx === 'number' && Number.isFinite(gapPx) && gapPx > 0) {
    return { gap: `${gapPx}px` };
  }
  return undefined;
};

const resolveJustifyContent = (value: unknown): React.CSSProperties['justifyContent'] | undefined => {
  if (value === 'center') return 'center';
  if (value === 'end') return 'flex-end';
  if (value === 'space-between') return 'space-between';
  if (value === 'space-around') return 'space-around';
  if (value === 'space-evenly') return 'space-evenly';
  if (value === 'start') return 'flex-start';
  return undefined;
};

const resolveAlignItems = (value: unknown): React.CSSProperties['alignItems'] | undefined => {
  if (value === 'center') return 'center';
  if (value === 'end') return 'flex-end';
  if (value === 'stretch') return 'stretch';
  if (value === 'start') return 'flex-start';
  return undefined;
};

const DEFAULT_BLOCK_MIN_HEIGHT: Record<string, number> = {
  Heading: 48,
  Text: 64,
  TextElement: 32,
  TextAtom: 48,
  Announcement: 32,
  Button: 44,
  ImageElement: 140,
  Image: 140,
  VideoEmbed: 160,
  Divider: 12,
  SocialLinks: 40,
  Icon: 40,
  AppEmbed: 180,
  RichText: 140,
  ImageWithText: 200,
  Hero: 240,
  Block: 0,
};

const getBlockMinHeight = (type: string): number => DEFAULT_BLOCK_MIN_HEIGHT[type] ?? 40;

function buildImageElementPresentation(
  settings: Record<string, unknown>
): {
  wrapperStyles: React.CSSProperties;
  imageStyles: React.CSSProperties;
  overlayStyles: React.CSSProperties;
  hasOverlay: boolean;
  useFill: boolean;
} {
  const width = (settings['width'] as number) || 100;
  const height = (settings['height'] as number) || 0;
  const aspectRatio = (settings['aspectRatio'] as string) || 'auto';
  const objectFit = (settings['objectFit'] as React.CSSProperties['objectFit']) || 'cover';
  const objectPosition = resolveObjectPosition((settings['objectPosition'] as string) || 'center');
  const opacity = clampNumber(settings['opacity'], 0, 100, 100);
  const blur = clampNumber(settings['blur'], 0, 20, 0);
  const grayscale = clampNumber(settings['grayscale'], 0, 100, 0);
  const brightness = clampNumber(settings['brightness'], 0, 200, 100);
  const contrast = clampNumber(settings['contrast'], 0, 200, 100);
  const scale = clampNumber(settings['scale'], 50, 200, 100);
  const rotate = clampNumber(settings['rotate'], -180, 180, 0);
  const shape = (settings['shape'] as string) || 'none';
  const borderRadius = (settings['borderRadius'] as number) || 0;
  const borderWidth = (settings['borderWidth'] as number) || 0;
  const borderStyle = (settings['borderStyle'] as string) || 'solid';
  const borderColor = (settings['borderColor'] as string) || '#ffffff';
  const overlayType = (settings['overlayType'] as string) || 'none';
  const overlayColor = (settings['overlayColor'] as string) || '#000000';
  const overlayOpacity = clampNumber(settings['overlayOpacity'], 0, 100, 0) / 100;
  const overlayGradientFrom = (settings['overlayGradientFrom'] as string) || '#000000';
  const overlayGradientTo = (settings['overlayGradientTo'] as string) || '#ffffff';
  const overlayGradientDirection = (settings['overlayGradientDirection'] as string) || 'to-bottom';
  const transparencyMode = (settings['transparencyMode'] as string) || 'none';
  const transparencyDirection = (settings['transparencyDirection'] as string) || 'bottom';
  const transparencyStrength = clampNumber(settings['transparencyStrength'], 0, 100, 0);

  const wrapperStyles: React.CSSProperties = {
    width: `${width}%`,
  };
  if (height > 0) wrapperStyles.height = `${height}px`;
  if (aspectRatio !== 'auto') wrapperStyles.aspectRatio = aspectRatio;
  if (borderWidth > 0 && borderStyle !== 'none') {
    wrapperStyles.borderWidth = `${borderWidth}px`;
    wrapperStyles.borderStyle = borderStyle;
    wrapperStyles.borderColor = borderColor;
  }
  if (shape === 'circle') {
    wrapperStyles.borderRadius = '9999px';
    wrapperStyles.overflow = 'hidden';
  } else if (shape === 'rounded' && borderRadius > 0) {
    wrapperStyles.borderRadius = `${borderRadius}px`;
    wrapperStyles.overflow = 'hidden';
  }

  const shadow = settings['imageShadow'] as Record<string, unknown> | undefined;
  if (shadow) {
    const x = (shadow['x'] as number) ?? 0;
    const y = (shadow['y'] as number) ?? 0;
    const blurShadow = (shadow['blur'] as number) ?? 0;
    const spread = (shadow['spread'] as number) ?? 0;
    const color = shadow['color'] as string | undefined;
    if ((x || y || blurShadow || spread) && color) {
      wrapperStyles.boxShadow = `${x}px ${y}px ${blurShadow}px ${spread}px ${color}`;
    }
  }

  Object.assign(wrapperStyles, buildTransparencyMaskStyles(transparencyMode, transparencyDirection, transparencyStrength));

  const filters: string[] = [];
  if (blur > 0) filters.push(`blur(${blur}px)`);
  if (grayscale > 0) filters.push(`grayscale(${grayscale / 100})`);
  if (brightness !== 100) filters.push(`brightness(${brightness / 100})`);
  if (contrast !== 100) filters.push(`contrast(${contrast / 100})`);

  const transforms: string[] = [];
  if (scale !== 100) transforms.push(`scale(${scale / 100})`);
  if (rotate !== 0) transforms.push(`rotate(${rotate}deg)`);

  const imageStyles: React.CSSProperties = {
    width: '100%',
    objectFit,
    objectPosition,
    opacity: opacity / 100,
    filter: filters.length ? filters.join(' ') : undefined,
    transform: transforms.length ? transforms.join(' ') : undefined,
  };

  const overlayStyles: React.CSSProperties = {};
  if (overlayType === 'solid') {
    overlayStyles.backgroundColor = overlayColor;
    overlayStyles.opacity = overlayOpacity;
  } else if (overlayType === 'gradient') {
    overlayStyles.backgroundImage = `linear-gradient(${resolveGradientDirection(overlayGradientDirection)}, ${overlayGradientFrom}, ${overlayGradientTo})`;
    overlayStyles.opacity = overlayOpacity;
  }
  if (wrapperStyles.borderRadius) {
    overlayStyles.borderRadius = wrapperStyles.borderRadius as string;
  }

  return {
    wrapperStyles,
    imageStyles,
    overlayStyles,
    hasOverlay: overlayType !== 'none',
    useFill: height > 0 || aspectRatio !== 'auto',
  };
}

function renderBackgroundImageLayer(settings?: Record<string, unknown>): React.ReactNode {
  if (!settings) return null;
  const src = (settings['src'] as string) || '';
  if (!src) return null;
  const alt = (settings['alt'] as string) || '';
  const presentation = buildImageElementPresentation(settings);
  const wrapperStyles: React.CSSProperties = {
    ...presentation.wrapperStyles,
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  };
  delete (wrapperStyles as { aspectRatio?: string }).aspectRatio;
  const imageStyles: React.CSSProperties = {
    ...presentation.imageStyles,
    display: 'block',
  };
  // Remove height/width when using fill - Next.js Image handles these automatically
  delete (imageStyles as { height?: string | number }).height;
  delete (imageStyles as { width?: string | number }).width;

  return (
    <div className='absolute inset-0 z-0' style={wrapperStyles}>
      <Image src={src} alt={alt} fill style={imageStyles} />
      {presentation.hasOverlay && (
        <div className='pointer-events-none absolute inset-0' style={presentation.overlayStyles} />
      )}
    </div>
  );
}

// Helper to check if an ImageElement is in background mode for a specific target
function isBackgroundModeImage(block: BlockInstance, target: 'grid' | 'row' | 'column'): boolean {
  if (block.type !== 'ImageElement') return false;
  const backgroundTarget = (block.settings?.['backgroundTarget'] as string) || 'none';
  return backgroundTarget === target;
}

// Collect all ImageElements from a block tree that have a specific background target
function collectBackgroundImages(blocks: BlockInstance[], target: 'grid' | 'row' | 'column'): BlockInstance[] {
  const result: BlockInstance[] = [];
  for (const block of blocks) {
    if (isBackgroundModeImage(block, target)) {
      result.push(block);
    }
    // Also check children for grid backgrounds (they could be nested in rows/columns)
    if (target === 'grid' && block.blocks) {
      result.push(...collectBackgroundImages(block.blocks, target));
    }
  }
  return result;
}

export function FrontendGridSection(): React.ReactNode {
  const { sectionId, settings, blocks } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const sectionSelector = sectionId ? getCustomCssSelector(sectionId) : null;
  const sectionCustomCss = buildScopedCustomCss(settings['customCss'], sectionSelector);
  const rowBlocks = blocks.filter((b: BlockInstance) => b.type === 'Row');
  const directColumns = blocks.filter((b: BlockInstance) => b.type === 'Column');
  // Legacy: ImageElements directly in grid that don't have background mode set
  const gridImageBlocks = blocks.filter((b: BlockInstance) => b.type === 'ImageElement' && !isBackgroundModeImage(b, 'grid') && !isBackgroundModeImage(b, 'row') && !isBackgroundModeImage(b, 'column'));
  // New: Collect all ImageElements with backgroundTarget: "grid" from entire block tree
  const gridBackgroundModeImages = collectBackgroundImages(blocks, 'grid');
  const sectionGap = (settings['gap'] as string) || 'medium';
  const rowGapSetting = settings['rowGap'] as string | undefined;
  const columnGapSetting = settings['columnGap'] as string | undefined;
  const rowGapValue = resolveGapValue(rowGapSetting, sectionGap);
  const columnGapValue = resolveGapValue(columnGapSetting, sectionGap);
  const sectionGapClass = getGapClass(rowGapValue);
  const sectionGapStyle = getGapStyle(settings['rowGapPx']);
  const columnGapPx =
    typeof settings['columnGapPx'] === 'number' && Number.isFinite(settings['columnGapPx'])
      ? settings['columnGapPx']
      : 0;
  const gridBackgroundSettings = settings['backgroundImage'] as Record<string, unknown> | undefined;
  const hasGridBackgroundSetting = Boolean((gridBackgroundSettings?.['src'] as string) || '');
  const hasGridBackgroundLayers = gridImageBlocks.length > 0 || gridBackgroundModeImages.length > 0;
  const hasGridBackground = hasGridBackgroundSetting || hasGridBackgroundLayers;

  const rowsToRender: BlockInstance[] =
    rowBlocks.length > 0
      ? rowBlocks
      : directColumns.length > 0
        ? [{ id: 'row-virtual', type: 'Row', settings: {}, blocks: directColumns }]
        : [];

  if (rowsToRender.length === 0) return null;

  return (
    <SectionDataProvider settings={settings}>
      <section
        style={sectionStyles}
        className={`relative${sectionId ? ` cms-node-${sectionId}` : ''} ${hasGridBackground ? 'overflow-hidden' : ''}`}
      >
        {sectionCustomCss ? <style data-cms-custom-css={sectionId}>{sectionCustomCss}</style> : null}
        {/* Legacy: ImageElements directly in grid without background mode */}
        {gridImageBlocks.map((block: BlockInstance) => (
          <Fragment key={`grid-background-${block.id}`}>
            {renderBackgroundImageLayer(block.settings)}
          </Fragment>
        ))}
        {/* New: ImageElements with backgroundTarget: "grid" */}
        {gridBackgroundModeImages.map((block: BlockInstance) => (
          <Fragment key={`grid-bg-mode-${block.id}`}>
            {renderBackgroundImageLayer(block.settings)}
          </Fragment>
        ))}
        {hasGridBackgroundSetting && renderBackgroundImageLayer(gridBackgroundSettings)}
        <div className='relative z-10'>
          <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
            <div className={`flex flex-col ${sectionGapClass}`} style={sectionGapStyle}>
              {rowsToRender.map((row: BlockInstance, rowIndex: number) => {
                const rowChildren = row.blocks ?? [];

                // If no children at all, skip
                if (rowChildren.length === 0) return null;

                // Collect row background mode images from this row's children
                const rowBackgroundModeImages = collectBackgroundImages(rowChildren, 'row');

                const rowGapValue = resolveGapValue(row.settings?.['gap'], columnGapValue);
                const rowGapClass = getGapClass(rowGapValue);
                const rowGapPxRaw = row.settings?.['gapPx'];
                const rowGapPx =
                  typeof rowGapPxRaw === 'number' && Number.isFinite(rowGapPxRaw) && rowGapPxRaw > 0
                    ? rowGapPxRaw
                    : columnGapPx;
                const rowGapStyle = getGapStyle(rowGapPx);
                const rowJustify = resolveJustifyContent(row.settings?.['justifyContent']);
                const rowAlign = resolveAlignItems(row.settings?.['alignItems']);
                const rowWrap = (row.settings?.['wrap'] as string) || 'wrap';
                const rowStyles = getSectionStyles(row.settings ?? {}, colorSchemes);
                const rowHeightMode = (row.settings?.['heightMode'] as string) || 'inherit';
                const rowHeight = (row.settings?.['height'] as number) || 0;
                const rowHeightStyle =
                  rowHeightMode === 'fixed' && rowHeight > 0 ? { height: `${rowHeight}px` } : undefined;
                const rowBackgroundSettings = row.settings?.['backgroundImage'] as Record<string, unknown> | undefined;
                const hasRowBackgroundSetting = Boolean((rowBackgroundSettings?.['src'] as string) || '');
                const hasRowBackgroundMode = rowBackgroundModeImages.length > 0;
                const hasRowBackground = hasRowBackgroundSetting || hasRowBackgroundMode;
                const rowSelector = getCustomCssSelector(row.id);
                const rowCustomCss = buildScopedCustomCss(row.settings?.['customCss'], rowSelector);

                // Direction setting: horizontal (side by side) or vertical (stacked)
                const direction = (row.settings?.['direction'] as string) || 'horizontal';
                const isVertical = direction === 'vertical';
                const rowWrapClass = !isVertical
                  ? rowWrap === 'nowrap'
                    ? 'flex-nowrap'
                    : 'flex-wrap'
                  : '';

                return (
                  <BlockSettingsContext.Provider key={`grid-row-${row.id}-${rowIndex}`} value={row.settings ?? {}}>
                    <CssAnimationWrapper>
                      <div
                        className={`relative cms-node-${row.id} ${hasRowBackground ? 'overflow-hidden' : ''}`}
                        style={{ ...rowStyles, ...(rowHeightStyle ?? {}) }}
                      >
                        {rowCustomCss ? <style data-cms-custom-css={row.id}>{rowCustomCss}</style> : null}
                        {/* Row background mode images */}
                        {rowBackgroundModeImages.map((block: BlockInstance) => (
                          <Fragment key={`row-bg-mode-${block.id}`}>
                            {renderBackgroundImageLayer(block.settings)}
                          </Fragment>
                        ))}
                        {hasRowBackgroundSetting && renderBackgroundImageLayer(rowBackgroundSettings)}
                        <div
                          className={`relative z-10 flex ${isVertical ? 'flex-col' : 'flex-row'} ${rowWrapClass} ${rowGapClass}`}
                          style={{
                            ...(rowHeightMode === 'fixed' && rowHeight > 0 ? { height: '100%' } : {}),
                            ...(rowGapStyle ?? {}),
                            ...(rowJustify ? { justifyContent: rowJustify } : {}),
                            ...(rowAlign ? { alignItems: rowAlign } : {}),
                          }}
                        >
                          {/* Render all children in order, handling columns and direct elements */}
                          {rowChildren.map((child: BlockInstance) => {
                            // Skip ImageElements that are in background mode (grid or row)
                            if (child.type === 'ImageElement') {
                              const bgTarget = (child.settings?.['backgroundTarget'] as string) || 'none';
                              if (bgTarget === 'grid' || bgTarget === 'row') return null;
                            }

                            if (child.type === 'Column') {
                              // Columns get flex-1 to share space equally when horizontal
                              return (
                                <div key={child.id} className={isVertical ? 'w-full' : 'flex-1 min-w-0'}>
                                  <SectionLayoutProvider
                                    rowHeightMode={rowHeightMode}
                                    rowHeight={rowHeight}
                                  >
                                    <ColumnRenderer column={child} />
                                  </SectionLayoutProvider>
                                </div>
                              );
                            }
                            // Direct elements in row (not inside a column)
                            const minHeight = getBlockMinHeight(child.type);
                            const wrapperStyle: React.CSSProperties = {
                              minHeight: `${minHeight}px`,
                              position: 'relative',
                            };
                            if (SECTION_BLOCK_TYPES.has(child.type)) {
                              return (
                                <div key={child.id} className={isVertical ? 'w-full' : ''} style={wrapperStyle}>
                                  <SectionLayoutProvider
                                    rowHeightMode={rowHeightMode}
                                    rowHeight={rowHeight}
                                  >
                                    <SectionBlockRenderer block={child} />
                                  </SectionLayoutProvider>
                                </div>
                              );
                            }
                            return (
                              <div key={child.id} className={isVertical ? 'w-full' : ''} style={wrapperStyle}>
                                <SectionLayoutProvider
                                  rowHeightMode={rowHeightMode}
                                  rowHeight={rowHeight}
                                >
                                  <FrontendBlockRenderer block={child} />
                                </SectionLayoutProvider>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CssAnimationWrapper>
                  </BlockSettingsContext.Provider>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </SectionDataProvider>
  );
}

// ---------------------------------------------------------------------------
// Column renderer
// ---------------------------------------------------------------------------

function ColumnRenderer({
  column,
}: {
  column: BlockInstance;
}): React.ReactNode {
  const children = column.blocks ?? [];
  const { colorSchemes } = useSectionData();
  const { rowHeightMode, rowHeight } = useSectionLayout();

  // Collect column background mode images
  const columnBackgroundModeImages = children.filter((b: BlockInstance) => isBackgroundModeImage(b, 'column'));
  // Filter out all background mode images from regular rendering
  const contentChildren = children.filter((b: BlockInstance) => {
    if (b.type !== 'ImageElement') return true;
    const bgTarget = (b.settings?.['backgroundTarget'] as string) || 'none';
    return bgTarget === 'none';
  });

  const isSingleBlock = contentChildren.length === 1;
  const columnHeightMode = (column.settings['heightMode'] as string) || 'inherit';
  const columnHeight = (column.settings['height'] as number) || 0;
  const shouldStretch = isSingleBlock && (columnHeightMode === 'fixed' || rowHeightMode === 'fixed');
  const columnBackgroundSettings = column.settings['backgroundImage'] as Record<string, unknown> | undefined;
  const hasColumnBackgroundSetting = Boolean((columnBackgroundSettings?.['src'] as string) || '');
  const hasColumnBackgroundMode = columnBackgroundModeImages.length > 0;
  const hasColumnBackground = hasColumnBackgroundSetting || hasColumnBackgroundMode;
  const columnGapValue = resolveGapValue(column.settings?.['gap'], 'medium');
  const columnGapClass = shouldStretch ? '' : getGapClass(columnGapValue);
  const columnGapStyle = shouldStretch ? undefined : getGapStyle(column.settings?.['gapPx']);
  const columnJustify = resolveJustifyContent(column.settings?.['justifyContent']);
  const columnAlign = resolveAlignItems(column.settings?.['alignItems']);
  const columnSelector = getCustomCssSelector(column.id);
  const columnCustomCss = buildScopedCustomCss(column.settings?.['customCss'], columnSelector);
  const columnStyles = {
    ...getSectionStyles(column.settings ?? {}, colorSchemes),
    ...getTextAlign(column.settings?.['textAlign']),
  };
  const columnStyle: React.CSSProperties = {};
  if (columnHeightMode === 'fixed' && columnHeight > 0) {
    columnStyle.height = `${columnHeight}px`;
  } else if (rowHeightMode === 'fixed' && rowHeight && rowHeight > 0) {
    columnStyle.height = '100%';
  }

  return (
    <BlockSettingsContext.Provider value={column.settings}>
      <GsapAnimationWrapper>
        <CssAnimationWrapper>
          <div
            className={`relative cms-node-${column.id} ${hasColumnBackground ? 'overflow-hidden' : ''}`}
            style={{ ...columnStyles, ...columnStyle }}
          >
            {columnCustomCss ? <style data-cms-custom-css={column.id}>{columnCustomCss}</style> : null}
            {/* Column background mode images */}
            {columnBackgroundModeImages.map((block: BlockInstance) => (
              <Fragment key={`col-bg-mode-${block.id}`}>
                {renderBackgroundImageLayer(block.settings)}
              </Fragment>
            ))}
            {hasColumnBackgroundSetting && renderBackgroundImageLayer(columnBackgroundSettings)}
            <div
              className={`relative z-10 flex flex-col ${shouldStretch ? 'h-full' : columnGapClass}`}
              style={{
                ...(columnGapStyle ?? {}),
                ...(columnJustify ? { justifyContent: columnJustify } : {}),
                ...(columnAlign ? { alignItems: columnAlign } : {}),
              }}
            >
              {contentChildren.map((block: BlockInstance, blockIndex: number) => {
                const minHeight = getBlockMinHeight(block.type);
                const wrapperStyle: React.CSSProperties = {
                  ...(shouldStretch ? { height: '100%' } : { minHeight: `${minHeight}px` }),
                  position: 'relative',
                  zIndex: contentChildren.length - blockIndex,
                };
                if (SECTION_BLOCK_TYPES.has(block.type)) {
                  return (
                    <div key={block.id} className={shouldStretch ? 'flex-1' : ''} style={wrapperStyle}>
                      <SectionLayoutProvider stretch={shouldStretch}>
                        <SectionBlockRenderer block={block} />
                      </SectionLayoutProvider>
                    </div>
                  );
                }
                return (
                  <div key={block.id} className={shouldStretch ? 'flex-1' : ''} style={wrapperStyle}>
                    <SectionLayoutProvider stretch={shouldStretch}>
                      <FrontendBlockRenderer block={block} />
                    </SectionLayoutProvider>
                  </div>
                );
              })}
            </div>
          </div>
        </CssAnimationWrapper>
      </GsapAnimationWrapper>
    </BlockSettingsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Section-type block renderer (ImageWithText, Hero inside columns)
// ---------------------------------------------------------------------------

function SectionBlockRenderer({
  block,
}: {
  block: BlockInstance;
}): React.ReactNode {
  const children = block.blocks ?? [];
  const { stretch } = useSectionLayout();
  const stretchClass = stretch ? 'h-full' : '';
  const stretchStyle = stretch ? { height: '100%' } : undefined;
  const allowInlineCustomCss = block.type !== 'Block';
  const inlineCustomCss = allowInlineCustomCss ? block.settings['customCss'] : undefined;
  const inlineCustomNodeId = allowInlineCustomCss ? block.id : '';
  const { colorSchemes } = useSectionData();

  const wrapInline = (node: React.ReactNode): React.ReactNode => (
    <EventEffectsWrapper
      settings={block.settings}
      {...(inlineCustomNodeId ? { nodeId: inlineCustomNodeId } : {})}
      {...(inlineCustomCss !== undefined ? { customCss: inlineCustomCss } : {})}
    >
      {node}
    </EventEffectsWrapper>
  );
  const wrapEventsOnly = (node: React.ReactNode): React.ReactNode => (
    <EventEffectsWrapper settings={block.settings}>{node}</EventEffectsWrapper>
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
    <BlockSettingsContext.Provider value={block.settings}>
      <SectionBlockProvider settings={block.settings} blocks={children}>
        {content}
      </SectionBlockProvider>
    </BlockSettingsContext.Provider>
  );
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function resolveObjectPosition(value: string): string {
  const map: Record<string, string> = {
    center: 'center',
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
    'top-left': 'left top',
    'top-right': 'right top',
    'bottom-left': 'left bottom',
    'bottom-right': 'right bottom',
  };
  return map[value] ?? 'center';
}

function resolveGradientDirection(value: string): string {
  const map: Record<string, string> = {
    'to-top': 'to top',
    'to-bottom': 'to bottom',
    'to-left': 'to left',
    'to-right': 'to right',
    'to-top-left': 'to top left',
    'to-top-right': 'to top right',
    'to-bottom-left': 'to bottom left',
    'to-bottom-right': 'to bottom right',
  };
  return map[value] ?? 'to bottom';
}

function buildTransparencyMaskStyles(
  mode: string,
  direction: string,
  strength: number
): React.CSSProperties {
  if (mode !== 'gradient' || strength <= 0) return {};
  const dirMap: Record<string, string> = {
    top: 'to bottom',
    bottom: 'to top',
    left: 'to right',
    right: 'to left',
    'top-left': 'to bottom right',
    'top-right': 'to bottom left',
    'bottom-left': 'to top right',
    'bottom-right': 'to top left',
  };
  const dir = dirMap[direction] ?? 'to bottom';
  const stop = Math.min(100, Math.max(0, strength));
  const gradient = `linear-gradient(${dir}, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${stop}%, rgba(0,0,0,1) 100%)`;
  return {
    WebkitMaskImage: gradient,
    maskImage: gradient,
  };
}
