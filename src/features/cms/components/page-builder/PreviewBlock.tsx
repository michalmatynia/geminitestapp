'use client';

import { Eye, EyeOff, Trash2 } from 'lucide-react';
import React from 'react';

import {
  isCmsNodeVisible,
  resolveCmsConnectedSettings,
  resolveCmsRuntimeValue,
  useOptionalCmsRuntime,
} from '@/features/cms/components/frontend/CmsRuntimeContext';
import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import { buildScopedCustomCss, getCustomCssSelector } from '@/features/cms/utils/custom-css';
import { isCmsSectionHidden } from '@/features/cms/utils/page-builder-normalization';
import type { GsapAnimationConfig } from '@/features/gsap/public';
import type { CssAnimationConfig } from '@/shared/contracts/cms';
import type { SectionInstance, BlockInstance, PreviewBlockItemProps } from '@/shared/contracts/cms';
import { DEFAULT_APP_EMBED_ID, getAppEmbedOption } from '@/shared/lib/app-embeds';
import { getKangurWidgetLabel } from '@/shared/lib/kangur-cms-adapter';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button, Card, Input } from '@/shared/ui';

import { useCmsPageContext } from '../frontend/CmsPageContext';
import { SectionRenderer as FrontendSectionRenderer } from '../frontend/CmsPageRenderer';
import { CssAnimationWrapper } from '../frontend/CssAnimationWrapper';
import { GsapAnimationWrapper } from '../frontend/GsapAnimationWrapper';
import { useMediaStyles } from '../frontend/media-styles-context';
import {
  getSectionContainerClass,
  getSectionStyles,
  getTextAlign,
  getBlockTypographyStyles,
} from '../frontend/theme-styles';
import { BlockContextProvider, useBlockContext } from './preview/context/BlockContext';
import {
  usePreviewEditorActions,
  usePreviewEditorState,
} from './preview/context/PreviewEditorContext';
import {
  PreviewSectionProvider,
  type PreviewSectionContextValue,
} from './preview/context/PreviewSectionContext';
import {
  InspectorTooltip,
  InspectorHover,
  buildStyleEntries,
  resolveNodeLabel,
  type InspectorSection,
} from './preview/InspectorOverlay';
import {
  SECTION_BLOCK_TYPES,
  resolveJustifyContent,
  resolveAlignItems,
  getSpacingValue,
  getSelectableSurfaceProps,
  shouldShowSectionDivider,
  type MediaReplaceTarget,
} from './preview/preview-utils';
import {
  PreviewCarouselBlock,
  PreviewSlideshowBlock,
  registerCarouselPreviewBlockItem,
} from './preview/PreviewCarouselBlocks';
import { PreviewNodeSelectionButton } from './preview/PreviewNodeSelectionButton';
import {
  PreviewImageWithTextBlock,
  PreviewHeroBlock,
  PreviewRichTextBlock,
  PreviewBlockSectionBlock,
  PreviewRepeaterBlock,
  PreviewTextAtomBlock,
  registerPreviewBlockItem,
} from './preview/PreviewSectionBlocks';
import { PreviewGridSection } from './preview/sections/PreviewGridSection';
import {
  PreviewHeroSection,
  PreviewImageWithTextSection,
  PreviewRichTextSection,
} from './preview/sections/PreviewSectionVariants';
import { PreviewSlideshowSection } from './preview/sections/PreviewSlideshowSection';

export type { MediaReplaceTarget };

const FRONTEND_PREVIEW_SECTION_TYPES = new Set<string>([
  'Accordion',
  'Testimonials',
  'Video',
  'Newsletter',
  'ContactForm',
  'ImageElement',
  'Model3DElement',
  'ButtonElement',
  'TextAtom',
]);

const isTruthyRuntimeValue = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 && normalized !== 'false' && normalized !== '0';
  }

  return Boolean(value);
};
const CONTAINED_BLOCK_CONTEXT_VALUE = { contained: true };

type PreviewFrontendSectionRendererRuntimeValue = {
  type: string;
  sectionId: string;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
};

const {
  Context: PreviewFrontendSectionRendererRuntimeContext,
  useStrictContext: usePreviewFrontendSectionRendererRuntime,
} = createStrictContext<PreviewFrontendSectionRendererRuntimeValue>({
  hookName: 'usePreviewFrontendSectionRendererRuntime',
  providerName: 'PreviewFrontendSectionRendererRuntimeProvider',
  displayName: 'PreviewFrontendSectionRendererRuntimeContext',
});

function PreviewFrontendSectionRenderer(): React.JSX.Element {
  const runtime = usePreviewFrontendSectionRendererRuntime();
  return (
    <FrontendSectionRenderer
      type={runtime.type}
      sectionId={runtime.sectionId}
      settings={runtime.settings}
      blocks={runtime.blocks}
    />
  );
}

// ---------------------------------------------------------------------------
// Top-level section preview
// ---------------------------------------------------------------------------

interface PreviewSectionProps {
  section: SectionInstance;
}

export function PreviewSection(props: PreviewSectionProps): React.ReactNode {
  const { section } = props;

  const { colorSchemes, layout } = useCmsPageContext();
  const mediaStyles = useMediaStyles();
  const runtime = useOptionalCmsRuntime();
  const {
    selectedNodeId,
    isInspecting = false,
    inspectorSettings,
    hoveredNodeId,
  } = usePreviewEditorState();
  const { onSelect, onRemoveSection, onToggleSectionVisibility } = usePreviewEditorActions();

  const isSectionSelected = selectedNodeId === section.id;
  const showEditorChrome = inspectorSettings.showEditorChrome ?? false;
  const isHidden = isCmsSectionHidden(section.settings['isHidden']);
  const label = resolveNodeLabel(section.type, section.settings['label']);
  const animConfig = section.settings['gsapAnimation'] as Partial<GsapAnimationConfig> | undefined;
  const cssAnimConfig = section.settings['cssAnimation'] as CssAnimationConfig | undefined;

  // Inspector should work independently of "editor chrome"
  const isSectionHovered = isInspecting && hoveredNodeId === section.id;
  const inspectorZ = isInspecting && (isSectionHovered || isSectionSelected) ? 'z-30' : '';

  const showDivider = shouldShowSectionDivider(section.settings);
  const divider = showDivider ? (
    <div className='pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/5' />
  ) : null;

  const styleEntries = inspectorSettings.showStyleSettings
    ? buildStyleEntries(section.settings)
    : [];

  const inspectorSections: InspectorSection[] = [
    {
      title: 'Meta',
      entries: [
        { label: 'Type', value: section.type },
        { label: 'Label', value: label },
        ...(inspectorSettings.showIdentifiers ? [{ label: 'ID', value: section.id }] : []),
      ],
    },
  ];

  if (inspectorSettings.showStyleSettings) {
    inspectorSections.push({ title: 'Styles', entries: styleEntries });
  }

  const inspectorContent = (
    <InspectorTooltip title={`Section: ${label}`} sections={inspectorSections} />
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
        className='w-full'
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

  const handleSelect = (): void => {
    onSelect(section.id);
  };
  const selectableSectionProps = getSelectableSurfaceProps((event) => {
    event.stopPropagation();
    handleSelect();
  });

  const renderSelectionButton = (className?: string): React.ReactNode => {
    if (!showEditorChrome) return null;
    return (
      <PreviewNodeSelectionButton
        label={`Select section ${label}`}
        selected={isSectionSelected}
        onSelect={handleSelect}
        className={className}
      />
    );
  };

  const renderSectionActions = (): React.ReactNode => {
    if (!showEditorChrome || !isSectionSelected) return null;
    return (
      <div className='absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-border/40 bg-gray-900/80 px-1.5 py-1 text-xs text-gray-200 shadow-sm'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onToggleSectionVisibility?.(section.id, !isHidden);
          }}
          className='h-7 w-7 rounded p-1 text-gray-300 hover:text-white hover:bg-white/10'
          title={isHidden ? 'Show section' : 'Hide section'}
          aria-label={isHidden ? 'Show section' : 'Hide section'}>
          {isHidden ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={(e: React.MouseEvent): void => {
            e.stopPropagation();
            onRemoveSection?.(section.id);
          }}
          className='h-7 w-7 rounded p-1 text-gray-300 hover:text-red-200 hover:bg-red-500/20'
          title='Delete section'
          aria-label={'Delete section'}>
          <Trash2 className='size-3.5' />
        </Button>
      </div>
    );
  };

  const selectedRingBase = isInspecting
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

  if (isHidden || !isCmsNodeVisible(section.settings, runtime)) return null;

  const sectionContextValue: PreviewSectionContextValue = {
    section,
    selectedRing,
    divider,
    renderSectionActions,
    renderSelectionButton,
    wrapInspector,
    handleSelect,
    PreviewBlockItem,
  };

  // Dispatch to modular section components
  if (section.type === 'Slideshow') {
    return (
      <PreviewSectionProvider value={sectionContextValue}>
        <PreviewSlideshowSection />
      </PreviewSectionProvider>
    );
  }

  if (section.type === 'Grid') {
    return (
      <PreviewSectionProvider value={sectionContextValue}>
        <PreviewGridSection />
      </PreviewSectionProvider>
    );
  }

  if (section.type === 'ImageWithText') {
    return (
      <PreviewSectionProvider value={sectionContextValue}>
        <PreviewImageWithTextSection />
      </PreviewSectionProvider>
    );
  }

  if (section.type === 'Hero') {
    return (
      <PreviewSectionProvider value={sectionContextValue}>
        <PreviewHeroSection />
      </PreviewSectionProvider>
    );
  }

  if (section.type === 'RichText') {
    return (
      <PreviewSectionProvider value={sectionContextValue}>
        <PreviewRichTextSection />
      </PreviewSectionProvider>
    );
  }

  // --- Inline simple sections (AnnouncementBar, Block, TextElement, etc) remain here for now ---
  if (section.type === 'AnnouncementBar' || section.type === 'Block') {
    const isBlockSection = section.type === 'Block';
    const alignment = (section.settings['contentAlignment'] as string) || 'center';
    const alignmentClasses =
      alignment === 'left'
        ? 'justify-start text-left'
        : alignment === 'right'
          ? 'justify-end text-right'
          : 'justify-center text-center';
    const blockGap = getSpacingValue(section.settings['blockGap']);
    const direction = (section.settings['layoutDirection'] as string) || 'row';
    const wrapSetting = (section.settings['wrap'] as string) || 'wrap';
    const justifySetting = (section.settings['justifyContent'] as string) || 'inherit';
    const justifyContent =
      resolveJustifyContent(justifySetting === 'inherit' ? alignment : justifySetting) ??
      (alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start');
    const alignItems = resolveAlignItems(section.settings['alignItems']) ?? 'center';
    const flexDirClass = direction === 'column' ? 'flex-col' : 'flex-row';
    const wrapClass =
      direction === 'column' ? '' : wrapSetting === 'nowrap' ? 'flex-nowrap' : 'flex-wrap';

    const containerStyles: React.CSSProperties = {
      ...getSectionStyles(section.settings, colorSchemes),
      ...getTextAlign(section.settings['contentAlignment']),
    };
    const sectionSelector = isBlockSection ? getCustomCssSelector(section.id) : null;
    const sectionCustomCss = isBlockSection
      ? buildScopedCustomCss(section.settings['customCss'], sectionSelector)
      : null;

    return wrapInspector(
      <div
        {...selectableSectionProps}
        style={containerStyles}
        className={`relative group w-full transition cursor-pointer ${selectedRing} ${inspectorZ}${isBlockSection ? ` cms-node-${section.id}` : ''}`}
      >
        {sectionCustomCss ? (
          <style data-cms-custom-css={section.id}>{sectionCustomCss}</style>
        ) : null}
        {renderSelectionButton()}
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
            {section.blocks.length === 0 ? (
              <p className='text-sm text-gray-400'>
                {isBlockSection ? 'Empty block' : 'Announcement bar'}
              </p>
            ) : (
              <BlockContextProvider value={CONTAINED_BLOCK_CONTEXT_VALUE}>
                {section.blocks.map((block: BlockInstance) => (
                  <PreviewBlockItem key={block.id} block={block} />
                ))}
              </BlockContextProvider>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Text element section
  if (section.type === 'TextElement') {
    const resolvedSettings = resolveCmsConnectedSettings(section.type, section.settings, runtime);
    const text = (resolvedSettings['textContent'] as string) || '';
    const typoStyles = getBlockTypographyStyles(resolvedSettings);
    if (!text.trim() && !showEditorChrome) return null;
    return wrapInspector(
      <div
        {...selectableSectionProps}
        style={getSectionStyles(resolvedSettings, colorSchemes)}
        className={`relative group w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSelectionButton()}
        {renderSectionActions()}
        {divider}
        {text ? (
          <p className='m-0 p-0 text-base leading-relaxed text-gray-200' style={typoStyles}>
            {text}
          </p>
        ) : (
          <Card
            variant='subtle-compact'
            padding='sm'
            className='border-dashed border-border/40 bg-gray-800/20 text-gray-500'
          >
            Text element
          </Card>
        )}
      </div>
    );
  }

  // Render section types via the storefront renderer when a dedicated editor preview is not implemented.
  if (FRONTEND_PREVIEW_SECTION_TYPES.has(section.type)) {
    const frontendSectionRendererRuntimeValue =
      React.useMemo<PreviewFrontendSectionRendererRuntimeValue>(
        () => ({
          type: section.type,
          sectionId: section.id,
          settings: section.settings,
          blocks: section.blocks,
        }),
        [section.type, section.id, section.settings, section.blocks]
      );

    return wrapInspector(
      <div
        {...selectableSectionProps}
        className={`relative group w-full text-left transition cursor-pointer ${selectedRing}`}
      >
        {renderSelectionButton()}
        {renderSectionActions()}
        {divider}
        <PreviewFrontendSectionRendererRuntimeContext.Provider
          value={frontendSectionRendererRuntimeValue}
        >
          <PreviewFrontendSectionRenderer />
        </PreviewFrontendSectionRendererRuntimeContext.Provider>
      </div>
    );
  }

  // Fallback for others
  const sectionStyles = getSectionStyles(section.settings, colorSchemes);
  if (!showEditorChrome) return null;
  return wrapInspector(
    <div
      {...selectableSectionProps}
      style={sectionStyles}
      className={`relative group w-full px-4 text-left transition cursor-pointer ${selectedRing}`}
    >
      {renderSelectionButton()}
      {renderSectionActions()}
      {divider}
      <p className='text-sm text-gray-500'>Unsupported section type: {section.type}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block preview item
// ---------------------------------------------------------------------------

function PreviewBlockItem(props: PreviewBlockItemProps): React.ReactNode {
  const { block } = props;
  const runtime = useOptionalCmsRuntime();

  const {
    selectedNodeId,
    isInspecting = false,
    inspectorSettings,
    hoveredNodeId,
  } = usePreviewEditorState();
  const { onSelect, onOpenMedia } = usePreviewEditorActions();

  const blockContext = useBlockContext();
  const { sectionId, columnId, parentBlockId, contained = false, stretch = false } = blockContext;
  const resolvedSettings = React.useMemo(
    () => resolveCmsConnectedSettings(block.type, block.settings, runtime),
    [block.type, block.settings, runtime]
  );
  const resolvedBlock = React.useMemo(
    (): BlockInstance => ({
      ...block,
      settings: resolvedSettings,
    }),
    [block, resolvedSettings]
  );

  const isSelected = selectedNodeId === block.id;
  const isSectionType = SECTION_BLOCK_TYPES.includes(block.type);
  const showEditorChrome = inspectorSettings?.showEditorChrome ?? false;
  const animConfig = block.settings['gsapAnimation'] as Partial<GsapAnimationConfig> | undefined;
  const cssAnimConfig = block.settings['cssAnimation'] as CssAnimationConfig | undefined;
  const parentBlockContextValue = React.useMemo(() => ({ parentBlockId: block.id }), [block.id]);
  const stretchBlockContextValue = React.useMemo(() => ({ stretch }), [stretch]);

  const allowInlineCustomCss = !['Block', 'Row', 'Column'].includes(block.type);
  const isHovered = isInspecting && hoveredNodeId === block.id;
  const inspectorZ = isInspecting && (isHovered || isSelected) ? 'z-30' : '';
  const isFaithful = !showEditorChrome;
  const canvasFrameClass = isSelected
    ? isInspecting
      ? 'ring-4 ring-blue-500/45'
      : 'ring-2 ring-blue-500/35'
    : isHovered
      ? 'ring-4 ring-blue-500/45'
      : '';
  const buildContainerClass = (base: string, editor: string): string =>
    `${base} ${stretch ? 'h-full' : ''} ${inspectorZ} ${isFaithful ? canvasFrameClass : `${editor} ${isHovered && !isSelected ? 'ring-4 ring-inset ring-blue-500/45' : ''}`}`.trim();

  const inspectorContent = (
    <InspectorTooltip
      title={block.type}
      sections={[{ title: 'Meta', entries: [{ label: 'Type', value: block.type }] }]}
    />
  );

  const wrapBlock = (node: React.ReactNode): React.ReactNode => (
    <BlockContextProvider value={parentBlockContextValue}>
      <InspectorHover
        nodeId={block.id}
        fallbackNodeId={parentBlockId ?? columnId ?? sectionId}
        content={inspectorContent}
        className={stretch ? 'h-full' : ''}
      >
        <GsapAnimationWrapper config={animConfig}>
          <CssAnimationWrapper config={cssAnimConfig}>
            <EventEffectsWrapper
              settings={block.settings}
              disableClick
              nodeId={allowInlineCustomCss ? block.id : ''}
              customCss={allowInlineCustomCss ? block.settings['customCss'] : undefined}
            >
              {node}
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
  const selectableBlockProps = getSelectableSurfaceProps(handleSelect);

  const blockLabel = resolveNodeLabel(block.type, block.settings['label']);
  const renderBlockSelectionButton = (className?: string): React.ReactNode => {
    if (!showEditorChrome) return null;
    return (
      <PreviewNodeSelectionButton
        label={`Select block ${blockLabel}`}
        selected={isSelected}
        onSelect={() => onSelect?.(block.id)}
        className={className}
      />
    );
  };

  if (!isCmsNodeVisible(block.settings, runtime)) {
    return null;
  }

  if (isSectionType) {
    return wrapBlock(
      <div className='relative group'>
        {renderBlockSelectionButton('left-2 top-2')}
        <div
          {...selectableBlockProps}
          className={buildContainerClass(
            `w-full text-left text-sm transition ${contained ? 'max-w-full' : ''} ${showEditorChrome ? 'overflow-hidden' : ''}`,
            `rounded ${isSelected ? 'ring-2 ring-inset ring-blue-500/40 bg-blue-500/15' : 'ring-1 ring-inset ring-border/30 bg-gray-800/30 hover:ring-border/50'}`
          )}
        >
          <BlockContextProvider value={stretchBlockContextValue}>
            {block.type === 'ImageWithText' && <PreviewImageWithTextBlock block={resolvedBlock} />}
            {block.type === 'Hero' && <PreviewHeroBlock block={resolvedBlock} />}
            {block.type === 'RichText' && <PreviewRichTextBlock block={resolvedBlock} />}
            {block.type === 'Block' && <PreviewBlockSectionBlock block={resolvedBlock} />}
            {block.type === 'TextAtom' && <PreviewTextAtomBlock block={resolvedBlock} />}
            {block.type === 'Carousel' && <PreviewCarouselBlock block={resolvedBlock} />}
            {block.type === 'Slideshow' && <PreviewSlideshowBlock block={resolvedBlock} />}
            {block.type === 'Repeater' && <PreviewRepeaterBlock block={resolvedBlock} />}
          </BlockContextProvider>
        </div>
        {showEditorChrome && onOpenMedia && (
          <Button
            type='button'
            variant='outline'
            size='xs'
            onClick={(e) => {
              e.stopPropagation();
              onOpenMedia({
                kind: 'block',
                sectionId: sectionId ?? '',
                blockId: block.id,
                columnId,
                parentBlockId,
                key: 'image',
              });
            }}
            className='absolute right-2 top-2 z-10 rounded-full border border-border/40 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-300 opacity-0 transition group-hover:opacity-100 hover:text-white hover:bg-gray-900/90'
          >
            Replace image
          </Button>
        )}
      </div>
    );
  }

  // --- Inline element blocks (Heading, Text, Image, etc) continue to be rendered here or in subsequent extraction ---
  if (block.type === 'Heading') {
    const text = (resolvedSettings['headingText'] as string) || 'Heading';
    const typoStyles = getBlockTypographyStyles(resolvedSettings);
    return wrapBlock(
      <div
        {...selectableBlockProps}
        className={buildContainerClass(
          `relative group w-full text-left transition ${contained ? 'max-w-full' : ''}`,
          ''
        )}
      >
        {renderBlockSelectionButton('left-2 top-2')}
        <h2
          className='text-2xl font-bold leading-tight tracking-tight md:text-3xl text-gray-200'
          style={typoStyles}
        >
          {text}
        </h2>
      </div>
    );
  }

  if (block.type === 'Text') {
    const text = (resolvedSettings['textContent'] as string) || '';
    const typoStyles = getBlockTypographyStyles(resolvedSettings);
    if (!text.trim() && !showEditorChrome) return null;
    return wrapBlock(
      <div
        {...selectableBlockProps}
        className={buildContainerClass(
          `relative group w-full text-left transition ${contained ? 'max-w-full' : ''}`,
          `rounded ${isSelected ? 'ring-2 ring-inset ring-blue-500/40 bg-blue-500/15' : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'}`
        )}
      >
        {renderBlockSelectionButton('left-2 top-2')}
        {text ? (
          <p className='text-base leading-relaxed text-gray-300 md:text-lg' style={typoStyles}>
            {text}
          </p>
        ) : (
          <p className='text-sm italic text-gray-500'>Add text content...</p>
        )}
      </div>
    );
  }

  if (block.type === 'Button') {
    const label = (resolvedSettings['buttonLabel'] as string) || 'Button';
    const style = (resolvedSettings['buttonStyle'] as string) || 'solid';
    const hasRuntimeDisabledBinding =
      typeof resolvedSettings['buttonDisabledSource'] === 'string' &&
      resolvedSettings['buttonDisabledSource'].trim().length > 0 &&
      typeof resolvedSettings['buttonDisabledPath'] === 'string' &&
      resolvedSettings['buttonDisabledPath'].trim().length > 0;
    const runtimeDisabledValue = hasRuntimeDisabledBinding
      ? resolveCmsRuntimeValue(
        runtime,
        resolvedSettings['buttonDisabledSource'],
        resolvedSettings['buttonDisabledPath']
      )
      : undefined;
    const isDisabled = hasRuntimeDisabledBinding
      ? resolvedSettings['buttonDisabledWhen'] === 'falsy'
        ? !isTruthyRuntimeValue(runtimeDisabledValue)
        : isTruthyRuntimeValue(runtimeDisabledValue)
      : resolvedSettings['buttonDisabled'] === true ||
        resolvedSettings['buttonDisabled'] === 'true';

    return wrapBlock(
      <div
        {...selectableBlockProps}
        className={buildContainerClass(
          `relative group w-full text-left transition ${contained ? 'max-w-full' : ''}`,
          `rounded ${isSelected ? 'ring-2 ring-inset ring-blue-500/40 bg-blue-500/15' : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'}`
        )}
      >
        {renderBlockSelectionButton('left-2 top-2')}
        <button
          type='button'
          disabled={isDisabled}
          className={`pointer-events-none inline-flex rounded-md px-6 py-2.5 text-sm font-semibold transition ${style === 'outline' ? 'border-2 border-white text-white' : 'bg-white text-gray-900'} ${isDisabled ? 'opacity-55' : ''}`}
          aria-label={label || 'Preview button'}
        >
          {label}
        </button>
      </div>
    );
  }

  if (block.type === 'Input') {
    const value =
      typeof resolvedSettings['inputValue'] === 'string' ? resolvedSettings['inputValue'] : '';
    const placeholder =
      typeof resolvedSettings['inputPlaceholder'] === 'string'
        ? resolvedSettings['inputPlaceholder']
        : '';
    const inputAriaLabel =
      typeof resolvedSettings['inputAriaLabel'] === 'string'
        ? resolvedSettings['inputAriaLabel'].trim()
        : '';

    return wrapBlock(
      <div
        {...selectableBlockProps}
        className={buildContainerClass(
          `relative group w-full text-left transition ${contained ? 'max-w-full' : ''}`,
          `rounded ${isSelected ? 'ring-2 ring-inset ring-blue-500/40 bg-blue-500/15' : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'}`
        )}
      >
        {renderBlockSelectionButton('left-2 top-2')}
        <Input
          readOnly
          value={value}
          placeholder={placeholder || 'Input'}
          aria-label={inputAriaLabel || placeholder || 'Input field'}
          className='pointer-events-none w-full'
         title={placeholder || 'Input'}/>
      </div>
    );
  }

  if (block.type === 'Progress') {
    const value =
      typeof resolvedSettings['progressValue'] === 'number' ? resolvedSettings['progressValue'] : 0;
    const max =
      typeof resolvedSettings['progressMax'] === 'number' && resolvedSettings['progressMax'] > 0
        ? resolvedSettings['progressMax']
        : 100;
    const height =
      typeof resolvedSettings['progressHeight'] === 'number' &&
      resolvedSettings['progressHeight'] > 0
        ? resolvedSettings['progressHeight']
        : 12;
    const borderRadius =
      typeof resolvedSettings['borderRadius'] === 'number' && resolvedSettings['borderRadius'] >= 0
        ? resolvedSettings['borderRadius']
        : 999;
    const fillColor =
      typeof resolvedSettings['fillColor'] === 'string' &&
      resolvedSettings['fillColor'].trim().length > 0
        ? resolvedSettings['fillColor']
        : '#6366f1';
    const trackColor =
      typeof resolvedSettings['trackColor'] === 'string' &&
      resolvedSettings['trackColor'].trim().length > 0
        ? resolvedSettings['trackColor']
        : '#e2e8f0';
    const showPercentage =
      resolvedSettings['showPercentage'] === true || resolvedSettings['showPercentage'] === 'true';
    const percent = Math.max(0, Math.min(100, (value / max) * 100));

    return wrapBlock(
      <div
        {...selectableBlockProps}
        className={buildContainerClass(
          `relative group w-full text-left transition ${contained ? 'max-w-full' : ''}`,
          `rounded ${isSelected ? 'ring-2 ring-inset ring-blue-500/40 bg-blue-500/15' : 'ring-1 ring-inset ring-border/30 bg-gray-800/20 hover:ring-border/50'}`
        )}
      >
        {renderBlockSelectionButton('left-2 top-2')}
        <div className='w-full space-y-2'>
          <div
            className='w-full overflow-hidden'
            style={{
              backgroundColor: trackColor,
              borderRadius: `${borderRadius}px`,
              height: `${height}px`,
            }}
          >
            <div
              className='h-full transition-[width] duration-300 ease-out'
              style={{
                backgroundColor: fillColor,
                borderRadius: `${borderRadius}px`,
                width: `${percent}%`,
              }}
            />
          </div>
          {showPercentage ? (
            <div className='text-right text-xs font-semibold text-gray-400'>
              {Math.round(percent)}%
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (block.type === 'AppEmbed') {
    const appOption = getAppEmbedOption(
      typeof resolvedSettings['appId'] === 'string'
        ? resolvedSettings['appId']
        : DEFAULT_APP_EMBED_ID
    );
    const title = ((resolvedSettings['title'] as string) || appOption?.label || 'App embed').trim();
    const basePath = (resolvedSettings['basePath'] as string) || '';
    const entryPage = (resolvedSettings['entryPage'] as string) || '';
    const renderMode = appOption?.renderMode ?? 'iframe';

    return wrapBlock(
      <Card
        variant='subtle'
        padding='md'
        {...selectableBlockProps}
        className='relative group w-full border-border/40 bg-card/40 text-left'
      >
        {renderBlockSelectionButton('left-2 top-2')}
        <div className='space-y-2'>
          <div>
            <div className='text-sm font-semibold text-white'>{title}</div>
            <div className='text-[10px] uppercase tracking-wide text-gray-500'>
              {renderMode === 'internal-app' ? 'Internal app mount' : 'Iframe embed'}
            </div>
          </div>
          <div className='rounded-xl border border-dashed border-border/40 bg-card/20 p-3 text-xs text-gray-400'>
            {renderMode === 'internal-app'
              ? `Entry page: ${entryPage || 'default'}${
                basePath ? ` · host page override: ${basePath}` : ' · host page: current CMS page'
              }`
              : 'Preview uses the published iframe URL at runtime.'}
          </div>
        </div>
      </Card>
    );
  }

  if (block.type === 'KangurWidget') {
    const widgetId =
      typeof resolvedSettings['widgetId'] === 'string' ? resolvedSettings['widgetId'] : '';
    const widgetLabel = getKangurWidgetLabel(widgetId);

    return wrapBlock(
      <Card
        variant='subtle'
        padding='md'
        {...selectableBlockProps}
        className='relative group w-full border-border/40 bg-card/40 text-left'
      >
        {renderBlockSelectionButton('left-2 top-2')}
        <div className='space-y-2'>
          <div className='text-sm font-semibold text-white'>{widgetLabel}</div>
          <div className='text-[10px] uppercase tracking-wide text-gray-500'>
            Kangur runtime widget
          </div>
          <div className='rounded-xl border border-dashed border-border/40 bg-card/20 p-3 text-xs text-gray-400'>
            This block renders dynamic Kangur app content at runtime. The surrounding layout stays
            editable in the CMS builder.
          </div>
        </div>
      </Card>
    );
  }

  return wrapBlock(
    <div {...selectableBlockProps} className={buildContainerClass('relative group w-full', '')}>
      {renderBlockSelectionButton('left-2 top-2')}
      <span className='text-gray-500'>{block.type}</span>
    </div>
  );
}

registerPreviewBlockItem(PreviewBlockItem);
registerCarouselPreviewBlockItem(PreviewBlockItem);
