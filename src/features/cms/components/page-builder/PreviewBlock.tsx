'use client';

import {
  Image as ImageIcon,
  Eye,
  EyeOff,
  Trash2,
  Megaphone,
  Link2,
} from 'lucide-react';
import NextImage from 'next/image';
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';

import {
  APP_EMBED_OPTIONS,
  type AppEmbedId,
} from '@/features/app-embeds/lib/constants';
import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import type { CssAnimationConfig } from '@/features/cms/types/css-animations';
import {
  buildScopedCustomCss,
  getCustomCssSelector,
} from '@/features/cms/utils/custom-css';
import type { GsapAnimationConfig } from '@/features/gsap';
import {
  Viewer3D,
  type EnvironmentPreset,
  type LightingPreset,
} from '@/features/viewer3d';

import { CssAnimationWrapper } from '../frontend/CssAnimationWrapper';
import { GsapAnimationWrapper } from '../frontend/GsapAnimationWrapper';
import {
  getSectionContainerClass,
  getSectionStyles,
  getTextAlign,
  getBlockTypographyStyles,
  getVerticalAlign,
  type ColorSchemeColors,
} from '../frontend/theme-styles';
import { usePreviewEditor } from './preview/context/PreviewEditorContext';
import { BlockContextProvider, useBlockContext } from './preview/context/BlockContext';
import {
  buildImageElementPresentation,
  renderBackgroundImageLayer,
} from './preview/image-utils';
import {
  InspectorTooltip,
  InspectorHover,
  buildStyleEntries,
  resolveNodeLabel,
  type InspectorEntry,
  type InspectorSection,
} from './preview/InspectorOverlay';
import { MemoizedViewer3D } from './preview/MemoizedViewer3D';
import {
  SECTION_BLOCK_TYPES,
  getGapClass,
  resolveGapValue,
  getGapStyle,
  resolveJustifyContent,
  resolveAlignItems,
  normalizeSlideshowAnimationType,
  getBlockMinHeight,
  getSpacingValue,
  toNumber,
  toBoolean,
  toRadians,
  shouldShowSectionDivider,
  isBackgroundModeImage,
  collectBackgroundImages,
  type MediaReplaceTarget,
} from './preview/preview-utils';
import {
  PreviewCarouselBlock,
  PreviewSlideshowBlock,
  registerCarouselPreviewBlockItem,
} from './preview/PreviewCarouselBlocks';
import {
  PreviewImageWithTextBlock,
  PreviewHeroBlock,
  PreviewRichTextBlock,
  PreviewBlockSectionBlock,
  PreviewTextAtomBlock,
  registerPreviewBlockItem,
} from './preview/PreviewSectionBlocks';

import type { PreviewBlockItemProps } from './preview/types';
import type {
  SectionInstance,
  BlockInstance,
} from '../../types/page-builder';

export type { MediaReplaceTarget };

type AppEmbedOption = (typeof APP_EMBED_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Top-level section preview
// ---------------------------------------------------------------------------

interface PreviewSectionProps {
  section: SectionInstance;
  colorSchemes?: Record<string, ColorSchemeColors>;
  mediaStyles?: React.CSSProperties | null;
  layout?: { fullWidth?: boolean };
}

export function PreviewSection({
  section,
  colorSchemes,
  mediaStyles,
  layout,
}: PreviewSectionProps): React.ReactNode {
  const {
    selectedNodeId,
    isInspecting = false,
    inspectorSettings,
    hoveredNodeId,
    onSelect,
    onOpenMedia,
    onRemoveSection,
    onToggleSectionVisibility,
    onRemoveRow,
  } = usePreviewEditor();
  const isSlideshowSection = section.type === 'Slideshow';
  const isSectionSelected = selectedNodeId === section.id;
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const isHidden = Boolean(section.settings['isHidden']);
  const label = resolveNodeLabel(section.type, section.settings['label']);
  const animConfig = section.settings['gsapAnimation'] as
    | Partial<GsapAnimationConfig>
    | undefined;
  const cssAnimConfig = section.settings['cssAnimation'] as
    | CssAnimationConfig
    | undefined;
  // Inspector should work independently of "editor chrome" (chrome only affects visual overlays / actions).
  const inspectorActive = isInspecting;
  const isSectionHovered = inspectorActive && hoveredNodeId === section.id;
  const inspectorZ =
    inspectorActive && (isSectionHovered || isSectionSelected) ? 'z-30' : '';
  const showDivider = shouldShowSectionDivider(section.settings);
  const divider = showDivider ? (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/5" />
  ) : null;
  const metaEntries: InspectorEntry[] = [
    { label: 'Type', value: section.type },
    { label: 'Label', value: label },
  ];
  if (inspectorSettings.showIdentifiers) {
    metaEntries.push({ label: 'ID', value: section.id });
  }
  const structureEntries: InspectorEntry[] = [
    { label: 'Zone', value: section.zone },
    { label: 'Blocks', value: String(section.blocks.length) },
  ];
  if (section.type === 'Grid') {
    const rowBlocks = section.blocks.filter(
      (b: BlockInstance) => b.type === 'Row',
    );
    const directColumns = section.blocks.filter(
      (b: BlockInstance) => b.type === 'Column',
    );
    const columnsInRows = rowBlocks
      .flatMap((row: BlockInstance) => row.blocks ?? [])
      .filter((b: BlockInstance) => b.type === 'Column');
    const rowsCount = rowBlocks.length || (directColumns.length > 0 ? 1 : 0);
    const columnsPerRow =
      rowBlocks.length > 0
        ? Math.max(
          1,
          ...rowBlocks.map(
            (row: BlockInstance) =>
              (row.blocks ?? []).filter(
                (b: BlockInstance) => b.type === 'Column',
              ).length,
          ),
        )
        : directColumns.length;
    const cellCount =
      rowBlocks.length > 0 ? columnsInRows.length : directColumns.length;
    structureEntries.push({ label: 'Rows', value: String(rowsCount) });
    structureEntries.push({
      label: 'Columns / row',
      value: String(columnsPerRow),
    });
    structureEntries.push({ label: 'Cells', value: String(cellCount) });
  }
  const visibilityEntries: InspectorEntry[] = [
    { label: 'Hidden', value: isHidden ? 'Yes' : 'No' },
  ];
  const connectionEntries: InspectorEntry[] = [];
  const connection = section.settings['connection'] as
    | { enabled?: boolean; source?: string; path?: string; fallback?: string }
    | undefined;
  if (connection) {
    connectionEntries.push({
      label: 'Enabled',
      value: connection.enabled ? 'Yes' : 'No',
    });
    if (connection.source)
      connectionEntries.push({ label: 'Source', value: connection.source });
    if (connection.path)
      connectionEntries.push({ label: 'Path', value: connection.path });
    if (connection.fallback)
      connectionEntries.push({ label: 'Fallback', value: connection.fallback });
  }
  const styleEntries = inspectorSettings.showStyleSettings
    ? buildStyleEntries(section.settings)
    : [];
  const inspectorSections: InspectorSection[] = [
    { title: 'Meta', entries: metaEntries },
  ];
  if (inspectorSettings.showStructureInfo) {
    inspectorSections.push({ title: 'Structure', entries: structureEntries });
  }
  if (inspectorSettings.showVisibilityInfo) {
    inspectorSections.push({ title: 'Visibility', entries: visibilityEntries });
  }
  if (inspectorSettings.showConnectionInfo) {
    inspectorSections.push({ title: 'Connection', entries: connectionEntries });
  }
  if (inspectorSettings.showStyleSettings) {
    inspectorSections.push({ title: 'Styles', entries: styleEntries });
  }
  const inspectorContent = (
    <InspectorTooltip
      title={`Section: ${label}`}
      sections={inspectorSections}
    />
  );
  const wrapInspector = (node: React.ReactNode): React.ReactNode => (
    <BlockContextProvider
      value={{
        sectionId: section.id,
        sectionType: section.type,
        sectionZone: section.zone,
        mediaStyles,
      }}
    >
      <InspectorHover
        nodeId={section.id}
        fallbackNodeId={null}
        content={inspectorContent}
        className="w-full"
      >
        <GsapAnimationWrapper config={animConfig}>
          <CssAnimationWrapper config={cssAnimConfig}>
            <EventEffectsWrapper settings={section.settings} disableClick>
              {node}
            </EventEffectsWrapper>
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      </InspectorHover>
    </BlockContextProvider>
  );

  // Toggle: clicking an already-selected section deselects it
  const handleSelect = (): void => {
    if (isSectionSelected) {
      onSelect('');
    } else {
      onSelect(section.id);
    }
  };

  const renderSectionActions = (): React.ReactNode => {
    if (!showEditorChrome || !isSectionSelected) return null;
    return (
      <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-border/40 bg-gray-900/80 px-1.5 py-1 text-xs text-gray-200 shadow-sm">
        <button
          type="button"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onToggleSectionVisibility?.(section.id, !isHidden);
          }}
          className="rounded p-1 text-gray-300 hover:text-white hover:bg-white/10"
          title={isHidden ? 'Show section' : 'Hide section'}
        >
          {isHidden ? (
            <EyeOff className="size-3.5" />
          ) : (
            <Eye className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onRemoveSection?.(section.id);
          }}
          className="rounded p-1 text-gray-300 hover:text-red-200 hover:bg-red-500/20"
          title="Delete section"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Shared section wrapper — uses getSectionStyles for real inline styles
  // ---------------------------------------------------------------------------
  const sectionStyles = getSectionStyles(section.settings, colorSchemes);
  const selectedRingBase = inspectorActive
    ? isSectionSelected
      ? 'ring-4 ring-blue-500/65'
      : isSectionHovered
        ? 'ring-4 ring-blue-500/45'
        : 'hover:ring-1 hover:ring-inset hover:ring-border/40'
    : showEditorChrome
      ? isSectionSelected
        ? isInspecting
          ? 'ring-2 ring-inset ring-blue-500/60'
          : 'ring-2 ring-inset ring-blue-500/40'
        : 'hover:ring-1 hover:ring-inset hover:ring-border/40'
      : '';
  const selectedRing = `${selectedRingBase} ${inspectorZ}`.trim();

  const sectionImage = section.settings['image'] as string | undefined;
  const slideshowTransition =
    (section.settings['transition'] as string) || 'fade';
  const slideshowTransitionDuration =
    (section.settings['transitionDuration'] as number) || 700;
  const slideshowAutoplay = (section.settings['autoplay'] as string) !== 'no';
  const slideshowAutoplaySpeed =
    (section.settings['autoplaySpeed'] as number) || 5000;
  const slideshowPauseOnHover =
    (section.settings['pauseOnHover'] as string) !== 'no';
  const { pauseSlideshowOnHoverInEditor } = usePreviewEditor();
  const slideshowAllowPauseOnHover =
    slideshowPauseOnHover && pauseSlideshowOnHoverInEditor;
  const slideshowLoop = (section.settings['loop'] as string) !== 'no';
  const slideshowElementAnimationType =
    (section.settings['elementAnimationType'] as string) || 'fade-in';
  const slideshowElementAnimationDuration =
    (section.settings['elementAnimationDuration'] as number) || 400;
  const slideshowElementAnimationDelay =
    (section.settings['elementAnimationDelay'] as number) || 0;
  const slideshowElementAnimationEasing =
    (section.settings['elementAnimationEasing'] as string) || 'ease-out';
  const slideshowElementAnimationStagger =
    (section.settings['elementAnimationStagger'] as number) || 100;
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [slideshowPaused, setSlideshowPaused] = useState(false);
  const slideshowFrames = useMemo((): BlockInstance[] => {
    if (!isSlideshowSection) return [];
    const frameBlocks = section.blocks.filter(
      (block: BlockInstance) => block.type === 'SlideshowFrame',
    );
    const legacyBlocks = section.blocks.filter(
      (block: BlockInstance) => block.type !== 'SlideshowFrame',
    );
    if (frameBlocks.length > 0) {
      if (legacyBlocks.length === 0) return frameBlocks;
      const legacyFrames = legacyBlocks.map((block: BlockInstance) => ({
        id: block.id,
        type: 'SlideshowFrame',
        settings: {},
        blocks: [block],
      }));
      return [...frameBlocks, ...legacyFrames];
    }
    return legacyBlocks.map((block: BlockInstance) => ({
      id: block.id,
      type: 'SlideshowFrame',
      settings: {},
      blocks: [block],
    }));
  }, [isSlideshowSection, section.blocks]);
  const slideshowCount = slideshowFrames.length;
  const currentSlideshowIndex =
    slideshowIndex >= slideshowCount ? 0 : slideshowIndex;
  const goToNextSlideshow = useCallback((): void => {
    if (slideshowCount <= 1) return;
    if (!slideshowLoop && currentSlideshowIndex >= slideshowCount - 1) return;
    setSlideshowIndex((prev: number) => (prev + 1) % slideshowCount);
  }, [slideshowCount, slideshowLoop, currentSlideshowIndex]);
  const goToPrevSlideshow = useCallback((): void => {
    if (slideshowCount <= 1) return;
    if (!slideshowLoop && currentSlideshowIndex <= 0) return;
    setSlideshowIndex(
      (prev: number) => (prev - 1 + slideshowCount) % slideshowCount,
    );
  }, [slideshowCount, slideshowLoop, currentSlideshowIndex]);

  useEffect((): void => {
    if (!isSlideshowSection) return;
    if (slideshowIndex >= slideshowCount) {
      setSlideshowIndex(0);
    }
  }, [isSlideshowSection, slideshowCount, slideshowIndex]);

  useEffect((): (() => void) | undefined => {
    if (!isSlideshowSection) return undefined;
    if (
      !slideshowAutoplay ||
      slideshowPaused ||
      slideshowCount <= 1 ||
      slideshowAutoplaySpeed <= 0
    ) {
      return undefined;
    }
    const interval = window.setInterval(
      goToNextSlideshow,
      slideshowAutoplaySpeed,
    );
    return (): void => window.clearInterval(interval);
  }, [
    isSlideshowSection,
    slideshowAutoplay,
    slideshowPaused,
    slideshowCount,
    slideshowAutoplaySpeed,
    goToNextSlideshow,
  ]);
  useEffect((): void => {
    if (!slideshowAllowPauseOnHover && slideshowPaused) {
      setSlideshowPaused(false);
    }
  }, [slideshowAllowPauseOnHover, slideshowPaused]);

  if (isHidden) {
    return null;
  }

  if (section.type === 'AnnouncementBar' || section.type === 'Block') {
    const isBlockSection = section.type === 'Block';
    const alignment =
      (section.settings['contentAlignment'] as string) || 'center';
    const alignmentClasses =
      alignment === 'left'
        ? 'justify-start text-left'
        : alignment === 'right'
          ? 'justify-end text-right'
          : 'justify-center text-center';
    const blockGap = getSpacingValue(section.settings['blockGap']);
    const direction = (section.settings['layoutDirection'] as string) || 'row';
    const wrapSetting = (section.settings['wrap'] as string) || 'wrap';
    const justifySetting =
      (section.settings['justifyContent'] as string) || 'inherit';
    const justifyContent =
      resolveJustifyContent(
        justifySetting === 'inherit' ? alignment : justifySetting,
      ) ??
      (alignment === 'center'
        ? 'center'
        : alignment === 'right'
          ? 'flex-end'
          : 'flex-start');
    const alignItems =
      resolveAlignItems(section.settings['alignItems']) ?? 'center';
    const flexDirClass = direction === 'column' ? 'flex-col' : 'flex-row';
    const wrapClass =
      direction === 'column'
        ? ''
        : wrapSetting === 'nowrap'
          ? 'flex-nowrap'
          : 'flex-wrap';

    const containerStyles: React.CSSProperties = {
      ...getSectionStyles(section.settings, colorSchemes),
      ...getTextAlign(section.settings['contentAlignment']),
    };
    const containerRingClass = inspectorActive
      ? isSectionSelected
        ? 'ring-4 ring-blue-500/65'
        : isSectionHovered
          ? 'ring-4 ring-blue-500/45'
          : 'hover:ring-1 hover:ring-inset hover:ring-border/40'
      : showEditorChrome
        ? isSectionSelected
          ? isInspecting
            ? 'ring-2 ring-inset ring-blue-500/60'
            : 'ring-2 ring-inset ring-blue-500/40'
          : 'hover:ring-1 hover:ring-inset hover:ring-border/40'
        : '';
    const sectionSelector = isBlockSection
      ? getCustomCssSelector(section.id)
      : null;
    const sectionCustomCss = isBlockSection
      ? buildScopedCustomCss(section.settings['customCss'], sectionSelector)
      : null;
    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={containerStyles}
        className={`relative w-full transition cursor-pointer ${containerRingClass} ${inspectorZ}${
          isBlockSection ? ` cms-node-${section.id}` : ''
        }`}
      >
        {sectionCustomCss ? (
          <style data-cms-custom-css={section.id}>{sectionCustomCss}</style>
        ) : null}
        {renderSectionActions()}
        {divider}
        <div
          className={getSectionContainerClass({
            fullWidth: layout?.fullWidth,
            maxWidthClass: 'max-w-6xl',
          })}
        >
          <div
            className={
              section.type === 'Block'
                ? `flex ${flexDirClass} ${wrapClass}`
                : `flex flex-wrap items-center gap-3 ${alignmentClasses}`
            }
            style={
              section.type === 'Block'
                ? { gap: `${blockGap}px`, justifyContent, alignItems }
                : undefined
            }
          >
            {section.blocks.length === 0 && section.type !== 'Block' ? (
              <p className="text-sm text-gray-400">Announcement bar</p>
            ) : section.blocks.length === 0 &&
              section.type === 'Block' &&
              showEditorChrome ? (
                <div className="flex min-h-[48px] items-center justify-center rounded border border-dashed border-gray-700/50 bg-gray-900/20 text-[10px] uppercase tracking-wider text-gray-600">
                Empty block
                </div>
              ) : (
                section.blocks.map((block: BlockInstance) => (
                  <PreviewBlockItem
                    key={block.id}
                    block={block}
                    isSelected={selectedNodeId === block.id}
                    contained
                  />
                ))
              )}
          </div>
        </div>
      </div>,
    );
  }

  // Helper to render blocks list
  const renderBlocks = (emptyText: string): React.ReactNode =>
    section.blocks.length === 0 ? (
      showEditorChrome ? (
        <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-border/50 text-sm text-gray-500">
          {emptyText}
        </div>
      ) : null
    ) : (
      <div className="space-y-2">
        {section.blocks.map((block: BlockInstance) => (
          <PreviewBlockItem
            key={block.id}
            block={block}
            isSelected={selectedNodeId === block.id}
            contained
          />
        ))}
      </div>
    );

  // Grid sections
  if (section.type === 'Grid') {
    const rowBlocks = section.blocks.filter(
      (b: BlockInstance) => b.type === 'Row',
    );
    const directColumns = section.blocks.filter(
      (b: BlockInstance) => b.type === 'Column',
    );
    // Legacy: ImageElements directly in grid that don't have background mode set
    const gridImageBlocks = section.blocks.filter(
      (b: BlockInstance) =>
        b.type === 'ImageElement' &&
        !isBackgroundModeImage(b, 'grid') &&
        !isBackgroundModeImage(b, 'row') &&
        !isBackgroundModeImage(b, 'column'),
    );
    // New: Collect all ImageElements with backgroundTarget: "grid" from entire block tree
    const gridBackgroundModeImages = collectBackgroundImages(
      section.blocks,
      'grid',
    );
    const sectionGap = (section.settings['gap'] as string) || 'medium';
    const rowGapSetting = section.settings['rowGap'] as string | undefined;
    const columnGapSetting = section.settings['columnGap'] as
      | string
      | undefined;
    const rowGapValue = resolveGapValue(rowGapSetting, sectionGap);
    const columnGapValue = resolveGapValue(columnGapSetting, sectionGap);
    const sectionGapClass = getGapClass(rowGapValue);
    const sectionGapStyle = getGapStyle(section.settings['rowGapPx']);
    const columnGapPx =
      typeof section.settings['columnGapPx'] === 'number' &&
      Number.isFinite(section.settings['columnGapPx'])
        ? section.settings['columnGapPx']
        : 0;
    const gridBackgroundSettings = section.settings['backgroundImage'] as
      | Record<string, unknown>
      | undefined;
    const hasGridBackgroundSetting = Boolean(
      (gridBackgroundSettings?.['src'] as string) || '',
    );
    const hasGridBackgroundLayers =
      gridImageBlocks.length > 0 || gridBackgroundModeImages.length > 0;
    const hasGridBackground =
      hasGridBackgroundSetting || hasGridBackgroundLayers;
    const rowCount =
      rowBlocks.length > 0
        ? rowBlocks.length
        : directColumns.length > 0
          ? 1
          : 0;
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
      'paddingTop',
      'paddingBottom',
      'paddingLeft',
      'paddingRight',
      'marginTop',
      'marginBottom',
      'marginLeft',
      'marginRight',
    ].every((key: string) => {
      const value = section.settings[key] as number | undefined;
      return !value || value === 0;
    });
    const isEmptyGrid =
      rowsToRender.length > 0 &&
      rowsToRender.every(({ row }: { row: BlockInstance }) => {
        const columns = (row.blocks ?? []).filter(
          (b: BlockInstance) => b.type === 'Column',
        );
        return (
          columns.length > 0 &&
          columns.every(
            (column: BlockInstance) => (column.blocks ?? []).length === 0,
          )
        );
      });
    const hasFixedHeights = rowsToRender.some(
      ({ row }: { row: BlockInstance }) => {
        const rowHeightMode =
          (row.settings?.['heightMode'] as string) || 'inherit';
        const rowHeight = (row.settings?.['height'] as number) || 0;
        if (rowHeightMode === 'fixed' && rowHeight > 0) return true;
        const columns = (row.blocks ?? []).filter(
          (b: BlockInstance) => b.type === 'Column',
        );
        return columns.some((column: BlockInstance) => {
          const columnHeightMode =
            (column.settings?.['heightMode'] as string) || 'inherit';
          const columnHeight = (column.settings?.['height'] as number) || 0;
          return columnHeightMode === 'fixed' && columnHeight > 0;
        });
      },
    );
    const sectionSelector = getCustomCssSelector(section.id);
    const sectionCustomCss = buildScopedCustomCss(
      section.settings['customCss'],
      sectionSelector,
    );

    if (rowsToRender.length === 0 && !showEditorChrome) {
      return null;
    }

    return wrapInspector(
      <div
        role="button"
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
        <div
          className={`relative ${hasGridBackground ? 'overflow-hidden' : ''}`}
        >
          {/* Legacy: ImageElements directly in grid without background mode */}
          {gridImageBlocks.map((block: BlockInstance) => (
            <React.Fragment key={`grid-background-${block.id}`}>
              {renderBackgroundImageLayer(block.settings, mediaStyles)}
            </React.Fragment>
          ))}
          {/* New: ImageElements with backgroundTarget: "grid" */}
          {gridBackgroundModeImages.map((block: BlockInstance) => (
            <React.Fragment key={`grid-bg-mode-${block.id}`}>
              {renderBackgroundImageLayer(block.settings, mediaStyles)}
            </React.Fragment>
          ))}
          {hasGridBackgroundSetting &&
            renderBackgroundImageLayer(gridBackgroundSettings, mediaStyles)}
          <div className="relative z-10">
            {rowsToRender.length === 0 ? (
              showEditorChrome ? (
                <div className="flex min-h-[60px] items-center justify-center text-sm text-gray-500">
                  No rows
                </div>
              ) : null
            ) : showEditorChrome &&
              isEmptyGrid &&
              hasZeroSpacing &&
              !hasFixedHeights ? (
                <div className="h-px w-full bg-border/40" />
              ) : (
                <div
                  className={getSectionContainerClass({
                    fullWidth: layout?.fullWidth,
                  })}
                >
                  <div
                    className={`flex flex-col ${sectionGapClass}`}
                    style={sectionGapStyle}
                  >
                    {rowsToRender.map(
                      (
                        {
                          row,
                          virtual,
                        }: { row: BlockInstance; virtual: boolean },
                        rowIndex: number,
                      ) => {
                        const rowColumns = (row.blocks ?? []).filter(
                          (b: BlockInstance) => b.type === 'Column',
                        );
                        const columnCount = Math.max(1, rowColumns.length);
                        const rowHasContent = rowColumns.some(
                          (column: BlockInstance) =>
                            (column.blocks ?? []).length > 0,
                        );
                        const isRowSelected =
                        showEditorChrome &&
                        !virtual &&
                        selectedNodeId === row.id;
                        const rowGapValue = resolveGapValue(
                          row.settings?.['gap'],
                          columnGapValue,
                        );
                        const rowGapClass = rowHasContent
                          ? getGapClass(rowGapValue)
                          : 'gap-0';
                        const rowGapPxRaw = row.settings?.['gapPx'];
                        const rowGapPx =
                        typeof rowGapPxRaw === 'number' &&
                        Number.isFinite(rowGapPxRaw) &&
                        rowGapPxRaw > 0
                          ? rowGapPxRaw
                          : columnGapPx;
                        const rowGapStyle = getGapStyle(rowGapPx);
                        const rowJustify = resolveJustifyContent(
                          row.settings?.['justifyContent'],
                        );
                        const rowAlign = resolveAlignItems(
                          row.settings?.['alignItems'],
                        );
                        const rowStyles = getSectionStyles(
                          row.settings ?? {},
                          colorSchemes,
                        );
                        const rowHeightMode =
                        (row.settings?.['heightMode'] as string) || 'inherit';
                        const rowHeight =
                        (row.settings?.['height'] as number) || 0;
                        const rowHeightStyle =
                        rowHeightMode === 'fixed' && rowHeight > 0
                          ? { height: `${rowHeight}px` }
                          : undefined;
                        const rowSelector = getCustomCssSelector(row.id);
                        const rowCustomCss = buildScopedCustomCss(
                          row.settings?.['customCss'],
                          rowSelector,
                        );
                        // Row background mode images
                        const rowBackgroundModeImages = collectBackgroundImages(
                          row.blocks ?? [],
                          'row',
                        );
                        const rowBackgroundSettings = row.settings?.[
                          'backgroundImage'
                        ] as Record<string, unknown> | undefined;
                        const hasRowBackgroundSetting = Boolean(
                          (rowBackgroundSettings?.['src'] as string) || '',
                        );
                        const hasRowBackgroundMode =
                        rowBackgroundModeImages.length > 0;
                        const hasRowBackground =
                        hasRowBackgroundSetting || hasRowBackgroundMode;
                        const rowContainer = (
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
                              isRowSelected
                                ? 'ring-1 ring-inset ring-blue-500/40'
                                : ''
                            } ${showEditorChrome && !isRowSelected ? 'border border-dashed border-gray-800/40' : ''}`}
                          >
                            {rowCustomCss ? (
                              <style data-cms-custom-css={row.id}>
                                {rowCustomCss}
                              </style>
                            ) : null}
                            {/* Row background mode images */}
                            {rowBackgroundModeImages.map(
                              (block: BlockInstance) => (
                                <React.Fragment key={`row-bg-mode-${block.id}`}>
                                  {renderBackgroundImageLayer(
                                    block.settings,
                                    mediaStyles,
                                  )}
                                </React.Fragment>
                              ),
                            )}
                            {hasRowBackgroundSetting &&
                            renderBackgroundImageLayer(
                              rowBackgroundSettings,
                              mediaStyles,
                            )}
                            {!virtual &&
                            isRowSelected &&
                            onRemoveRow &&
                            showEditorChrome && (
                              <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full border border-border/40 bg-gray-900/80 px-1.5 py-1 text-xs text-gray-200 shadow-sm">
                                <button
                                  type="button"
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    if (!canRemoveRow) return;
                                    onRemoveRow(section.id, row.id);
                                  }}
                                  disabled={!canRemoveRow}
                                  className="rounded p-1 text-gray-300 hover:text-red-200 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                  title={
                                    canRemoveRow
                                      ? 'Remove row'
                                      : 'At least one row is required'
                                  }
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            )}
                            <div
                              className={`relative z-10 grid ${rowGapClass}`}
                              style={{
                                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                                ...(rowHeightMode === 'fixed' && rowHeight > 0
                                  ? { height: '100%' }
                                  : {}),
                                ...(rowGapStyle ?? {}),
                                ...(rowJustify
                                  ? { justifyContent: rowJustify }
                                  : {}),
                                ...(rowAlign ? { alignItems: rowAlign } : {}),
                              }}
                            >
                              {rowColumns.map(
                                (column: BlockInstance, colIndex: number) => {
                                  const isColumnSelected =
                                  showEditorChrome &&
                                  selectedNodeId === column.id;
                                  const isColumnHovered =
                                  showEditorChrome &&
                                  isInspecting &&
                                  hoveredNodeId === column.id;
                                  const columnHoverClass =
                                  isColumnHovered && !isColumnSelected
                                    ? 'ring-1 ring-inset ring-blue-500/30'
                                    : '';
                                  const columnHeightMode =
                                  (column.settings?.['heightMode'] as string) ||
                                  'inherit';
                                  const columnHeight =
                                  (column.settings?.['height'] as number) || 0;
                                  const columnGapValue = resolveGapValue(
                                    column.settings?.['gap'],
                                    'medium',
                                  );
                                  const columnGapClass =
                                  getGapClass(columnGapValue);
                                  const columnGapStyle = getGapStyle(
                                    column.settings?.['gapPx'],
                                  );
                                  const columnJustify = resolveJustifyContent(
                                    column.settings?.['justifyContent'],
                                  );
                                  const columnAlign = resolveAlignItems(
                                    column.settings?.['alignItems'],
                                  );
                                  const columnSelector = getCustomCssSelector(
                                    column.id,
                                  );
                                  const columnCustomCss = buildScopedCustomCss(
                                    column.settings?.['customCss'],
                                    columnSelector,
                                  );
                                  const columnStyles = {
                                    ...getSectionStyles(
                                      column.settings ?? {},
                                      colorSchemes,
                                    ),
                                    ...getTextAlign(
                                      column.settings?.['textAlign'],
                                    ),
                                  };
                                  const columnStyle: React.CSSProperties = {};
                                  if (
                                    columnHeightMode === 'fixed' &&
                                  columnHeight > 0
                                  ) {
                                    columnStyle.height = `${columnHeight}px`;
                                  } else if (
                                    rowHeightMode === 'fixed' &&
                                  rowHeight > 0
                                  ) {
                                    columnStyle.height = '100%';
                                  }
                                  // Column background mode images
                                  const columnBlocks = column.blocks ?? [];
                                  const columnBackgroundModeImages =
                                  columnBlocks.filter((b: BlockInstance) =>
                                    isBackgroundModeImage(b, 'column'),
                                  );
                                  const columnBackgroundSettings = column
                                    .settings?.['backgroundImage'] as
                                  | Record<string, unknown>
                                  | undefined;
                                  const hasColumnBackgroundSetting = Boolean(
                                    (columnBackgroundSettings?.[
                                      'src'
                                    ] as string) || '',
                                  );
                                  const hasColumnBackgroundMode =
                                  columnBackgroundModeImages.length > 0;
                                  const hasColumnBackground =
                                  hasColumnBackgroundSetting ||
                                  hasColumnBackgroundMode;
                                  const columnTooltip = (
                                    <InspectorTooltip
                                      title="Column"
                                      sections={[
                                        {
                                          title: 'Meta',
                                          entries:
                                          inspectorSettings.showIdentifiers
                                            ? [
                                              {
                                                label: 'Type',
                                                value: 'Column',
                                              },
                                              {
                                                label: 'ID',
                                                value: column.id,
                                              },
                                            ]
                                            : [
                                              {
                                                label: 'Type',
                                                value: 'Column',
                                              },
                                            ],
                                        },
                                        ...(inspectorSettings.showStructureInfo
                                          ? [
                                            {
                                              title: 'Structure',
                                              entries: [
                                                {
                                                  label: 'Section',
                                                  value: section.type,
                                                },
                                                {
                                                  label: 'Zone',
                                                  value: section.zone,
                                                },
                                                {
                                                  label: 'Row',
                                                  value: String(rowIndex + 1),
                                                },
                                                {
                                                  label: 'Column',
                                                  value: String(colIndex + 1),
                                                },
                                              ],
                                            },
                                          ]
                                          : []),
                                        ...(inspectorSettings.showConnectionInfo
                                          ? [
                                            {
                                              title: 'Connection',
                                              entries:
                                                ((): InspectorEntry[] => {
                                                  const connection = column
                                                    .settings['connection'] as
                                                    | {
                                                        enabled?: boolean;
                                                        source?: string;
                                                        path?: string;
                                                        fallback?: string;
                                                      }
                                                    | undefined;
                                                  if (!connection) return [];
                                                  const entries: InspectorEntry[] =
                                                    [
                                                      {
                                                        label: 'Enabled',
                                                        value:
                                                          connection.enabled
                                                            ? 'Yes'
                                                            : 'No',
                                                      },
                                                    ];
                                                  if (connection.source)
                                                    entries.push({
                                                      label: 'Source',
                                                      value: connection.source,
                                                    });
                                                  if (connection.path)
                                                    entries.push({
                                                      label: 'Path',
                                                      value: connection.path,
                                                    });
                                                  if (connection.fallback)
                                                    entries.push({
                                                      label: 'Fallback',
                                                      value:
                                                        connection.fallback,
                                                    });
                                                  return entries;
                                                })(),
                                            },
                                          ]
                                          : []),
                                        ...(inspectorSettings.showStyleSettings
                                          ? [
                                            {
                                              title: 'Styles',
                                              entries: buildStyleEntries(
                                                column.settings ?? {},
                                              ),
                                            },
                                          ]
                                          : []),
                                      ]}
                                    />
                                  );
                                  return (
                                    <InspectorHover
                                      key={column.id}
                                      nodeId={column.id}
                                      fallbackNodeId={section.id}
                                      content={columnTooltip}
                                      className="w-full"
                                    >
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e: React.MouseEvent): void => {
                                          e.stopPropagation();
                                          onSelect(column.id);
                                        }}
                                        onKeyDown={(
                                          e: React.KeyboardEvent,
                                        ): void => {
                                          if (
                                            e.key === 'Enter' ||
                                          e.key === ' '
                                          ) {
                                            e.stopPropagation();
                                            onSelect(column.id);
                                          }
                                        }}
                                        style={{
                                          ...columnStyles,
                                          ...columnStyle,
                                        }}
                                        className={`relative h-full text-left transition cursor-pointer cms-node-${column.id} ${
                                          isColumnSelected
                                            ? 'ring-1 ring-inset ring-blue-500/40'
                                            : ''
                                        } ${columnHoverClass} ${hasColumnBackground ? 'overflow-hidden' : ''} ${
                                          showEditorChrome &&
                                        !isColumnSelected &&
                                        !isColumnHovered
                                            ? 'border-x border-dashed border-gray-800/30'
                                            : ''
                                        }`}
                                      >
                                        {columnCustomCss ? (
                                          <style data-cms-custom-css={column.id}>
                                            {columnCustomCss}
                                          </style>
                                        ) : null}
                                        {/* Column background mode images */}
                                        {columnBackgroundModeImages.map(
                                          (block: BlockInstance) => (
                                            <React.Fragment
                                              key={`col-bg-mode-${block.id}`}
                                            >
                                              {renderBackgroundImageLayer(
                                                block.settings,
                                                mediaStyles,
                                              )}
                                            </React.Fragment>
                                          ),
                                        )}
                                        {hasColumnBackgroundSetting &&
                                        renderBackgroundImageLayer(
                                          columnBackgroundSettings,
                                          mediaStyles,
                                        )}
                                        {(column.blocks ?? []).length > 0 ? (
                                          ((): React.ReactNode => {
                                          // Filter out background mode images from regular rendering
                                            const contentBlocks =
                                            columnBlocks.filter(
                                              (b: BlockInstance) => {
                                                if (b.type !== 'ImageElement')
                                                  return true;
                                                const bgTarget =
                                                  (b.settings?.[
                                                    'backgroundTarget'
                                                  ] as string) || 'none';
                                                return bgTarget === 'none';
                                              },
                                            );
                                            if (
                                              contentBlocks.length === 0 &&
                                            showEditorChrome
                                            ) {
                                              return (
                                                <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-gray-700/50 bg-gray-900/20 text-[10px] uppercase tracking-wider text-gray-600">
                                                Column
                                                </div>
                                              );
                                            }
                                            const isSingleBlock =
                                            contentBlocks.length === 1;
                                            const shouldStretch =
                                            isSingleBlock &&
                                            (rowHeightMode === 'fixed' ||
                                              columnHeightMode === 'fixed');
                                            const resolvedGapClass = shouldStretch
                                              ? ''
                                              : columnGapClass;
                                            const resolvedGapStyle = shouldStretch
                                              ? undefined
                                              : columnGapStyle;
                                            return (
                                              <BlockContextProvider value={{ columnId: column.id }}>
                                                <div
                                                  className={`relative z-10 flex flex-col ${shouldStretch ? 'h-full' : resolvedGapClass} ${
                                                    isInspecting
                                                      ? ''
                                                      : 'pointer-events-none'
                                                  }`}
                                                  style={{
                                                    ...(resolvedGapStyle ?? {}),
                                                    ...(columnJustify
                                                      ? {
                                                        justifyContent:
                                                          columnJustify,
                                                      }
                                                      : {}),
                                                    ...(columnAlign
                                                      ? { alignItems: columnAlign }
                                                      : {}),
                                                }}
                                                >
                                                  {contentBlocks.map(
                                                    (
                                                      block: BlockInstance,
                                                      blockIndex: number,
                                                    ) => (
                                                      <div
                                                        key={block.id}
                                                        className={
                                                          shouldStretch
                                                            ? 'flex-1'
                                                            : ''
                                                        }
                                                        style={{
                                                          minHeight: `${getBlockMinHeight(block.type)}px`,
                                                          ...(shouldStretch
                                                            ? { height: '100%' }
                                                            : {}),
                                                          position: 'relative',
                                                          zIndex:
                                                          contentBlocks.length -
                                                          blockIndex,
                                                        }}
                                                      >
                                                        <PreviewBlockItem
                                                          block={block}
                                                          isSelected={
                                                            selectedNodeId ===
                                                          block.id
                                                          }
                                                          contained
                                                          stretch={shouldStretch}
                                                        />
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </BlockContextProvider>
                                            );
                                          })()
                                        ) : showEditorChrome ? (
                                          <div className="flex min-h-[60px] items-center justify-center rounded border border-dashed border-gray-700/50 bg-gray-900/20 text-[10px] uppercase tracking-wider text-gray-600">
                                          Column
                                          </div>
                                        ) : null}
                                      </div>
                                    </InspectorHover>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        );
                        return <div key={row.id}>{rowContainer}</div>;
                      },
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>,
    );
  }

  // ImageWithText section — side-by-side image + content
  if (section.type === 'ImageWithText') {
    const placement = section.settings['desktopImagePlacement'] as
      | string
      | undefined;
    const imageFirst = placement !== 'image-second';
    const contentPosition = section.settings['desktopContentPosition'] as
      | string
      | undefined;
    const verticalClass = getVerticalAlign(contentPosition);
    const imageHeight = (section.settings['imageHeight'] as string) || 'medium';
    const imgHeightClass =
      imageHeight === 'small'
        ? 'min-h-[200px]'
        : imageHeight === 'large'
          ? 'min-h-[500px]'
          : 'min-h-[350px]';

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer group ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        {showEditorChrome && onOpenMedia && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia({
                kind: 'section',
                sectionId: section.id ?? '',
                key: 'image',
              });
            }}
            className="absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
        <div
          className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}
        >
          <div
            className={`flex flex-col gap-8 md:gap-12 ${imageFirst ? 'md:flex-row' : 'md:flex-row-reverse'} ${verticalClass}`}
          >
            <div
              className={`cms-media relative w-full md:w-1/2 ${imgHeightClass}`}
              style={mediaStyles ?? undefined}
            >
              {sectionImage ? (
                <NextImage
                  src={sectionImage}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  unoptimized
                />
              ) : showEditorChrome ? (
                <div
                  className={`flex ${imgHeightClass} w-full items-center justify-center bg-gray-800`}
                >
                  <ImageIcon className="size-16 text-gray-600" />
                </div>
              ) : null}
            </div>
            <div className="flex w-full flex-col justify-center gap-4 md:w-1/2">
              {section.blocks.length > 0 ? (
                section.blocks.map((block: BlockInstance) => (
                  <PreviewBlockItem
                    key={block.id}
                    block={block}
                    isSelected={selectedNodeId === block.id}
                    contained
                  />
                ))
              ) : showEditorChrome ? (
                <p className="text-gray-500">Add content blocks</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>,
    );
  }

  // Hero section — full-width banner with centered content overlay
  if (section.type === 'Hero') {
    const imageHeight = (section.settings['imageHeight'] as string) || 'large';
    const heightClass =
      imageHeight === 'small'
        ? 'min-h-[300px]'
        : imageHeight === 'large'
          ? 'min-h-[600px]'
          : 'min-h-[450px]';

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer group ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        {showEditorChrome && onOpenMedia && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia({
                kind: 'section',
                sectionId: section.id ?? '',
                key: 'image',
              });
            }}
            className="absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
        <div
          className={`cms-media relative w-full ${heightClass} flex items-center justify-center overflow-hidden`}
          style={mediaStyles ?? undefined}
        >
          {sectionImage ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${sectionImage})` }}
            >
              <div className="absolute inset-0 bg-black/50" />
            </div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          <div
            className={`relative z-10 ${getSectionContainerClass({
              fullWidth: layout?.fullWidth,
              maxWidthClass: 'max-w-3xl',
              paddingClass: 'px-6',
            })} text-center`}
          >
            <div className="space-y-4">
              {section.blocks.map((block: BlockInstance) => (
                <PreviewBlockItem
                  key={block.id}
                  block={block}
                  isSelected={selectedNodeId === block.id}
                  contained
                />
              ))}
            </div>
            {section.blocks.length === 0 && (
              <p className="text-lg text-gray-400">Hero section</p>
            )}
          </div>
        </div>
      </div>,
    );
  }

  // RichText section
  if (section.type === 'RichText') {
    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative group w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {showEditorChrome && onOpenMedia && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia({
                kind: 'section',
                sectionId: section.id ?? '',
                key: 'src',
              });
            }}
            className="absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
        {divider}
        <div
          className={getSectionContainerClass({
            fullWidth: layout?.fullWidth,
            maxWidthClass: 'max-w-3xl',
          })}
        >
          <div className="space-y-4">
            {section.blocks.map((block: BlockInstance) => (
              <PreviewBlockItem
                key={block.id}
                block={block}
                isSelected={selectedNodeId === block.id}
                contained
              />
            ))}
            {showEditorChrome && section.blocks.length === 0 && (
              <p className="text-gray-500">Rich text section</p>
            )}
          </div>
        </div>
      </div>,
    );
  }

  // Text element section
  if (section.type === 'TextElement') {
    const text = (section.settings['textContent'] as string) || '';
    const typoStyles = getBlockTypographyStyles(section.settings);
    const hasText = text.trim().length > 0;
    const showPlaceholder = !hasText && showEditorChrome;
    if (!hasText && !showEditorChrome) {
      return null;
    }
    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={getSectionStyles(section.settings, colorSchemes)}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        {hasText ? (
          <p
            className="m-0 p-0 text-base leading-relaxed text-gray-200"
            style={typoStyles}
          >
            {text}
          </p>
        ) : showPlaceholder ? (
          <div className="rounded border border-dashed border-border/40 bg-gray-800/20 px-3 py-2 text-sm text-gray-500">
            Text element
          </div>
        ) : (
          <div className="min-h-[1px]" />
        )}
      </div>,
    );
  }

  // Image element section
  if (section.type === 'ImageElement') {
    const src = (section.settings['src'] as string) || '';
    const alt = (section.settings['alt'] as string) || 'Image';
    const presentation = buildImageElementPresentation(
      section.settings,
      mediaStyles,
    );
    const sectionStyles = getSectionStyles(section.settings, colorSchemes);
    if ('width' in section.settings) {
      delete sectionStyles.width;
    }
    const hasSrc = Boolean(src);
    if (!hasSrc && !showEditorChrome) {
      return null;
    }

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {showEditorChrome && onOpenMedia && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia({
                kind: 'section',
                sectionId: section.id ?? '',
                key: 'src',
              });
            }}
            className="absolute left-3 top-3 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
        {divider}
        {hasSrc ? (
          <div className="relative" style={presentation.wrapperStyles}>
            <NextImage
              src={src}
              alt={alt}
              fill
              style={{
                objectFit: presentation.imageStyles.objectFit,
                objectPosition: presentation.imageStyles.objectPosition,
                opacity: presentation.imageStyles.opacity,
                filter: presentation.imageStyles.filter,
                transform: presentation.imageStyles.transform,
                display: 'block',
              }}
            />
            {presentation.hasOverlay && (
              <div
                className="pointer-events-none absolute inset-0"
                style={presentation.overlayStyles}
              />
            )}
          </div>
        ) : showEditorChrome ? (
          <div
            className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
            style={presentation.wrapperStyles}
          >
            No image selected
          </div>
        ) : null}
      </div>,
    );
  }

  // 3D element section
  if (section.type === 'Model3DElement' || section.type === 'Model3D') {
    const assetId = (section.settings['assetId'] as string) || '';
    const height = getSpacingValue(section.settings['height']) || 360;
    const sectionStyles = getSectionStyles(section.settings, colorSchemes);
    if ('width' in sectionStyles) {
      delete sectionStyles.width;
    }
    if ('maxWidth' in sectionStyles) {
      delete sectionStyles.maxWidth;
    }
    const hasAsset = assetId.trim().length > 0;
    if (!hasAsset && !showEditorChrome) {
      return null;
    }

    if (hasAsset) {
      const modelUrl = `/api/assets3d/${assetId}/file`;

      return wrapInspector(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === 'Enter' || e.key === ' ') handleSelect();
          }}
          style={sectionStyles}
          className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
        >
          {renderSectionActions()}
          {divider}
          <MemoizedViewer3D
            modelUrl={modelUrl}
            height={height}
            backgroundColor={
              (section.settings['backgroundColor'] as string) || '#111827'
            }
            autoRotate={toBoolean(section.settings['autoRotate'], true)}
            autoRotateSpeed={toNumber(section.settings['autoRotateSpeed'], 2)}
            environment={
              (section.settings['environment'] as EnvironmentPreset) || 'studio'
            }
            lighting={
              (section.settings['lighting'] as LightingPreset) || 'studio'
            }
            lightIntensity={toNumber(section.settings['lightIntensity'], 1)}
            enableShadows={toBoolean(section.settings['enableShadows'], true)}
            enableBloom={toBoolean(section.settings['enableBloom'], false)}
            bloomIntensity={toNumber(section.settings['bloomIntensity'], 0.5)}
            exposure={toNumber(section.settings['exposure'], 1)}
            showGround={toBoolean(section.settings['showGround'], false)}
            enableContactShadows={toBoolean(
              section.settings['enableContactShadows'],
              true,
            )}
            enableVignette={toBoolean(
              section.settings['enableVignette'],
              false,
            )}
            autoFit={toBoolean(section.settings['autoFit'], true)}
            presentationMode={toBoolean(
              section.settings['presentationMode'],
              false,
            )}
            positionX={toNumber(section.settings['positionX'], 0)}
            positionY={toNumber(section.settings['positionY'], 0)}
            positionZ={toNumber(section.settings['positionZ'], 0)}
            rotationX={toNumber(section.settings['rotationX'], 0)}
            rotationY={toNumber(section.settings['rotationY'], 0)}
            rotationZ={toNumber(section.settings['rotationZ'], 0)}
            scale={toNumber(section.settings['scale'], 1)}
          />
        </div>,
      );
    }

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        <div
          className="flex items-center justify-center rounded border border-dashed border-border/40 bg-gray-900/40 text-xs text-gray-400"
          style={{ height: `${Math.max(120, height)}px` }}
        >
          No 3D asset selected
        </div>
      </div>,
    );
  }

  // Button element section
  if (section.type === 'ButtonElement') {
    const label = (section.settings['buttonLabel'] as string) || 'Button';
    const style = (section.settings['buttonStyle'] as string) || 'solid';
    const customStyles: React.CSSProperties = {};
    const fontFamily = section.settings['fontFamily'] as string | undefined;
    const fontSize = section.settings['fontSize'] as number | undefined;
    const fontWeight = section.settings['fontWeight'] as string | undefined;
    const textColor = section.settings['textColor'] as string | undefined;
    const bgColor = section.settings['bgColor'] as string | undefined;
    const borderColor = section.settings['borderColor'] as string | undefined;
    const borderRadius = section.settings['borderRadius'] as number | undefined;
    const borderWidth = section.settings['borderWidth'] as number | undefined;

    if (fontFamily) customStyles.fontFamily = fontFamily;
    if (fontSize && fontSize > 0) customStyles.fontSize = `${fontSize}px`;
    if (fontWeight) customStyles.fontWeight = fontWeight;
    if (textColor) customStyles.color = textColor;
    if (bgColor) customStyles.backgroundColor = bgColor;
    if (borderColor) customStyles.borderColor = borderColor;
    if (borderRadius && borderRadius > 0)
      customStyles.borderRadius = `${borderRadius}px`;
    if (borderWidth && borderWidth > 0)
      customStyles.borderWidth = `${borderWidth}px`;

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={getSectionStyles(section.settings, colorSchemes)}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        <div
          className={`inline-block rounded-md px-4 py-1.5 text-sm font-medium ${
            style === 'outline'
              ? 'border border-gray-400 text-gray-300'
              : 'bg-gray-200 text-gray-900'
          }`}
          style={customStyles}
        >
          {label}
        </div>
      </div>,
    );
  }

  // Text atom section
  if (section.type === 'TextAtom') {
    const text = (section.settings['text'] as string) || '';
    const alignment = (section.settings['alignment'] as string) || 'left';
    const letterGap = (section.settings['letterGap'] as number) || 0;
    const lineGap = (section.settings['lineGap'] as number) || 0;
    const wrap = (section.settings['wrap'] as string) || 'wrap';
    const letters = (section.blocks ?? []).length
      ? (section.blocks ?? [])
      : Array.from(text).map(
        (char: string, index: number): BlockInstance => ({
          id: `text-atom-${section.id}-${index}`,
          type: 'TextAtomLetter',
          settings: { textContent: char },
        }),
      );

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

    if (letters.length === 0 && !showEditorChrome) {
      return null;
    }

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={getSectionStyles(section.settings, colorSchemes)}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        {letters.length === 0 ? (
          showEditorChrome ? (
            <div className="rounded border border-dashed border-border/40 bg-gray-800/20 p-2 text-xs text-gray-500">
              Text atoms
            </div>
          ) : null
        ) : showEditorChrome ? (
          <div className="rounded border border-dashed border-border/40 bg-gray-800/20 p-2">
            <div style={containerStyle}>
              {letters.map((letter: BlockInstance) => (
                <PreviewBlockItem
                  key={letter.id}
                  block={letter}
                  isSelected={selectedNodeId === letter.id}
                  contained
                />
              ))}
            </div>
          </div>
        ) : (
          <div style={containerStyle}>
            {letters.map((letter: BlockInstance) => (
              <PreviewBlockItem
                key={letter.id}
                block={letter}
                isSelected={selectedNodeId === letter.id}
                contained
              />
            ))}
          </div>
        )}
      </div>,
    );
  }

  // Accordion section
  if (section.type === 'Accordion') {
    const items: { heading: BlockInstance; text?: BlockInstance }[] = [];
    let i = 0;
    while (i < section.blocks.length) {
      const current = section.blocks[i];
      if (!current) {
        i += 1;
        continue;
      }
      if (current.type === 'Heading') {
        const next = section.blocks[i + 1];
        if (next && next.type === 'Text') {
          items.push({ heading: current, text: next });
          i += 2;
        } else {
          items.push({ heading: current });
          i += 1;
        }
      } else {
        i += 1;
      }
    }

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        {items.length === 0 ? (
          showEditorChrome ? (
            <div
              className={getSectionContainerClass({
                fullWidth: layout?.fullWidth,
              })}
            >
              <p className="text-gray-500 text-center py-8">
                Add Heading and Text blocks to create accordion items
              </p>
            </div>
          ) : null
        ) : (
          <div
            className={getSectionContainerClass({
              fullWidth: layout?.fullWidth,
              maxWidthClass: 'max-w-3xl',
            })}
          >
            <div className="divide-y divide-gray-700/50">
              {items.map(
                (
                  item: { heading: BlockInstance; text?: BlockInstance },
                  index: number,
                ) => (
                  <div key={item.heading.id} className="py-4">
                    <div className="flex w-full items-center justify-between text-left">
                      <PreviewBlockItem
                        block={item.heading}
                        isSelected={selectedNodeId === item.heading.id}
                        contained
                      />
                      <span className="ml-4 shrink-0 text-gray-400 text-xl">
                        {index === 0 ? '−' : '+'}
                      </span>
                    </div>
                    {index === 0 && item.text && (
                      <div className="mt-3">
                        <PreviewBlockItem
                          block={item.text}
                          isSelected={selectedNodeId === item.text.id}
                          contained
                        />                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>
        )}
      </div>,
    );
  }

  // Testimonials section
  if (section.type === 'Testimonials') {
    const columns = (section.settings['columns'] as number) || 3;

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        {section.blocks.length === 0 ? (
          showEditorChrome ? (
            <div className="container mx-auto px-4 md:px-6">
              <p className="text-gray-500 text-center py-8">
                Add blocks to create testimonial cards
              </p>
            </div>
          ) : null
        ) : (
          <div
            className={getSectionContainerClass({
              fullWidth: layout?.fullWidth,
            })}
          >
            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {section.blocks.map((block: BlockInstance) => (
                <div
                  key={block.id}
                  className="cms-hover-card rounded-xl border border-gray-700/50 bg-gray-800/30 p-6"
                >
                  <svg
                    className="mb-4 size-6 text-gray-500"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
                  </svg>
                  <PreviewBlockItem
                    block={block}
                    isSelected={selectedNodeId === block.id}
                    contained
                  />                </div>
              ))}
            </div>
          </div>
        )}
      </div>,
    );
  }

  // Video section
  if (section.type === 'Video') {
    const videoUrl = (section.settings['videoUrl'] as string) || '';
    const ratio = (section.settings['aspectRatio'] as string) || '16:9';
    const autoplay = (section.settings['autoplay'] as string) === 'yes';

    const getEmbedUrl = (url: string): string | null => {
      if (!url) return null;
      const ytMatch = url.match(
        /(?:youtube.com\/watch\?v=|youtu.be\/|youtube.com\/embed\/)([^&?#]+)/,
      );
      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
      const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      if (url.includes('embed') || url.includes('player')) return url;
      return null;
    };

    const getAspectPadding = (aspect: string): string => {
      switch (aspect) {
        case '4:3':
          return '75%';
        case '1:1':
          return '100%';
        default:
          return '56.25%';
      }
    };

    const embedUrl = getEmbedUrl(videoUrl);

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        <div
          className={getSectionContainerClass({
            fullWidth: layout?.fullWidth,
            maxWidthClass: 'max-w-4xl',
          })}
        >
          {embedUrl ? (
            <div
              className="cms-media relative w-full"
              style={{
                paddingBottom: getAspectPadding(ratio),
                ...(mediaStyles ?? {}),
              }}
            >
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`${embedUrl}${autoplay ? '?autoplay=1&mute=1' : ''}`}
                title="Embedded video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : showEditorChrome ? (
            <div
              className="cms-media flex items-center justify-center bg-gray-800/50"
              style={{
                paddingBottom: getAspectPadding(ratio),
                position: 'relative',
                ...(mediaStyles ?? {}),
              }}
            >
              <p className="absolute inset-0 flex items-center justify-center text-gray-500">
                Enter a video URL in section settings
              </p>
            </div>
          ) : null}
        </div>
      </div>,
    );
  }

  // Slideshow section
  if (section.type === 'Slideshow') {
    const showArrows = (section.settings['showArrows'] as string) !== 'no';
    const showDots = (section.settings['showDots'] as string) !== 'no';
    const heightMode = (section.settings['heightMode'] as string) || 'auto';
    const height = (section.settings['height'] as number) || 360;
    const frames = slideshowFrames;
    const slideCount = frames.length;
    const slideHeightStyle: React.CSSProperties | undefined =
      heightMode === 'fixed' && height > 0
        ? { height: `${height}px` }
        : undefined;

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        {slideCount === 0 ? (
          showEditorChrome ? (
            <div className="container mx-auto px-4 md:px-6">
              <p className="text-gray-500 text-center py-12">
                Add blocks to create slideshow slides
              </p>
            </div>
          ) : null
        ) : (
          <div
            className={getSectionContainerClass({
              fullWidth: true,
              paddingClass: 'px-0',
            })}
          >
            <div
              className="relative overflow-hidden min-h-[300px]"
              style={slideHeightStyle}
              onMouseEnter={
                slideshowAllowPauseOnHover
                  ? (): void => setSlideshowPaused(true)
                  : undefined
              }
              onMouseLeave={
                slideshowAllowPauseOnHover
                  ? (): void => setSlideshowPaused(false)
                  : undefined
              }
            >
              {frames.map((frame: BlockInstance, idx: number) => {
                const frameSettings = (frame.settings ?? {}) as Record<
                  string,
                  unknown
                >;
                const backgroundColor =
                  (frameSettings['backgroundColor'] as string) || '';
                const contentAlignment =
                  (frameSettings['contentAlignment'] as string) || 'center';
                const verticalAlignment =
                  (frameSettings['verticalAlignment'] as string) || 'center';
                const fillContent =
                  frameSettings['fillContent'] === true ||
                  frameSettings['fillContent'] === 'yes';
                const paddingTop = (frameSettings['paddingTop'] as number) || 0;
                const paddingBottom =
                  (frameSettings['paddingBottom'] as number) || 0;
                const paddingLeft =
                  (frameSettings['paddingLeft'] as number) || 0;
                const paddingRight =
                  (frameSettings['paddingRight'] as number) || 0;
                const frameStyle: React.CSSProperties = {
                  backgroundColor: backgroundColor || undefined,
                  padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
                  alignItems:
                    contentAlignment === 'center'
                      ? 'center'
                      : contentAlignment === 'right'
                        ? 'flex-end'
                        : 'flex-start',
                  justifyContent:
                    verticalAlignment === 'center'
                      ? 'center'
                      : verticalAlignment === 'bottom'
                        ? 'flex-end'
                        : 'flex-start',
                };
                const frameAnimType = frameSettings['animationType'] as
                  | string
                  | undefined;
                const animationType =
                  frameAnimType === 'inherit' || !frameAnimType
                    ? slideshowElementAnimationType
                    : frameAnimType;
                const resolvedAnimationType =
                  normalizeSlideshowAnimationType(animationType);
                const animationDuration =
                  (frameSettings['animationDuration'] as number) ??
                  slideshowElementAnimationDuration;
                const animationDelay =
                  (frameSettings['animationDelay'] as number) ??
                  slideshowElementAnimationDelay;
                const frameAnimEasing = frameSettings['animationEasing'] as
                  | string
                  | undefined;
                const animationEasing =
                  frameAnimEasing === 'inherit' || !frameAnimEasing
                    ? slideshowElementAnimationEasing
                    : frameAnimEasing;
                const stagger = slideshowElementAnimationStagger;
                const isActiveFrame = idx === currentSlideshowIndex;
                const frameBlocks = frame.blocks ?? [];

                return (
                  <div
                    key={frame.id}
                    className={`${slideshowTransition === 'fade' ? 'absolute inset-0 transition-opacity' : 'absolute inset-0 transition-transform'} flex flex-col`}
                    style={
                      slideshowTransition === 'fade'
                        ? {
                          opacity: isActiveFrame ? 1 : 0,
                          pointerEvents: isActiveFrame ? 'auto' : 'none',
                          transitionDuration: `${slideshowTransitionDuration}ms`,
                        }
                        : {
                          transform: `translateX(${(idx - currentSlideshowIndex) * 100}%)`,
                          transitionDuration: `${slideshowTransitionDuration}ms`,
                        }
                    }
                  >
                    <div
                      className="flex h-full w-full flex-col"
                      style={frameStyle}
                    >
                      {frameBlocks.length > 0 ? (
                        frameBlocks.map(
                          (child: BlockInstance, blockIdx: number) => {
                            const blockDelay =
                              animationDelay + blockIdx * stagger;
                            const animationStyle: React.CSSProperties =
                              isActiveFrame && resolvedAnimationType !== 'none'
                                ? {
                                  animation: `cms-anim-${resolvedAnimationType} ${animationDuration}ms ${animationEasing} ${blockDelay}ms both`,
                                }
                                : {};
                            const shouldFillBlock =
                              fillContent &&
                              (child.type === 'Image' ||
                                child.type === 'ImageElement');
                            const wrapperStyle: React.CSSProperties =
                              shouldFillBlock
                                ? {
                                  ...animationStyle,
                                  width: '100%',
                                  height: '100%',
                                  alignSelf: 'stretch',
                                }
                                : animationStyle;
                            const triggerKey = `${child.id}-${currentSlideshowIndex}-${blockIdx}`;
                            return (
                              <div key={triggerKey} style={wrapperStyle}>
                                <PreviewBlockItem
                                  block={child}
                                  isSelected={selectedNodeId === child.id}
                                  contained
                                  stretch={shouldFillBlock}
                                />
                              </div>
                            );
                          },
                        )
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-gray-500">
                          Empty slide
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {slideCount > 1 && (showArrows || showDots) && (
              <div className="mt-4 flex items-center justify-center gap-4">
                {showArrows && (
                  <button
                    type="button"
                    onClick={goToPrevSlideshow}
                    className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                )}
                {showDots && (
                  <div className="flex gap-2">
                    {frames.map((_: BlockInstance, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={(): void => setSlideshowIndex(idx)}
                        className={`size-2 rounded-full transition ${idx === currentSlideshowIndex ? 'bg-white' : 'bg-gray-600'}`}
                      />
                    ))}
                  </div>
                )}
                {showArrows && (
                  <button
                    type="button"
                    onClick={goToNextSlideshow}
                    className="rounded-full border border-gray-600 p-2 text-gray-400 hover:text-white transition"
                  >
                    <svg
                      className="size-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>,
    );
  }

  // Newsletter section
  if (section.type === 'Newsletter') {
    const buttonText =
      (section.settings['buttonText'] as string) || 'Subscribe';
    const placeholder =
      (section.settings['placeholder'] as string) || 'Enter your email';

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        <div
          className={`${getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: 'max-w-2xl' })} text-center`}
        >
          {section.blocks.length > 0 && (
            <div className="mb-6 space-y-4">
              {section.blocks.map((block: BlockInstance) => (
                <PreviewBlockItem
                  key={block.id}
                  block={block}
                  isSelected={selectedNodeId === block.id}
                  contained
                />
              ))}
            </div>
          )}
          <form
            onSubmit={(e: React.FormEvent) => e.preventDefault()}
            className="flex flex-col gap-3 sm:flex-row sm:gap-0"
          >
            <input
              type="email"
              placeholder={placeholder}
              className="flex-1 rounded-md border border-gray-600 bg-gray-800/50 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:rounded-r-none"
              readOnly
            />
            <button
              type="submit"
              className="cms-hover-button rounded-md bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-200 sm:rounded-l-none"
            >
              {buttonText}
            </button>
          </form>
        </div>
      </div>,
    );
  }

  // ContactForm section
  if (section.type === 'ContactForm') {
    const fields = (
      (section.settings['fields'] as string) || 'name,email,message'
    )
      .split(',')
      .map((f: string) => f.trim());
    const submitText =
      (section.settings['submitText'] as string) || 'Send message';

    return wrapInspector(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={(e: React.KeyboardEvent): void => {
          if (e.key === 'Enter' || e.key === ' ') handleSelect();
        }}
        style={sectionStyles}
        className={`relative w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSectionActions()}
        {divider}
        <div
          className={getSectionContainerClass({
            fullWidth: layout?.fullWidth,
            maxWidthClass: 'max-w-xl',
          })}
        >
          <form
            onSubmit={(e: React.FormEvent) => e.preventDefault()}
            className="space-y-4"
          >
            {fields.map((field: string) => {
              const isTextarea = field.toLowerCase() === 'message';
              const label = field.charAt(0).toUpperCase() + field.slice(1);

              return (
                <div key={field}>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    {label}
                  </label>
                  {isTextarea ? (
                    <textarea
                      rows={4}
                      placeholder={label}
                      className="w-full rounded-md border border-gray-600 bg-gray-800/50 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      readOnly
                    />
                  ) : (
                    <input
                      type={field.toLowerCase() === 'email' ? 'email' : 'text'}
                      placeholder={label}
                      className="w-full rounded-md border border-gray-600 bg-gray-800/50 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      readOnly
                    />
                  )}
                </div>
              );
            })}
            <button
              type="submit"
              className="cms-hover-button w-full rounded-md bg-white px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-200"
            >
              {submitText}
            </button>
          </form>
        </div>
      </div>,
    );
  }

  // Fallback for unknown section types
  if (!showEditorChrome) {
    return null;
  }
  return wrapInspector(
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={(e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' || e.key === ' ') handleSelect();
      }}
      style={sectionStyles}
      className={`relative w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
    >
      {renderSectionActions()}
      {divider}
      {renderBlocks('No blocks')}
    </div>,
  );
}

// ---------------------------------------------------------------------------
// Block preview item (nested inside section or column preview)
// ---------------------------------------------------------------------------

function PreviewBlockItem({
  block,
  isSelected,
  contained,
  sectionId: propSectionId,
  sectionType: propSectionType,
  sectionZone: propSectionZone,
  columnId: propColumnId,
  parentBlockId: propParentBlockId,
  mediaStyles: propMediaStyles,
  stretch = false,
}: PreviewBlockItemProps): React.ReactNode {
  const {
    isInspecting = false,
    inspectorSettings,
    hoveredNodeId,
    onSelect,
    onOpenMedia,
  } = usePreviewEditor();
  
  const blockContext = useBlockContext();
  const sectionId = propSectionId ?? blockContext.sectionId;
  const sectionType = propSectionType ?? blockContext.sectionType;
  const sectionZone = propSectionZone ?? blockContext.sectionZone;
  const columnId = propColumnId ?? blockContext.columnId;
  const parentBlockId = propParentBlockId ?? blockContext.parentBlockId;
  const mediaStyles = propMediaStyles ?? blockContext.mediaStyles;

  const isSectionType = SECTION_BLOCK_TYPES.includes(block.type);
  const showEditorChrome = inspectorSettings?.showEditorChrome ?? false;
  const animConfig = block.settings['gsapAnimation'] as
    | Partial<GsapAnimationConfig>
    | undefined;
  const cssAnimConfig = block.settings['cssAnimation'] as
    | CssAnimationConfig
    | undefined;
  const allowInlineCustomCss = !['Block', 'Row', 'Column'].includes(block.type);
  const inlineCustomCss = allowInlineCustomCss
    ? block.settings['customCss']
    : undefined;
  const inlineCustomNodeId = allowInlineCustomCss ? block.id : undefined;
  const selectedBorderClass = isInspecting
    ? 'ring-2 ring-inset ring-blue-500/40'
    : 'ring-1 ring-inset ring-blue-400/30';
  const selectedSoftBg = isInspecting ? 'bg-blue-500/15' : 'bg-blue-500/10';
  // Inspector should work independently of "editor chrome" (chrome only affects visual overlays / actions).
  const inspectorActive = isInspecting;
  const isHovered = inspectorActive && hoveredNodeId === block.id;
  const inspectorZ = inspectorActive && (isHovered || isSelected) ? 'z-30' : '';
  const hoverFrameClass =
    isHovered && !isSelected ? 'ring-4 ring-inset ring-blue-500/45' : '';
  const isFaithful = !showEditorChrome;
  const canvasSelectedClass = isSelected
    ? isInspecting
      ? 'ring-4 ring-blue-500/45'
      : 'ring-2 ring-blue-500/35'
    : '';
  const canvasHoverClass =
    isHovered && !isSelected ? 'ring-4 ring-blue-500/45' : '';
  const canvasFrameClass = `${canvasSelectedClass} ${canvasHoverClass}`.trim();
  const stretchClass = stretch ? 'h-full' : '';
  const buildContainerClass = (base: string, editor: string): string =>
    `${base} ${stretchClass} ${inspectorZ} ${isFaithful ? canvasFrameClass : `${editor} ${hoverFrameClass}`}`.trim();
  const metaEntries: InspectorEntry[] = [{ label: 'Type', value: block.type }];
  if (inspectorSettings?.showIdentifiers) {
    metaEntries.push({ label: 'ID', value: block.id });
  }
  const structureEntries: InspectorEntry[] = [];
  if (sectionType) {
    structureEntries.push({ label: 'Section', value: sectionType });
  }
  if (sectionZone) {
    structureEntries.push({ label: 'Zone', value: sectionZone });
  }
  if (columnId) {
    structureEntries.push({
      label: 'Column',
      value: inspectorSettings?.showIdentifiers ? columnId : 'Column',
    });
  }
  const visibilityEntries: InspectorEntry[] = [];
  const blockHidden = block.settings['isHidden'];
  if (typeof blockHidden === 'boolean') {
    visibilityEntries.push({
      label: 'Hidden',
      value: blockHidden ? 'Yes' : 'No',
    });
  }
  const connectionEntries: InspectorEntry[] = [];
  const connection = block.settings['connection'] as
    | { enabled?: boolean; source?: string; path?: string; fallback?: string }
    | undefined;
  if (connection) {
    connectionEntries.push({
      label: 'Enabled',
      value: connection.enabled ? 'Yes' : 'No',
    });
    if (connection.source)
      connectionEntries.push({ label: 'Source', value: connection.source });
    if (connection.path)
      connectionEntries.push({ label: 'Path', value: connection.path });
    if (connection.fallback)
      connectionEntries.push({ label: 'Fallback', value: connection.fallback });
  }
  const styleEntries = inspectorSettings?.showStyleSettings
    ? buildStyleEntries(block.settings)
    : [];
  const inspectorSections: InspectorSection[] = [
    { title: 'Meta', entries: metaEntries },
  ];
  if (inspectorSettings?.showStructureInfo) {
    inspectorSections.push({ title: 'Structure', entries: structureEntries });
  }
  if (inspectorSettings?.showVisibilityInfo && visibilityEntries.length > 0) {
    inspectorSections.push({ title: 'Visibility', entries: visibilityEntries });
  }
  if (inspectorSettings?.showConnectionInfo) {
    inspectorSections.push({ title: 'Connection', entries: connectionEntries });
  }
  if (inspectorSettings?.showStyleSettings) {
    inspectorSections.push({ title: 'Styles', entries: styleEntries });
  }
  const inspectorContent = (
    <InspectorTooltip title={block.type} sections={inspectorSections} />
  );
  const fallbackNodeId = parentBlockId ?? columnId ?? sectionId;
  const wrapBlock = (node: React.ReactNode): React.ReactNode => (
    <BlockContextProvider value={{ parentBlockId: block.id }}>
      <InspectorHover
        nodeId={block.id}
        fallbackNodeId={fallbackNodeId}
        content={inspectorContent}
        className={stretchClass}
      >
        <GsapAnimationWrapper config={animConfig}>
          <CssAnimationWrapper config={cssAnimConfig}>
            <EventEffectsWrapper
              settings={block.settings}
              disableClick
              nodeId={inlineCustomNodeId ?? ''}
              customCss={inlineCustomCss}
            >
              {node}{' '}
            </EventEffectsWrapper>
          </CssAnimationWrapper>
        </GsapAnimationWrapper>
      </InspectorHover>
    </BlockContextProvider>
  );
  const handleSelect = (event: React.SyntheticEvent): void => {
    event.stopPropagation();
    onSelect?.(block.id);
  };
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(event);
    }
  };

  // ---------------------------------------------------------------------------
  // Section-type blocks (ImageWithText, Hero) — layout-aware preview
  // ---------------------------------------------------------------------------
  if (isSectionType) {
    const canReplaceImage = showEditorChrome && Boolean(onOpenMedia);
    const sectionBase =
      `w-full text-left text-sm transition ${contained ? 'max-w-full' : ''} ${showEditorChrome ? 'overflow-hidden' : ''}`.trim();
    return wrapBlock(
      <div className="relative group">
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            sectionBase,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : 'ring-1 ring-inset ring-border/30 bg-gray-800/30 hover:ring-border/50'
            }`,
          )}
        >
          <div className={showEditorChrome ? 'overflow-hidden' : ''}>
            {block.type === 'ImageWithText' && (
              <PreviewImageWithTextBlock
                block={block}
                stretch={stretch}
              />
            )}
            {block.type === 'Hero' && (
              <PreviewHeroBlock
                block={block}
                stretch={stretch}
              />
            )}
            {block.type === 'RichText' && (
              <PreviewRichTextBlock
                block={block}
                stretch={stretch}
              />
            )}
            {block.type === 'Block' && (
              <PreviewBlockSectionBlock
                block={block}
                stretch={stretch}
              />
            )}
            {block.type === 'TextAtom' && (
              <PreviewTextAtomBlock
                block={block}
                stretch={stretch}
              />
            )}
            {block.type === 'Carousel' && (
              <PreviewCarouselBlock
                block={block}
                stretch={stretch}
              />
            )}
            {block.type === 'Slideshow' && (
              <PreviewSlideshowBlock
                block={block}
                stretch={stretch}
              />
            )}
          </div>
        </div>
        {canReplaceImage && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia?.({
                kind: 'block',
                sectionId: sectionId ?? '',
                blockId: block.id,
                columnId,
                parentBlockId,
                key: 'image',
              });
            }}
            className="absolute right-2 top-2 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
      </div>,
    );
  }

  // ---------------------------------------------------------------------------
  // Standard element blocks — render actual styled content
  // ---------------------------------------------------------------------------

  // Heading block
  if (block.type === 'Heading') {
    const text = (block.settings['headingText'] as string) || 'Heading';
    const size = (block.settings['headingSize'] as string) || 'medium';
    const typoStyles = getBlockTypographyStyles(block.settings);
    const baseClasses = `w-full text-left transition relative group ${contained ? 'max-w-full' : ''}`;

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(baseClasses, '')}
      >
        {size === 'small' ? (
          <h3
            className="text-xl font-bold leading-tight tracking-tight md:text-2xl text-gray-200"
            style={typoStyles}
          >
            {text}
          </h3>
        ) : size === 'large' ? (
          <h2
            className="text-3xl font-bold leading-tight tracking-tight md:text-5xl text-gray-200"
            style={typoStyles}
          >
            {text}
          </h2>
        ) : (
          <h2
            className="text-2xl font-bold leading-tight tracking-tight md:text-3xl text-gray-200"
            style={typoStyles}
          >
            {text}
          </h2>
        )}
      </div>,
    );
  }

  if (block.type === 'Announcement') {
    const rawText = (block.settings['text'] as string) || '';
    const link = (block.settings['link'] as string) || '';
    const hasText = rawText.trim().length > 0;
    const text = hasText ? rawText : 'Announcement';
    const typoStyles = getBlockTypographyStyles(block.settings);

    if (!hasText && !showEditorChrome) {
      return null;
    }

    const content = link ? (
      <a
        href={link}
        className="text-sm font-medium text-blue-200 underline decoration-blue-400/50 hover:text-blue-100"
        style={typoStyles}
      >
        {text}
      </a>
    ) : (
      <span className="text-sm text-gray-200" style={typoStyles}>
        {text}
      </span>
    );

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          'inline-flex items-center gap-2 text-sm transition',
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg} text-blue-200`
              : 'ring-1 ring-inset ring-border/30 text-gray-300 hover:ring-border/50'
          }`,
        )}
      >
        {showEditorChrome ? (
          <Megaphone className="size-3.5 text-gray-400" />
        ) : null}
        {content}
        {showEditorChrome && link ? (
          <Link2 className="size-3 text-blue-300/80" />
        ) : null}
      </div>,
    );
  }

  // Text block
  if (block.type === 'Text') {
    const text = (block.settings['textContent'] as string) || '';
    const typoStyles = getBlockTypographyStyles(block.settings);
    const hasText = text.trim().length > 0;
    const baseClasses = `w-full text-left transition ${contained ? 'max-w-full' : ''}`;

    if (!hasText && !showEditorChrome) {
      return null;
    }

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          baseClasses,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
      >
        {hasText ? (
          <p
            className="text-base leading-relaxed text-gray-300 md:text-lg"
            style={typoStyles}
          >
            {text}
          </p>
        ) : showEditorChrome ? (
          <p className="text-sm italic text-gray-500">Add text content...</p>
        ) : null}
      </div>,
    );
  }

  // Text element block
  if (block.type === 'TextElement') {
    const text = (block.settings['textContent'] as string) || '';
    const typoStyles = getBlockTypographyStyles(block.settings);
    const hasText = text.trim().length > 0;
    const baseClasses = `w-full text-left transition ${contained ? 'max-w-full' : ''}`;

    if (!hasText && !showEditorChrome) {
      return null;
    }

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          baseClasses,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
      >
        {hasText ? (
          <p
            className="m-0 p-0 text-base leading-relaxed text-gray-200"
            style={typoStyles}
          >
            {text}
          </p>
        ) : showEditorChrome ? (
          <p className="m-0 p-0 text-sm italic text-gray-500">Text element</p>
        ) : null}
      </div>,
    );
  }

  // Text atom letter block
  if (block.type === 'TextAtomLetter') {
    const text = (block.settings['textContent'] as string) ?? '';
    const typoStyles = getBlockTypographyStyles(block.settings);
    const displayText = text === '' ? ' ' : text;

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          'inline-flex items-center justify-center transition',
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-transparent hover:ring-border/40'
          }`,
        )}
      >
        <span
          className="inline-block text-sm text-gray-200"
          style={{ ...typoStyles, whiteSpace: 'pre' }}
        >
          {displayText}
        </span>
      </div>,
    );
  }

  // Image element block
  if (block.type === 'ImageElement') {
    const src = (block.settings['src'] as string) || '';
    const alt = (block.settings['alt'] as string) || 'Image';
    const presentation = buildImageElementPresentation(
      block.settings,
      mediaStyles,
    );
    const hasSrc = Boolean(src);
    if (!hasSrc && !showEditorChrome) {
      return null;
    }
    const baseClasses = `w-full text-left transition ${contained ? 'max-w-full' : ''}`;
    const wrapperStyles = stretch
      ? { ...presentation.wrapperStyles, width: '100%', height: '100%' }
      : presentation.wrapperStyles;
    const imageStyles: React.CSSProperties = {
      ...presentation.imageStyles,
      display: 'block',
      maxHeight: '100%',
    };
    delete (imageStyles as { width?: string | number }).width;
    delete (imageStyles as { height?: string | number }).height;

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          baseClasses,
          `rounded ${
            isSelected
              ? `ring-2 ring-blue-500 ${selectedSoftBg}`
              : 'ring-1 ring-border/30 hover:ring-border/50'
          }`,
        )}
      >
        {hasSrc ? (
          <div className="relative" style={wrapperStyles}>
            <NextImage src={src} alt={alt} fill style={imageStyles} />
            {presentation.hasOverlay && (
              <div
                className="pointer-events-none absolute inset-0"
                style={presentation.overlayStyles}
              />
            )}
          </div>
        ) : showEditorChrome ? (
          <div
            className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
            style={presentation.wrapperStyles}
          >
            No image selected
          </div>
        ) : null}
        {showEditorChrome && onOpenMedia && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia?.({
                kind: 'block',
                sectionId: sectionId ?? '',
                blockId: block.id,
                columnId,
                parentBlockId,
                key: 'src',
              });
            }}
            className="absolute right-2 top-2 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
      </div>,
    );
  }

  // 3D model block
  if (block.type === 'Model3D' || block.type === 'Model3DElement') {
    const assetId = (block.settings['assetId'] as string) || '';
    const height = getSpacingValue(block.settings['height']) || 360;
    const hasAsset = assetId.trim().length > 0;
    if (hasAsset) {
      const backgroundColor =
        (block.settings['backgroundColor'] as string) || '#111827';
      const autoRotate = toBoolean(block.settings['autoRotate'], true);
      const autoRotateSpeed = toNumber(block.settings['autoRotateSpeed'], 2);
      const environment =
        (block.settings['environment'] as EnvironmentPreset) || 'studio';
      const lighting =
        (block.settings['lighting'] as LightingPreset) || 'studio';
      const lightIntensity = toNumber(block.settings['lightIntensity'], 1);
      const enableShadows = toBoolean(block.settings['enableShadows'], true);
      const enableBloom = toBoolean(block.settings['enableBloom'], false);
      const bloomIntensity = toNumber(block.settings['bloomIntensity'], 0.5);
      const exposure = toNumber(block.settings['exposure'], 1);
      const showGround = toBoolean(block.settings['showGround'], false);
      const enableContactShadows = toBoolean(
        block.settings['enableContactShadows'],
        true,
      );
      const enableVignette = toBoolean(block.settings['enableVignette'], false);
      const autoFit = toBoolean(block.settings['autoFit'], true);
      const presentationMode = toBoolean(
        block.settings['presentationMode'],
        false,
      );
      const position = [
        toNumber(block.settings['positionX'], 0),
        toNumber(block.settings['positionY'], 0),
        toNumber(block.settings['positionZ'], 0),
      ] as [number, number, number];
      const rotation = [
        toRadians(toNumber(block.settings['rotationX'], 0)),
        toRadians(toNumber(block.settings['rotationY'], 0)),
        toRadians(toNumber(block.settings['rotationZ'], 0)),
      ] as [number, number, number];
      const scale = toNumber(block.settings['scale'], 1);
      const modelUrl = `/api/assets3d/${assetId}/file`;

      return wrapBlock(
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            `w-full ${contained ? 'max-w-full' : ''}`,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
            }`,
          )}
          style={{ height: `${Math.max(120, height)}px` }}
        >
          <Viewer3D
            modelUrl={modelUrl}
            backgroundColor={backgroundColor}
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            environment={environment}
            lighting={lighting}
            lightIntensity={lightIntensity}
            enableShadows={enableShadows}
            enableBloom={enableBloom}
            bloomIntensity={bloomIntensity}
            exposure={exposure}
            showGround={showGround}
            enableContactShadows={enableContactShadows}
            enableVignette={enableVignette}
            autoFit={autoFit}
            presentationMode={presentationMode}
            allowUserControls={false}
            modelPosition={position}
            modelRotation={rotation}
            modelScale={scale}
            className="h-full w-full"
          />
        </div>,
      );
    }

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `w-full ${contained ? 'max-w-full' : ''}`,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
        style={{ height: `${Math.max(120, height)}px` }}
      >
        <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
          No 3D asset selected
        </div>
      </div>,
    );
  }

  // Button block
  if (block.type === 'Button') {
    const label = (block.settings['buttonLabel'] as string) || 'Button';
    const link = (block.settings['buttonLink'] as string) || '#';
    const style = (block.settings['buttonStyle'] as string) || 'solid';

    const baseButtonClasses =
      'cms-hover-button inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    const customStyles: React.CSSProperties = {};
    const fontFamily = block.settings['fontFamily'] as string | undefined;
    const fontSize = block.settings['fontSize'] as number | undefined;
    const fontWeight = block.settings['fontWeight'] as string | undefined;
    const textColor = block.settings['textColor'] as string | undefined;
    const bgColor = block.settings['bgColor'] as string | undefined;
    const borderColor = block.settings['borderColor'] as string | undefined;
    const borderRadius = block.settings['borderRadius'] as number | undefined;
    const borderWidth = block.settings['borderWidth'] as number | undefined;

    if (fontFamily) customStyles.fontFamily = fontFamily;
    if (fontSize && fontSize > 0) customStyles.fontSize = `${fontSize}px`;
    if (fontWeight) customStyles.fontWeight = fontWeight;
    if (textColor) customStyles.color = textColor;
    if (bgColor) customStyles.backgroundColor = bgColor;
    if (borderColor) customStyles.borderColor = borderColor;
    if (borderRadius && borderRadius > 0)
      customStyles.borderRadius = `${borderRadius}px`;
    if (borderWidth && borderWidth > 0)
      customStyles.borderWidth = `${borderWidth}px`;

    const button =
      style === 'outline' ? (
        <a
          href={link}
          className={`${baseButtonClasses} border-2 border-white text-white hover:bg-white hover:text-gray-900 focus:ring-white`}
          style={customStyles}
        >
          {label}
        </a>
      ) : (
        <a
          href={link}
          className={`${baseButtonClasses} bg-white text-gray-900 hover:bg-gray-200 focus:ring-white`}
          style={customStyles}
        >
          {label}
        </a>
      );

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `inline-block ${contained ? 'max-w-full' : ''}`,
          `cms-hover-button rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
      >
        {button}
      </div>,
    );
  }

  // RichText block
  if (block.type === 'RichText') {
    const colorScheme = block.settings['colorScheme'] as string | undefined;
    if (!showEditorChrome) {
      return null;
    }

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `w-full text-left transition overflow-hidden ${contained ? 'max-w-full' : ''}`,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
      >
        <div
          className="rounded-lg p-4 text-gray-400"
          data-color-scheme={colorScheme}
        >
          <p className="text-sm italic">Rich text content area</p>
        </div>
      </div>,
    );
  }

  // Image block
  if (block.type === 'Image') {
    const src = (block.settings['src'] as string) || '';
    const alt = (block.settings['alt'] as string) || 'Image';
    const width = (block.settings['width'] as number) || 100;
    const borderRadius = (block.settings['borderRadius'] as number) || 0;
    const clipOverflow =
      ((block.settings['clipOverflow'] as string) || '').toLowerCase() ===
      'true';
    if (!src && !showEditorChrome) {
      return null;
    }
    const baseClasses = `w-full text-left transition ${contained ? 'max-w-full' : ''}`;
    const resolvedStyles: React.CSSProperties = {
      ...(mediaStyles ?? {}),
      ...(borderRadius > 0 ? { borderRadius: `${borderRadius}px` } : {}),
    };
    const wrapperStyles: React.CSSProperties = stretch
      ? { width: `${width}%`, height: '100%', ...resolvedStyles }
      : { width: `${width}%`, ...resolvedStyles };
    if (clipOverflow) {
      wrapperStyles.overflow = 'hidden';
    }
    const imageClassName = stretch
      ? 'block h-full w-full object-cover'
      : 'block h-auto w-full max-h-full object-cover';

    return wrapBlock(
      <div className="relative group">
        <div
          role="button"
          tabIndex={0}
          onClick={handleSelect}
          onKeyDown={handleKeyDown}
          className={buildContainerClass(
            baseClasses,
            `rounded ${
              isSelected
                ? `${selectedBorderClass} ${selectedSoftBg}`
                : 'ring-1 ring-inset ring-transparent hover:ring-border/30'
            }`,
          )}
        >
          {src ? (
            <div className="cms-media relative" style={wrapperStyles}>
              <NextImage
                src={src}
                alt={alt}
                fill
                className={imageClassName}
                sizes="(max-width: 768px) 100vw, 50vw"
                unoptimized
              />{' '}
            </div>
          ) : showEditorChrome ? (
            <div
              className="cms-media flex items-center justify-center bg-gray-700/30 min-h-[60px]"
              style={wrapperStyles}
            >
              <div className="flex flex-col items-center gap-1">
                <ImageIcon className="size-6 text-gray-500" />
                <span className="text-xs text-gray-500 truncate max-w-[120px]">
                  {alt}
                </span>
              </div>
            </div>
          ) : null}
        </div>
        {showEditorChrome && onOpenMedia && (
          <button
            type="button"
            onClick={(e: React.MouseEvent): void => {
              e.stopPropagation();
              onOpenMedia?.({
                kind: 'block',
                sectionId: sectionId ?? '',
                blockId: block.id,
                columnId,
                parentBlockId,
                key: 'src',
              });
            }}
            className="absolute right-2 top-2 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100"
          >
            Replace image
          </button>
        )}
      </div>,
    );
  }

  // VideoEmbed block
  if (block.type === 'VideoEmbed') {
    const url = (block.settings['url'] as string) || '';
    const ratio = (block.settings['aspectRatio'] as string) || '16:9';
    const autoplay = (block.settings['autoplay'] as string) === 'yes';

    let embedUrl: string | null = null;
    if (url) {
      const ytMatch = url.match(
        /(?:youtube.com\/watch\?v=|youtu.be\/|youtube.com\/embed\/)([^&?#]+)/,
      );
      if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
      else {
        const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        if (vimeoMatch)
          embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        else if (url.includes('embed') || url.includes('player'))
          embedUrl = url;
      }
    }

    if (!embedUrl && !showEditorChrome) {
      return null;
    }

    const paddingBottom =
      ratio === '4:3' ? '75%' : ratio === '1:1' ? '100%' : '56.25%';
    const resolvedStyles: React.CSSProperties = {
      ...(mediaStyles ?? {}),
      paddingBottom,
    };

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `w-full text-left transition overflow-hidden ${contained ? 'max-w-full' : ''}`,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
      >
        {embedUrl ? (
          <div className="cms-media relative w-full" style={resolvedStyles}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`${embedUrl}${autoplay ? '?autoplay=1&mute=1' : ''}`}
              title="Embedded video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : showEditorChrome ? (
          <div
            className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
            style={resolvedStyles}
          >
            Enter a video URL
          </div>
        ) : null}
      </div>,
    );
  }

  // AppEmbed block
  if (block.type === 'AppEmbed') {
    const appId = (block.settings['appId'] as AppEmbedId) || 'chatbot';
    const title = (block.settings['title'] as string) || '';
    const embedUrl = (block.settings['embedUrl'] as string) || '';
    const height = (block.settings['height'] as number) || 420;
    const appLabel =
      APP_EMBED_OPTIONS.find((option: AppEmbedOption) => option.id === appId)
        ?.label ?? 'App';
    if (!embedUrl && !showEditorChrome) {
      return null;
    }

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `w-full text-left transition overflow-hidden ${contained ? 'max-w-full' : ''}`,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
      >
        <div className="cms-hover-card w-full rounded-lg border border-border/40 bg-gray-900/40 p-4">
          <div className="mb-3">
            <div className="text-sm font-semibold text-white">
              {title || appLabel}
            </div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              App embed
            </div>
          </div>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={title || appLabel}
              className="w-full rounded-md border border-border/40 bg-black"
              style={{ height }}
            />
          ) : showEditorChrome ? (
            <div
              className="flex items-center justify-center rounded-md border border-dashed border-border/40 bg-gray-800/40 text-xs text-gray-400"
              style={{ height }}
            >
              Provide an embed URL to render the {appLabel} app here.
            </div>
          ) : null}
        </div>
      </div>,
    );
  }

  // Divider block
  if (block.type === 'Divider') {
    const style = (block.settings['dividerStyle'] as string) || 'solid';
    const thickness = (block.settings['thickness'] as number) || 1;
    const color = (block.settings['dividerColor'] as string) || '#4b5563';

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `w-full text-left transition overflow-hidden ${contained ? 'max-w-full' : ''}`,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
      >
        <hr
          className="my-2 border-0"
          style={{
            borderTopStyle: style as 'solid' | 'dashed' | 'dotted',
            borderTopWidth: `${thickness}px`,
            borderTopColor: color,
          }}
        />
      </div>,
    );
  }

  // SocialLinks block
  if (block.type === 'SocialLinks') {
    const platforms = (block.settings['platforms'] as string) || '';
    const links = platforms
      .split(',')
      .map((l: string) => l.trim())
      .filter(Boolean);
    if (links.length === 0 && !showEditorChrome) {
      return null;
    }

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `text-left transition ${contained ? 'max-w-full' : ''}`,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
      >
        {links.length === 0 ? (
          showEditorChrome ? (
            <p className="text-sm text-gray-500">
              Add social media URLs in settings
            </p>
          ) : null
        ) : (
          <div className="flex items-center gap-4">
            {links.map((link: string, idx: number) => {
              let label = 'Link';
              try {
                label =
                  new URL(link).hostname.replace('www.', '').split('.')[0] ??
                  'Link';
              } catch {
                // keep default
              }
              return (
                <a
                  key={`${link}-${idx}`}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-gray-600 p-2 text-gray-400 transition hover:text-white hover:border-white"
                >
                  <span className="text-xs font-medium uppercase">
                    {label.slice(0, 2)}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>,
    );
  }

  // Icon block
  if (block.type === 'Icon') {
    const iconName = (block.settings['iconName'] as string) || 'Star';
    const iconSize = (block.settings['iconSize'] as number) || 24;
    const iconColor = (block.settings['iconColor'] as string) || '#ffffff';

    return wrapBlock(
      <div
        role="button"
        tabIndex={0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        className={buildContainerClass(
          `text-left transition ${contained ? 'max-w-full' : ''}`,
          `rounded ${
            isSelected
              ? `${selectedBorderClass} ${selectedSoftBg}`
              : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
          }`,
        )}
      >
        <div className="flex items-center justify-center">
          <span
            style={{ fontSize: `${iconSize}px`, color: iconColor }}
            role="img"
            aria-label={iconName}
          >
            {iconName === 'Star'
              ? '★'
              : iconName === 'Heart'
                ? '♥'
                : iconName === 'Check'
                  ? '✓'
                  : iconName === 'Arrow'
                    ? '→'
                    : '●'}
          </span>
        </div>
      </div>,
    );
  }

  // Fallback for unknown block types
  if (!showEditorChrome) {
    return null;
  }

  return wrapBlock(
    <div
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      className={buildContainerClass(
        `flex w-full items-center gap-2 text-left text-sm transition overflow-hidden ${contained ? 'max-w-full' : ''}`,
        `rounded ${
          isSelected
            ? `${selectedBorderClass} ${selectedSoftBg}`
            : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'
        }`,
      )}
    >
      <span className="flex-1 truncate text-gray-300">{block.type}</span>
    </div>,
  );
}

// Register PreviewBlockItem with extracted modules to avoid circular imports
registerPreviewBlockItem(PreviewBlockItem);
registerCarouselPreviewBlockItem(PreviewBlockItem);
