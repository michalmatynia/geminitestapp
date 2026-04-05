import React from 'react';

import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import type { BlockInstance } from '@/features/cms/types/page-builder';
import { buildScopedCustomCss, getCustomCssSelector } from '@/features/cms/utils/custom-css';

import { getSectionContainerClass, getSectionStyles } from '../theme-styles';
import { FrontendBlockRenderer, BlockSettingsContext } from './FrontendBlockRenderer';
import { BackgroundImageLayer } from './grid/BackgroundImageLayer';
import { ColumnRenderer } from './grid/ColumnRenderer';
import {
  SECTION_BLOCK_TYPES,
  getBlockMinHeight,
  getGapClass,
  getGapStyle,
  resolveGapValue,
  resolveJustifyContent,
  resolveAlignItems,
} from './grid/frontend-grid-utils';
import { SectionBlockRenderer } from './grid/SectionBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';
import { SectionDataProvider } from './SectionDataContext';
import { SectionLayoutProvider } from './SectionLayoutContext';
import { BlockRenderContext } from '../blocks/BlockContext';
import { useCmsPageContext } from '../CmsPageContext';
import { CssAnimationWrapper } from '../CssAnimationWrapper';



export function FrontendGridSection(): React.ReactNode {
  const { sectionId, settings, blocks } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const sectionSelector = sectionId ? getCustomCssSelector(sectionId) : null;
  const sectionCustomCss = buildScopedCustomCss(settings['customCss'], sectionSelector);
  const rowBlocks = blocks.filter((b: BlockInstance) => b.type === 'Row');
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
  const hasGridBackground = hasGridBackgroundSetting;

  const rowsToRender: BlockInstance[] = rowBlocks;

  if (rowsToRender.length === 0) return null;

  const sectionBlock: BlockInstance = {
    id: sectionId ?? 'grid-section',
    type: 'Section',
    settings,
    blocks,
  };

  return (
    <SectionDataProvider settings={settings}>
      <BlockRenderContext.Provider
        value={{ block: sectionBlock, mediaStyles: null, stretch: false }}
      >
        <BlockSettingsContext.Provider value={settings}>
          <EventEffectsWrapper>
            <section
              style={sectionStyles}
              className={`relative${sectionId ? ` cms-node-${sectionId}` : ''} ${hasGridBackground ? 'overflow-hidden' : ''}`}
            >
              {sectionCustomCss ? (
                <style data-cms-custom-css={sectionId}>{sectionCustomCss}</style>
              ) : null}
              {hasGridBackgroundSetting && (
                <BackgroundImageLayer settings={gridBackgroundSettings} />
              )}
              <div className='relative z-10'>
                <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
                  <div className={`flex flex-col ${sectionGapClass}`} style={sectionGapStyle}>
                    {rowsToRender.map((row: BlockInstance, rowIndex: number) => {
                      const rowChildren = row.blocks ?? [];
                      if (rowChildren.length === 0) return null;
                      const rowGapValue = resolveGapValue(row.settings?.['gap'], columnGapValue);
                      const rowGapClass = getGapClass(rowGapValue);
                      const rowGapPxRaw = row.settings?.['gapPx'];
                      const rowGapPx =
                        typeof rowGapPxRaw === 'number' &&
                        Number.isFinite(rowGapPxRaw) &&
                        rowGapPxRaw > 0
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
                        rowHeightMode === 'fixed' && rowHeight > 0
                          ? { height: `${rowHeight}px` }
                          : undefined;
                      const rowBackgroundSettings = row.settings?.['backgroundImage'] as
                        | Record<string, unknown>
                        | undefined;
                      const hasRowBackgroundSetting = Boolean(
                        (rowBackgroundSettings?.['src'] as string) || ''
                      );
                      const hasRowBackground = hasRowBackgroundSetting;
                      const rowSelector = getCustomCssSelector(row.id);
                      const rowCustomCss = buildScopedCustomCss(
                        row.settings?.['customCss'],
                        rowSelector
                      );
                      const direction = (row.settings?.['direction'] as string) || 'horizontal';
                      const isVertical = direction === 'vertical';
                      const rowWrapClass = !isVertical
                        ? rowWrap === 'nowrap'
                          ? 'flex-nowrap'
                          : 'flex-wrap'
                        : '';

                      return (
                        <BlockSettingsContext.Provider
                          key={`grid-row-${row.id}-${rowIndex}`}
                          value={row.settings ?? {}}
                        >
                          <BlockRenderContext.Provider
                            value={{ block: row, mediaStyles: null, stretch: false }}
                          >
                            <CssAnimationWrapper>
                              <div
                                className={`relative cms-node-${row.id} ${hasRowBackground ? 'overflow-hidden' : ''}`}
                                style={{ ...rowStyles, ...(rowHeightStyle ?? {}) }}
                              >
                                {rowCustomCss ? (
                                  <style data-cms-custom-css={row.id}>{rowCustomCss}</style>
                                ) : null}
                                {hasRowBackgroundSetting && (
                                  <BackgroundImageLayer settings={rowBackgroundSettings} />
                                )}
                                <div
                                  className={`relative z-10 flex ${isVertical ? 'flex-col' : 'flex-row'} ${rowWrapClass} ${rowGapClass}`}
                                  style={{
                                    ...(rowHeightMode === 'fixed' && rowHeight > 0
                                      ? { height: '100%' }
                                      : {}),
                                    ...(rowGapStyle ?? {}),
                                    ...(rowJustify ? { justifyContent: rowJustify } : {}),
                                    ...(rowAlign ? { alignItems: rowAlign } : {}),
                                  }}
                                >
                                  {rowChildren.map((child: BlockInstance) => {
                                    if (child.type === 'Column') {
                                      return (
                                        <div
                                          key={child.id}
                                          className={isVertical ? 'w-full' : 'flex-1 min-w-0'}
                                        >
                                          <SectionLayoutProvider
                                            rowHeightMode={rowHeightMode}
                                            rowHeight={rowHeight}
                                          >
                                            <ColumnRenderer column={child} />
                                          </SectionLayoutProvider>
                                        </div>
                                      );
                                    }
                                    const minHeight = getBlockMinHeight(child.type);
                                    const wrapperStyle: React.CSSProperties = {
                                      minHeight: `${minHeight}px`,
                                      position: 'relative',
                                    };
                                    if (SECTION_BLOCK_TYPES.has(child.type)) {
                                      return (
                                        <div
                                          key={child.id}
                                          className={isVertical ? 'w-full' : ''}
                                          style={wrapperStyle}
                                        >
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
                                      <div
                                        key={child.id}
                                        className={isVertical ? 'w-full' : ''}
                                        style={wrapperStyle}
                                      >
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
                          </BlockRenderContext.Provider>
                        </BlockSettingsContext.Provider>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </EventEffectsWrapper>
        </BlockSettingsContext.Provider>
      </BlockRenderContext.Provider>
    </SectionDataProvider>
  );
}
