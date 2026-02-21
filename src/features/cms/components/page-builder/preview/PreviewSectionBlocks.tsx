'use client';

import { Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';

import { buildScopedCustomCss, getCustomCssSelector } from '@/features/cms/utils/custom-css';
import type { PreviewBlockItemProps, PreviewBlockProps } from '@/shared/contracts/cms';
import { Card } from '@/shared/ui';

import { useBlockContext, BlockContextProvider } from './context/BlockContext';
import { usePreviewEditor } from './context/PreviewEditorContext';
import { getSpacingValue, resolveJustifyContent, resolveAlignItems } from './preview-utils';
import { getSectionStyles, getTextAlign } from '../../frontend/theme-styles';

import type { BlockInstance } from '../../../types/page-builder';

// ---------------------------------------------------------------------------
// PreviewBlockItem is needed as a dependency - import it lazily to avoid circular deps
// We use a forward reference pattern: the parent file passes it through module scope
// ---------------------------------------------------------------------------

// We need a reference to PreviewBlockItem which is defined in PreviewBlock.tsx.
// To avoid circular imports, we use a late-binding pattern.
let _PreviewBlockItem: React.ComponentType<PreviewBlockItemProps> | null = null;

export function registerPreviewBlockItem(component: React.ComponentType<PreviewBlockItemProps>): void {
  _PreviewBlockItem = component;
}

function PreviewBlockItemProxy(props: PreviewBlockItemProps): React.ReactNode {
  if (!_PreviewBlockItem) {
    throw new Error('PreviewBlockItem has not been registered. Call registerPreviewBlockItem first.');
  }

  return (
    <_PreviewBlockItem {...props} />
  );
}

// ---------------------------------------------------------------------------
// ImageWithText block preview (inside columns)
// ---------------------------------------------------------------------------

export function PreviewImageWithTextBlock({
  block,
  stretch = false,
}: PreviewBlockProps): React.ReactNode {
  const {
    inspectorSettings,
  } = usePreviewEditor();
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
      className={`flex flex-col gap-4 ${imageFirst ? 'md:flex-row' : 'md:flex-row-reverse'} ${stretchClass}`}
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
          <BlockContextProvider value={{ contained: true }}>
            {children.map((child: BlockInstance) => (
              <PreviewBlockItemProxy
                key={child.id}
                block={child}
              />
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

export function PreviewHeroBlock({
  block,
  stretch = false,
}: PreviewBlockProps): React.ReactNode {
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
          <BlockContextProvider value={{ contained: true }}>
            {children.map((child: BlockInstance) => (
              <PreviewBlockItemProxy
                key={child.id}
                block={child}
              />
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
  const { inspectorSettings } = usePreviewEditor();
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
        <BlockContextProvider value={{ contained: true }}>
          {children.map((child: BlockInstance) => (
            <PreviewBlockItemProxy
              key={child.id}
              block={child}
            />
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
  const { inspectorSettings } = usePreviewEditor();
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
  const wrapClass = direction === 'column' ? '' : wrapSetting === 'nowrap' ? 'flex-nowrap' : 'flex-wrap';
  const shouldStretchChildren = resolvedStretch && children.length === 1;
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
        <Card variant='subtle-compact' padding='none' className='flex min-h-[48px] items-center justify-center border-dashed border-gray-700/50 bg-card/20 text-[10px] uppercase tracking-wider text-gray-600'>
          Empty block
        </Card>
      ) : (
        <div
          className={`flex ${flexDirClass} ${wrapClass}`}
          style={{ gap: `${blockGap}px`, justifyContent, alignItems }}
        >
          <BlockContextProvider value={{ contained: true, stretch: shouldStretchChildren }}>
            {children.map((child: BlockInstance) => (
              <PreviewBlockItemProxy
                key={child.id}
                block={child}
              />
            ))}
          </BlockContextProvider>
        </div>
      )}
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
  const { inspectorSettings } = usePreviewEditor();
  const showEditorChrome = inspectorSettings?.showEditorChrome ?? false;
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
        <BlockContextProvider value={{ contained: true }}>
          {letters.map((child: BlockInstance) => (
            <PreviewBlockItemProxy
              key={child.id}
              block={child}
            />
          ))}
        </BlockContextProvider>
      ) : showEditorChrome ? (
        <div className='text-xs text-gray-600'>Text atoms</div>
      ) : null}
    </div>
  );
}
