'use client';

import { Trash2 } from 'lucide-react';
import React from 'react';

import { Separator } from '@/shared/ui';
import {
  getSectionContainerClass,
  getSectionStyles,
  getTextAlign,
  type ColorSchemeColors,
} from '@/features/cms/components/frontend/theme-styles';
import { BlockContextProvider } from '@/features/cms/components/page-builder/preview/context/BlockContext';
import { usePreviewEditor } from '@/features/cms/components/page-builder/preview/context/PreviewEditorContext';
import {
  renderBackgroundImageLayer,
} from '@/features/cms/components/page-builder/preview/image-utils';
import {
  InspectorTooltip,
  InspectorHover,
} from '@/features/cms/components/page-builder/preview/InspectorOverlay';
import {
  getGapClass,
  resolveGapValue,
  getGapStyle,
  resolveJustifyContent,
  resolveAlignItems,
  isBackgroundModeImage,
  collectBackgroundImages,
  getBlockMinHeight,
} from '@/features/cms/components/page-builder/preview/preview-utils';
import type { BlockInstance, SectionInstance } from '@/features/cms/types/page-builder';
import {
  buildScopedCustomCss,
  getCustomCssSelector,
} from '@/features/cms/utils/custom-css';

interface PreviewGridSectionProps {
  section: SectionInstance;
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  mediaStyles?: React.CSSProperties | null | undefined;
  selectedRing: string;
  renderSectionActions: () => React.ReactNode;
  divider: React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
  handleSelect: () => void;
  PreviewBlockItem: React.ComponentType<{ block: BlockInstance }>;
  layout?: { fullWidth?: boolean } | undefined;
}

export function PreviewGridSection({
  section,
  colorSchemes,
  mediaStyles,
  selectedRing,
  renderSectionActions,
  divider,
  wrapInspector,
  handleSelect,
  PreviewBlockItem,
  layout,
}: PreviewGridSectionProps) {
  const {
    selectedNodeId,
    isInspecting = false,
    inspectorSettings,
    hoveredNodeId,
    onSelect,
    onRemoveRow,
  } = usePreviewEditor();

  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const sectionStyles = getSectionStyles(section.settings, colorSchemes);

  const rowBlocks = section.blocks.filter((b: BlockInstance) => b.type === 'Row');
  const directColumns = section.blocks.filter((b: BlockInstance) => b.type === 'Column');
  
  // Legacy: ImageElements directly in grid that don't have background mode set
  const gridImageBlocks = section.blocks.filter(
    (b: BlockInstance) =>
      b.type === 'ImageElement' &&
      !isBackgroundModeImage(b, 'grid') &&
      !isBackgroundModeImage(b, 'row') &&
      !isBackgroundModeImage(b, 'column'),
  );
  
  // New: Collect all ImageElements with backgroundTarget: "grid" from entire block tree
  const gridBackgroundModeImages = collectBackgroundImages(section.blocks, 'grid');
  
  const sectionGap = (section.settings['gap'] as string) || 'medium';
  const rowGapSetting = section.settings['rowGap'] as string | undefined;
  const columnGapSetting = section.settings['columnGap'] as string | undefined;
  const rowGapValue = resolveGapValue(rowGapSetting, sectionGap);
  const columnGapValue = resolveGapValue(columnGapSetting, sectionGap);
  const sectionGapClass = getGapClass(rowGapValue);
  const sectionGapStyle = getGapStyle(section.settings['rowGapPx']);
  const columnGapPx =
    typeof section.settings['columnGapPx'] === 'number' && Number.isFinite(section.settings['columnGapPx'])
      ? section.settings['columnGapPx']
      : 0;

  const gridBackgroundSettings = section.settings['backgroundImage'] as Record<string, unknown> | undefined;
  const hasGridBackgroundSetting = Boolean((gridBackgroundSettings?.['src'] as string) || '');
  const hasGridBackgroundLayers = gridImageBlocks.length > 0 || gridBackgroundModeImages.length > 0;
  const hasGridBackground = hasGridBackgroundSetting || hasGridBackgroundLayers;

  const rowCount = rowBlocks.length > 0 ? rowBlocks.length : directColumns.length > 0 ? 1 : 0;
  const canRemoveRow = rowCount > 1;

  const rowsToRender: Array<{ row: BlockInstance; virtual: boolean }> =
    rowBlocks.length > 0
      ? rowBlocks.map((row: BlockInstance) => ({ row, virtual: false }))
      : directColumns.length > 0
        ? [
          {
            row: {
              id: `row-virtual-${section.id}`,
              type: 'Row',
              settings: {},
              blocks: directColumns,
            },
            virtual: true,
          },
        ]
        : [];

  const hasZeroSpacing = [
    'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
    'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  ].every((key: string) => {
    const value = section.settings[key] as number | undefined;
    return !value || value === 0;
  });

  const isEmptyGrid =
    rowsToRender.length > 0 &&
    rowsToRender.every(({ row }: { row: BlockInstance }) => {
      const columns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column');
      return columns.length > 0 && columns.every((column: BlockInstance) => (column.blocks ?? []).length === 0);
    });

  const hasFixedHeights = rowsToRender.some(({ row }: { row: BlockInstance }) => {
    const rowHeightMode = (row.settings?.['heightMode'] as string) || 'inherit';
    const rowHeight = (row.settings?.['height'] as number) || 0;
    if (rowHeightMode === 'fixed' && rowHeight > 0) return true;
    const columns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column');
    return columns.some((column: BlockInstance) => {
      const columnHeightMode = (column.settings?.['heightMode'] as string) || 'inherit';
      const columnHeight = (column.settings?.['height'] as number) || 0;
      return columnHeightMode === 'fixed' && columnHeight > 0;
    });
  });

  const sectionSelector = getCustomCssSelector(section.id);
  const sectionCustomCss = buildScopedCustomCss(section.settings['customCss'], sectionSelector);

  if (rowsToRender.length === 0 && !showEditorChrome) {
    return null;
  }

  return wrapInspector(
    <div
      role='button'
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') handleSelect();
      }}
      style={sectionStyles}
      className={`relative w-full text-left transition cursor-pointer ${selectedRing} cms-node-${section.id}`}
    >
      {sectionCustomCss ? (
        <style data-cms-custom-css={section.id}>{sectionCustomCss}</style>
      ) : null}
      {renderSectionActions()}
      {divider}
      <div className={`relative ${hasGridBackground ? 'overflow-hidden' : ''}`}>
        {gridImageBlocks.map((block: BlockInstance) => (
          <React.Fragment key={`grid-background-${block.id}`}>
            {renderBackgroundImageLayer(block.settings, mediaStyles)}
          </React.Fragment>
        ))}
        {gridBackgroundModeImages.map((block: BlockInstance) => (
          <React.Fragment key={`grid-bg-mode-${block.id}`}>
            {renderBackgroundImageLayer(block.settings, mediaStyles)}
          </React.Fragment>
        ))}
        {hasGridBackgroundSetting && renderBackgroundImageLayer(gridBackgroundSettings, mediaStyles)}
        
        <div className='relative z-10'>
          {rowsToRender.length === 0 ? (
            showEditorChrome ? (
              <div className='flex min-h-[60px] items-center justify-center text-sm text-gray-500'>
                No rows
              </div>
            ) : null
          ) : showEditorChrome && isEmptyGrid && hasZeroSpacing && !hasFixedHeights ? (
            <Separator className='bg-border/40' />
          ) : (
            <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
              <div className={`flex flex-col ${sectionGapClass}`} style={sectionGapStyle}>
                {rowsToRender.map(({ row, virtual }, rowIndex) => {
                  const rowColumns = (row.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column');
                  const columnCount = Math.max(1, rowColumns.length);
                  const rowHasContent = rowColumns.some((column: BlockInstance) => (column.blocks ?? []).length > 0);
                  const isRowSelected = showEditorChrome && !virtual && selectedNodeId === row.id;
                  const rowGapValue = resolveGapValue(row.settings?.['gap'], columnGapValue);
                  const rowGapClass = rowHasContent ? getGapClass(rowGapValue) : 'gap-0';
                  const rowGapPxRaw = row.settings?.['gapPx'];
                  const rowGapPx = typeof rowGapPxRaw === 'number' && Number.isFinite(rowGapPxRaw) && rowGapPxRaw > 0 ? rowGapPxRaw : columnGapPx;
                  const rowGapStyle = getGapStyle(rowGapPx);
                  const rowJustify = resolveJustifyContent(row.settings?.['justifyContent']);
                  const rowAlign = resolveAlignItems(row.settings?.['alignItems']);
                  const rowStyles = getSectionStyles(row.settings ?? {}, colorSchemes);
                  const rowHeightMode = (row.settings?.['heightMode'] as string) || 'inherit';
                  const rowHeight = (row.settings?.['height'] as number) || 0;
                  const rowHeightStyle = rowHeightMode === 'fixed' && rowHeight > 0 ? { height: `${rowHeight}px` } : undefined;
                  const rowSelector = getCustomCssSelector(row.id);
                  const rowCustomCss = buildScopedCustomCss(row.settings?.['customCss'], rowSelector);
                  
                  const rowBackgroundModeImages = collectBackgroundImages(row.blocks ?? [], 'row');
                  const rowBackgroundSettings = row.settings?.['backgroundImage'] as Record<string, unknown> | undefined;
                  const hasRowBackgroundSetting = Boolean((rowBackgroundSettings?.['src'] as string) || '');
                  const hasRowBackground = hasRowBackgroundSetting || rowBackgroundModeImages.length > 0;

                  return (
                    <div key={row.id}>
                      <div
                        role={!virtual ? 'button' : undefined}
                        tabIndex={!virtual ? 0 : undefined}
                        onClick={(e: React.MouseEvent): void => {
                          if (virtual) return;
                          e.stopPropagation();
                          onSelect(row.id);
                        }}
                        onKeyDown={(e: React.KeyboardEvent): void => {
                          if (virtual) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            onSelect(row.id);
                          }
                        }}
                        style={{ ...rowStyles, ...(rowHeightStyle ?? {}) }}
                        className={`relative cms-node-${row.id} ${hasRowBackground ? 'overflow-hidden' : ''} ${
                          isRowSelected ? 'ring-1 ring-inset ring-blue-500/40' : ''
                        } ${showEditorChrome && !isRowSelected ? 'border border-dashed border-gray-800/40' : ''}`}
                      >
                        {rowCustomCss ? <style data-cms-custom-css={row.id}>{rowCustomCss}</style> : null}
                        {rowBackgroundModeImages.map((block: BlockInstance) => (
                          <React.Fragment key={`row-bg-mode-${block.id}`}>
                            {renderBackgroundImageLayer(block.settings, mediaStyles)}
                          </React.Fragment>
                        ))}
                        {hasRowBackgroundSetting && renderBackgroundImageLayer(rowBackgroundSettings, mediaStyles)}
                        
                        {!virtual && isRowSelected && onRemoveRow && showEditorChrome && (
                          <div className='absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full border border-border/40 bg-gray-900/80 px-1.5 py-1 text-xs text-gray-200 shadow-sm'>
                            <button
                              type='button'
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (!canRemoveRow) return;
                                onRemoveRow(section.id, row.id);
                              }}
                              disabled={!canRemoveRow}
                              className='rounded p-1 text-gray-300 hover:text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40 transition-colors'
                              title={canRemoveRow ? 'Remove row' : 'At least one row is required'}
                            >
                              <Trash2 className='size-3.5' />
                            </button>
                          </div>
                        )}
                        
                        <div
                          className={`relative z-10 grid ${rowGapClass}`}
                          style={{
                            gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                            ...(rowHeightMode === 'fixed' && rowHeight > 0 ? { height: '100%' } : {}),
                            ...(rowGapStyle ?? {}),
                            ...(rowJustify ? { justifyContent: rowJustify } : {}),
                            ...(rowAlign ? { alignItems: rowAlign } : {}),
                          }}
                        >
                          {rowColumns.map((column: BlockInstance, colIndex: number) => {
                            const isColumnSelected = showEditorChrome && selectedNodeId === column.id;
                            const isColumnHovered = showEditorChrome && isInspecting && hoveredNodeId === column.id;
                            const columnHeightMode = (column.settings?.['heightMode'] as string) || 'inherit';
                            const columnHeight = (column.settings?.['height'] as number) || 0;
                            const columnGapValue = resolveGapValue(column.settings?.['gap'], 'medium');
                            const columnGapClass = getGapClass(columnGapValue);
                            const columnGapStyle = getGapStyle(column.settings?.['gapPx']);
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
                            } else if (rowHeightMode === 'fixed' && rowHeight > 0) {
                              columnStyle.height = '100%';
                            }
                            
                            const columnBlocks = column.blocks ?? [];
                            const columnBackgroundModeImages = columnBlocks.filter((b: BlockInstance) => isBackgroundModeImage(b, 'column'));
                            const columnBackgroundSettings = column.settings?.['backgroundImage'] as Record<string, unknown> | undefined;
                            const hasColumnBackgroundSetting = Boolean((columnBackgroundSettings?.['src'] as string) || '');
                            const hasColumnBackground = hasColumnBackgroundSetting || columnBackgroundModeImages.length > 0;

                            const columnTooltip = (
                              <InspectorTooltip
                                title='Column'
                                sections={[
                                  {
                                    title: 'Meta',
                                    entries: inspectorSettings.showIdentifiers
                                      ? [{ label: 'Type', value: 'Column' }, { label: 'ID', value: column.id }]
                                      : [{ label: 'Type', value: 'Column' }],
                                  },
                                  ...(inspectorSettings.showStructureInfo ? [{
                                    title: 'Structure',
                                    entries: [
                                      { label: 'Section', value: section.type },
                                      { label: 'Zone', value: section.zone },
                                      { label: 'Row', value: String(rowIndex + 1) },
                                      { label: 'Column', value: String(colIndex + 1) },
                                    ],
                                  }] : []),
                                  // Simplified connection and style info for refactor phase
                                ]}
                              />
                            );

                            return (
                              <InspectorHover
                                key={column.id}
                                nodeId={column.id}
                                fallbackNodeId={section.id}
                                content={columnTooltip}
                                className='w-full'
                              >
                                <div
                                  role='button'
                                  tabIndex={0}
                                  onClick={(e: React.MouseEvent): void => { e.stopPropagation(); onSelect(column.id); }}
                                  onKeyDown={(e: React.KeyboardEvent): void => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onSelect(column.id); }
                                  }}
                                  style={{ ...columnStyles, ...columnStyle }}
                                  className={`relative h-full text-left transition cursor-pointer cms-node-${column.id} ${
                                    isColumnSelected ? 'ring-1 ring-inset ring-blue-500/40' : ''
                                  } ${isColumnHovered && !isColumnSelected ? 'ring-1 ring-inset ring-blue-500/30' : ''} ${hasColumnBackground ? 'overflow-hidden' : ''} ${
                                    showEditorChrome && !isColumnSelected && !isColumnHovered ? 'border-x border-dashed border-gray-800/30' : ''
                                  }`}
                                >
                                  {columnCustomCss ? <style data-cms-custom-css={column.id}>{columnCustomCss}</style> : null}
                                  {columnBackgroundModeImages.map((block: BlockInstance) => (
                                    <React.Fragment key={`col-bg-mode-${block.id}`}>
                                      {renderBackgroundImageLayer(block.settings, mediaStyles)}
                                    </React.Fragment>
                                  ))}
                                  {hasColumnBackgroundSetting && renderBackgroundImageLayer(columnBackgroundSettings, mediaStyles)}
                                  
                                  {(column.blocks ?? []).length > 0 ? (
                                    ((): React.ReactNode => {
                                      const contentBlocks = columnBlocks.filter((b: BlockInstance) => {
                                        if (b.type !== 'ImageElement') return true;
                                        return ((b.settings?.['backgroundTarget'] as string) || 'none') === 'none';
                                      });
                                      if (contentBlocks.length === 0 && showEditorChrome) {
                                        return <div className='flex min-h-[60px] items-center justify-center rounded border border-dashed border-gray-700/50 bg-gray-900/20 text-[10px] uppercase tracking-wider text-gray-600'>Column</div>;
                                      }
                                      const isSingleBlock = contentBlocks.length === 1;
                                      const shouldStretch = isSingleBlock && (rowHeightMode === 'fixed' || columnHeightMode === 'fixed');
                                      return (
                                        <BlockContextProvider value={{ columnId: column.id, contained: true, stretch: shouldStretch }}>
                                          <div
                                            className={`relative z-10 flex flex-col ${shouldStretch ? 'h-full' : columnGapClass} ${isInspecting ? '' : 'pointer-events-none'}`}
                                            style={{
                                              ...(shouldStretch ? {} : columnGapStyle),
                                              ...(columnJustify ? { justifyContent: columnJustify } : {}),
                                              ...(columnAlign ? { alignItems: columnAlign } : {}),
                                            }}
                                          >
                                            {contentBlocks.map((block: BlockInstance, blockIndex: number) => (
                                              <div
                                                key={block.id}
                                                className={shouldStretch ? 'flex-1' : ''}
                                                style={{
                                                  minHeight: `${getBlockMinHeight(block.type)}px`,
                                                  ...(shouldStretch ? { height: '100%' } : {}),
                                                  position: 'relative',
                                                  zIndex: contentBlocks.length - blockIndex,
                                                }}
                                              >
                                                <PreviewBlockItem block={block} />
                                              </div>
                                            ))}
                                          </div>
                                        </BlockContextProvider>
                                      );
                                    })()
                                  ) : showEditorChrome ? (
                                    <div className='flex min-h-[60px] items-center justify-center rounded border border-dashed border-gray-700/50 bg-gray-900/20 text-[10px] uppercase tracking-wider text-gray-600'>Column</div>
                                  ) : null}
                                </div>
                              </InspectorHover>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
