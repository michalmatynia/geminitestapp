'use client';

import { Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import React from 'react';

import {
  CmsRuntimeScopeProvider,
  resolveCmsRuntimeCollection,
  useOptionalCmsRuntime,
} from '@/features/cms/components/frontend/CmsRuntimeContext';
import type { BlockInstance } from '@/features/cms/types/page-builder';
import { buildScopedCustomCss, getCustomCssSelector } from '@/features/cms/utils/custom-css';
import type { PreviewBlockItemProps, PreviewBlockProps } from '@/shared/contracts/cms';
import { Card } from '@/shared/ui/primitives.public';
import { UI_STACK_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';

import { useBlockContext, BlockContextProvider } from './context/BlockContext';
import { usePreviewEditorState } from './context/PreviewEditorContext';
import { getSpacingValue, resolveJustifyContent, resolveAlignItems } from './preview-utils';
import { getSectionStyles, getTextAlign } from '../../frontend/theme-styles';


const CONTAINED_BLOCK_CONTEXT_VALUE = { contained: true };

const resolvePositiveNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// ---------------------------------------------------------------------------
// PreviewBlockItem is needed as a dependency - import it lazily to avoid circular deps
// We use a forward reference pattern: the parent file passes it through module scope
// ---------------------------------------------------------------------------

// We need a reference to PreviewBlockItem which is defined in PreviewBlock.tsx.
// To avoid circular imports, we use a late-binding pattern.
let _PreviewBlockItem: React.ComponentType<PreviewBlockItemProps> | null = null;

export function registerPreviewBlockItem(
  component: React.ComponentType<PreviewBlockItemProps>
): void {
  _PreviewBlockItem = component;
}

function PreviewBlockItemProxy(props: PreviewBlockItemProps): React.ReactNode {
  if (!_PreviewBlockItem) {
    throw new Error(
      'PreviewBlockItem has not been registered. Call registerPreviewBlockItem first.'
    );
  }

  return <_PreviewBlockItem {...props} />;
}

// ---------------------------------------------------------------------------
// ImageWithText block preview (inside columns)
// ---------------------------------------------------------------------------

export function PreviewImageWithTextBlock({
  block,
  stretch = false,
}: PreviewBlockProps): React.ReactNode {
  const { inspectorSettings } = usePreviewEditorState();
  const { mediaStyles, stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? contextStretch ?? false;

  const placement = block.settings['desktopImagePlacement'] as string | undefined;
  const imageFirst = placement !== 'image-second';
  const children = block.blocks ?? [];
  const blockImage = block.settings['image'] as string | undefined;
  const showEditorChrome = inspectorSettings?.showEditorChrome ?? false;

  const stretchClass = resolvedStretch ? 'h-full' : '';
  const stretchStyle = resolvedStretch ? { height: '100%' } : undefined;

  return (
    <div
      className={cn(
        UI_STACK_RELAXED_CLASSNAME,
        imageFirst ? 'md:flex-row' : 'md:flex-row-reverse',
        stretchClass
      )}
      style={stretchStyle}
    >
      <div className='cms-media relative w-full md:w-2/5' style={mediaStyles ?? undefined}>
        {blockImage ? (
          <NextImage
            src={blockImage}
            alt=''
            fill
            className='object-cover'
            sizes='(max-width: 768px) 100vw, 40vw'
            unoptimized
          />
        ) : showEditorChrome ? (
          <div className='flex min-h-[120px] w-full items-center justify-center bg-card/40'>
            <ImageIcon className='size-10 text-gray-600' />
          </div>
        ) : null}
      </div>
      <div className='flex w-full flex-col justify-center gap-3 md:w-3/5'>
        {children.length > 0 ? (
          <BlockContextProvider value={CONTAINED_BLOCK_CONTEXT_VALUE}>
            {children.map((child: BlockInstance) => (
              <PreviewBlockItemProxy key={child.id} block={child} />
            ))}
          </BlockContextProvider>
        ) : showEditorChrome ? (
          <p className='text-gray-500'>Add content blocks</p>
        ) : null}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero block preview (inside columns)
// ---------------------------------------------------------------------------

export function PreviewHeroBlock({ block, stretch = false }: PreviewBlockProps): React.ReactNode {
  const { mediaStyles, stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? contextStretch ?? false;
  const children = block.blocks ?? [];
  const blockImage = block.settings['image'] as string | undefined;

  const stretchStyle = resolvedStretch ? { height: '100%' } : undefined;

  return (
    <div
      className='cms-media relative min-h-[200px] overflow-hidden'
      style={{ ...(mediaStyles ?? {}), ...(stretchStyle ?? {}) }}
    >
      {blockImage ? (
        <div
          className='absolute inset-0 bg-cover bg-center'
          style={{ backgroundImage: `url(${blockImage})` }}
        >
          <div className='absolute inset-0 bg-black/50' />
        </div>
      ) : (
        <div className='absolute inset-0 bg-gradient-to-br from-card/60 to-card/40' />
      )}
      <div className='relative z-10 flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center'>
        {children.length > 0 ? (
          <BlockContextProvider value={CONTAINED_BLOCK_CONTEXT_VALUE}>
            {children.map((child: BlockInstance) => (
              <PreviewBlockItemProxy key={child.id} block={child} />
            ))}
          </BlockContextProvider>
        ) : (
          <p className='text-gray-400'>Hero banner</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RichText block preview (inside columns)
// ---------------------------------------------------------------------------

export function PreviewRichTextBlock({
  block,
  stretch = false,
}: PreviewBlockProps): React.ReactNode {
  const { stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? contextStretch ?? false;
  const { inspectorSettings } = usePreviewEditorState();
  const children = block.blocks ?? [];
  const blockStyles = getSectionStyles(block.settings);
  const stretchStyle = resolvedStretch ? { height: '100%' } : undefined;
  const showEditorChrome = inspectorSettings?.showEditorChrome ?? false;

  if (children.length === 0 && !showEditorChrome) {
    return null;
  }

  return (
    <div
      style={{ ...blockStyles, ...(stretchStyle ?? {}) }}
      className={`space-y-4 ${resolvedStretch ? 'h-full' : ''}`}
    >
      {children.length > 0 ? (
        <BlockContextProvider value={CONTAINED_BLOCK_CONTEXT_VALUE}>
          {children.map((child: BlockInstance) => (
            <PreviewBlockItemProxy key={child.id} block={child} />
          ))}
        </BlockContextProvider>
      ) : showEditorChrome ? (
        <p className='text-gray-500'>Rich text section</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block section preview (inside columns)
// ---------------------------------------------------------------------------

export function PreviewBlockSectionBlock({
  block,
  stretch = false,
}: PreviewBlockProps): React.ReactNode {
  const { stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? contextStretch ?? false;
  const { inspectorSettings } = usePreviewEditorState();
  const children = block.blocks ?? [];
  const blockStyles = {
    ...getSectionStyles(block.settings),
    ...getTextAlign(block.settings['contentAlignment']),
  };
  const stretchStyle = resolvedStretch ? { height: '100%' } : undefined;
  const alignment = (block.settings['contentAlignment'] as string) || 'left';
  const blockGap = getSpacingValue(block.settings['blockGap']);
  const direction = (block.settings['layoutDirection'] as string) || 'row';
  const wrapSetting = (block.settings['wrap'] as string) || 'wrap';
  const justifySetting = (block.settings['justifyContent'] as string) || 'inherit';
  const justifyContent =
    resolveJustifyContent(justifySetting === 'inherit' ? alignment : justifySetting) ??
    (alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start');
  const alignItems = resolveAlignItems(block.settings['alignItems']) ?? 'center';
  const flexDirClass = direction === 'column' ? 'flex-col' : 'flex-row';
  const wrapClass =
    direction === 'column' ? '' : wrapSetting === 'nowrap' ? 'flex-nowrap' : 'flex-wrap';
  const shouldStretchChildren = resolvedStretch && children.length === 1;
  const childBlockContextValue = React.useMemo(
    () => ({ contained: true, stretch: shouldStretchChildren }),
    [shouldStretchChildren]
  );
  const blockSelector = getCustomCssSelector(block.id);
  const blockCustomCss = buildScopedCustomCss(block.settings['customCss'], blockSelector);
  const showEditorChrome = inspectorSettings?.showEditorChrome ?? false;

  return (
    <div
      style={{ ...blockStyles, ...(stretchStyle ?? {}) }}
      className={`${resolvedStretch ? 'h-full' : ''} cms-node-${block.id}`.trim()}
    >
      {blockCustomCss ? <style data-cms-custom-css={block.id}>{blockCustomCss}</style> : null}
      {children.length === 0 && showEditorChrome ? (
        <Card
          variant='subtle-compact'
          padding='none'
          className='flex min-h-[48px] items-center justify-center border-dashed border-gray-700/50 bg-card/20 text-[10px] uppercase tracking-wider text-gray-600'
        >
          Empty block
        </Card>
      ) : (
        <div
          className={`flex ${flexDirClass} ${wrapClass}`}
          style={{ gap: `${blockGap}px`, justifyContent, alignItems }}
        >
          <BlockContextProvider value={childBlockContextValue}>
            {children.map((child: BlockInstance) => (
              <PreviewBlockItemProxy key={child.id} block={child} />
            ))}
          </BlockContextProvider>
        </div>
      )}
    </div>
  );
}

export function PreviewRepeaterBlock({
  block,
  stretch = false,
}: PreviewBlockProps): React.ReactNode {
  const { stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? contextStretch ?? false;
  const { inspectorSettings } = usePreviewEditorState();
  const runtime = useOptionalCmsRuntime();
  const showEditorChrome = inspectorSettings?.showEditorChrome ?? false;
  const collectionSource = block.settings['collectionSource'];
  const collectionPath = block.settings['collectionPath'];
  const items = React.useMemo(
    () => resolveCmsRuntimeCollection(runtime, collectionSource, collectionPath),
    [collectionPath, collectionSource, runtime]
  );
  const itemLimit = resolvePositiveNumber(block.settings['itemLimit'], 0);
  const visibleItems = itemLimit > 0 ? items.slice(0, itemLimit) : items;
  const itemsGap = resolvePositiveNumber(block.settings['itemsGap'], 16);
  const listDirection = block.settings['listLayoutDirection'] === 'row' ? 'row' : 'column';
  const listWrap = block.settings['listWrap'] === 'nowrap' ? 'nowrap' : 'wrap';
  const listJustifyContent =
    resolveJustifyContent(block.settings['listJustifyContent']) ?? 'flex-start';
  const listAlignItems = resolveAlignItems(block.settings['listAlignItems']) ?? 'stretch';
  const itemGap = resolvePositiveNumber(block.settings['itemGap'], 12);
  const itemDirection = block.settings['itemLayoutDirection'] === 'row' ? 'row' : 'column';
  const itemWrap = block.settings['itemWrap'] === 'nowrap' ? 'nowrap' : 'wrap';
  const justifyContent = resolveJustifyContent(block.settings['itemJustifyContent']) ?? 'flex-start';
  const alignItems = resolveAlignItems(block.settings['itemAlignItems']) ?? 'stretch';
  const listWrapperClass =
    listDirection === 'row'
      ? listWrap === 'nowrap'
        ? 'flex flex-row flex-nowrap'
        : 'flex flex-row flex-wrap'
      : 'flex flex-col';
  const itemWrapperClass =
    itemDirection === 'row'
      ? itemWrap === 'nowrap'
        ? 'flex flex-row flex-nowrap'
        : 'flex flex-row flex-wrap'
      : 'flex flex-col';
  const childBlockContextValue = React.useMemo(
    () => ({ contained: true, stretch: resolvedStretch && (block.blocks?.length ?? 0) === 1 }),
    [block.blocks?.length, resolvedStretch]
  );
  const emptyMessage =
    typeof block.settings['emptyMessage'] === 'string' ? block.settings['emptyMessage'].trim() : '';

  if (
    (typeof collectionSource !== 'string' || collectionSource.trim().length === 0) &&
    showEditorChrome
  ) {
    return (
      <Card
        variant='subtle-compact'
        padding='sm'
        className='border-dashed border-border/40 bg-card/20 text-[11px] text-gray-500'
      >
        Connect repeater to a collection.
      </Card>
    );
  }

  if (visibleItems.length === 0) {
    if (!showEditorChrome && !emptyMessage) {
      return null;
    }

    return (
      <Card
        variant='subtle-compact'
        padding='sm'
        className='border-dashed border-border/40 bg-card/20 text-[11px] text-gray-500'
      >
        {emptyMessage || 'No items in collection.'}
      </Card>
    );
  }

  return (
    <div
      className={`${listWrapperClass} ${resolvedStretch ? 'h-full' : ''}`.trim()}
      style={{ gap: `${itemsGap}px`, justifyContent: listJustifyContent, alignItems: listAlignItems }}
    >
      {visibleItems.map((item: unknown, index: number) => {
        const itemKey =
          isObjectRecord(item) && typeof item['id'] === 'string'
            ? item['id']
            : `${block.id}-preview-item-${index}`;

        return (
          <CmsRuntimeScopeProvider key={itemKey} sources={{ item, itemIndex: index }}>
            <div
              className={itemWrapperClass}
              style={{ gap: `${itemGap}px`, justifyContent, alignItems }}
            >
              <BlockContextProvider value={childBlockContextValue}>
                {(block.blocks ?? []).map((child: BlockInstance) => (
                  <PreviewBlockItemProxy key={child.id} block={child} />
                ))}
              </BlockContextProvider>
            </div>
          </CmsRuntimeScopeProvider>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text atom preview (inside columns)
// ---------------------------------------------------------------------------

export function PreviewTextAtomBlock({
  block,
  stretch = false,
}: PreviewBlockProps): React.ReactNode {
  const { stretch: contextStretch } = useBlockContext();
  const resolvedStretch = stretch ?? contextStretch ?? false;
  const { inspectorSettings } = usePreviewEditorState();
  const showEditorChrome = inspectorSettings?.showEditorChrome ?? false;
  const text = (block.settings['text'] as string) || '';
  const alignment = (block.settings['alignment'] as string) || 'left';
  const letterGap = (block.settings['letterGap'] as number) || 0;
  const lineGap = (block.settings['lineGap'] as number) || 0;
  const wrap = (block.settings['wrap'] as string) || 'wrap';
  const letters = (block.blocks ?? []).length
    ? (block.blocks ?? [])
    : Array.from(text).map(
      (char: string, index: number): BlockInstance => ({
        id: `text-atom-${block.id}-${index}`,
        type: 'TextAtomLetter',
        settings: { textContent: char },
      })
    );

  const justifyContent =
    alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start';
  const stretchStyle = resolvedStretch ? { height: '100%' } : undefined;
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

  return (
    <div
      style={{ ...containerStyle, ...(stretchStyle ?? {}) }}
      className={resolvedStretch ? 'h-full' : ''}
    >
      {letters.length > 0 ? (
        <BlockContextProvider value={CONTAINED_BLOCK_CONTEXT_VALUE}>
          {letters.map((child: BlockInstance) => (
            <PreviewBlockItemProxy key={child.id} block={child} />
          ))}
        </BlockContextProvider>
      ) : showEditorChrome ? (
        <div className='text-xs text-gray-600'>Text atoms</div>
      ) : null}
    </div>
  );
}
