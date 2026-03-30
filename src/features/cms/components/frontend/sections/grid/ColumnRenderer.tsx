import React from 'react';

import { getCustomCssSelector, buildScopedCustomCss } from '@/features/cms/utils/custom-css';
import type { BlockInstance } from '@/shared/contracts/cms';

import { BackgroundImageLayer } from './BackgroundImageLayer';
import {
  SECTION_BLOCK_TYPES,
  getBlockMinHeight,
  getGapClass,
  getGapStyle,
  resolveGapValue,
  resolveJustifyContent,
  resolveAlignItems,
} from './frontend-grid-utils';
import { SectionBlockRenderer } from './SectionBlockRenderer';
import { BlockRenderContext } from '../../blocks/BlockContext';
import { CssAnimationWrapper } from '../../CssAnimationWrapper';
import { GsapAnimationWrapper } from '../../GsapAnimationWrapper';
import { getSectionStyles, getTextAlign } from '../../theme-styles';
import { FrontendBlockRenderer, BlockSettingsContext } from '../FrontendBlockRenderer';
import { useSectionData } from '../SectionDataContext';
import { SectionLayoutProvider, useSectionLayout } from '../SectionLayoutContext';




export function ColumnRenderer({ column }: { column: BlockInstance }): React.ReactNode {
  const children = column.blocks ?? [];
  const { colorSchemes } = useSectionData();
  const { rowHeightMode, rowHeight } = useSectionLayout();

  const contentChildren = children;

  const isSingleBlock = contentChildren.length === 1;
  const columnHeightMode = (column.settings['heightMode'] as string) || 'inherit';
  const columnHeight = (column.settings['height'] as number) || 0;
  const shouldStretch =
    isSingleBlock && (columnHeightMode === 'fixed' || rowHeightMode === 'fixed');
  const columnBackgroundSettings = column.settings['backgroundImage'] as
    | Record<string, unknown>
    | undefined;
  const hasColumnBackgroundSetting = Boolean((columnBackgroundSettings?.['src'] as string) || '');
  const hasColumnBackground = hasColumnBackgroundSetting;
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
    <BlockRenderContext.Provider
      value={{ block: column, mediaStyles: null, stretch: shouldStretch }}
    >
      <BlockSettingsContext.Provider value={column.settings}>
        <GsapAnimationWrapper>
          <CssAnimationWrapper>
            <div
              className={`relative cms-node-${column.id} ${hasColumnBackground ? 'overflow-hidden' : ''}`}
              style={{ ...columnStyles, ...columnStyle }}
            >
              {columnCustomCss ? (
                <style data-cms-custom-css={column.id}>{columnCustomCss}</style>
              ) : null}
              {hasColumnBackgroundSetting && (
                <BackgroundImageLayer settings={columnBackgroundSettings} />
              )}
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
                      <div
                        key={block.id}
                        className={shouldStretch ? 'flex-1' : ''}
                        style={wrapperStyle}
                      >
                        <SectionLayoutProvider stretch={shouldStretch}>
                          <SectionBlockRenderer block={block} />
                        </SectionLayoutProvider>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={block.id}
                      className={shouldStretch ? 'flex-1' : ''}
                      style={wrapperStyle}
                    >
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
    </BlockRenderContext.Provider>
  );
}
