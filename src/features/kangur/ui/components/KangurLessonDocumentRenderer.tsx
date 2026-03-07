'use client';

import type {
  KangurLessonActivityBlock,
  KangurLessonDocument,
  KangurLessonGridBlock,
  KangurLessonImageBlock,
  KangurLessonInlineBlock,
  KangurLessonSvgBlock,
  KangurLessonTextBlock,
} from '@/shared/contracts/kangur';
import { resolveKangurLessonDocumentPages } from '@/features/kangur/lesson-documents';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurInlineFallback,
  KangurMediaFrame,
  KangurProse,
  KangurStatusChip,
  KangurSurfacePanel,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { cn, sanitizeHtml, sanitizeSvg } from '@/shared/utils';
import { KangurLessonActivityBlock as KangurLessonActivityBlockView } from './KangurLessonActivityBlock';

import React from 'react';

type KangurLessonDocumentRendererProps = {
  document: KangurLessonDocument;
  className?: string | undefined;
  renderMode?: 'lesson' | 'editor';
  activePageId?: string | null | undefined;
};

const TEXT_ALIGN_CLASSNAME: Record<KangurLessonTextBlock['align'], string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const SVG_ALIGN_CLASSNAME: Record<KangurLessonSvgBlock['align'], string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const IMAGE_ALIGN_CLASSNAME: Record<KangurLessonImageBlock['align'], string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const GRID_CLASSNAME_BY_COLUMNS: Record<KangurLessonGridBlock['columns'], string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-4',
};

const GRID_CLASSNAME_BY_COLUMNS_NO_STACK: Record<KangurLessonGridBlock['columns'], string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const GRID_ITEM_SPAN_CLASSNAME = {
  stack: {
    1: 'col-span-1 md:col-span-1',
    2: 'col-span-1 md:col-span-2',
    3: 'col-span-1 md:col-span-3',
    4: 'col-span-1 md:col-span-4',
  },
  fixed: {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
  },
} as const;

const GRID_ITEM_ROW_SPAN_CLASSNAME = {
  stack: {
    1: 'row-span-1 md:row-span-1',
    2: 'row-span-1 md:row-span-2',
    3: 'row-span-1 md:row-span-3',
    4: 'row-span-1 md:row-span-4',
  },
  fixed: {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  },
} as const;

type GridPlacementStyle = React.CSSProperties & {
  '--lesson-grid-column-start'?: string;
  '--lesson-grid-row-start'?: string;
};

const getGridItemPlacementStyle = (
  columnStart: number | null,
  rowStart: number | null
): GridPlacementStyle | undefined => {
  if (columnStart === null && rowStart === null) {
    return undefined;
  }

  const style: GridPlacementStyle = {};
  if (columnStart !== null) {
    style['--lesson-grid-column-start'] = String(columnStart);
  }
  if (rowStart !== null) {
    style['--lesson-grid-row-start'] = String(rowStart);
  }

  return style;
};

function renderTextBlock(
  block: KangurLessonTextBlock,
  key: string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  return (
    <KangurSurfacePanel
      accent='indigo'
      data-testid={`lesson-text-block-${block.id}`}
      fillHeight={options?.fillHeight}
      key={key}
      className={TEXT_ALIGN_CLASSNAME[block.align]}
      padding='xl'
    >
      <KangurProse
        accent='indigo'
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
      />
    </KangurSurfacePanel>
  );
}

function renderSvgBlock(
  block: KangurLessonSvgBlock,
  key: string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  return (
    <KangurSurfacePanel
      accent='sky'
      data-testid={`lesson-svg-block-${block.id}`}
      fillHeight={options?.fillHeight}
      key={key}
      padding='lg'
    >
      {block.title ? (
        <div className='mb-3'>
          <KangurStatusChip
            accent='sky'
            className='text-sm uppercase tracking-[0.18em] text-sky-700/80'
            size='sm'
          >
            {block.title}
          </KangurStatusChip>
        </div>
      ) : null}
      <div
        className={cn(
          'flex w-full',
          options?.fillHeight && 'flex-1',
          SVG_ALIGN_CLASSNAME[block.align]
        )}
      >
        <KangurMediaFrame
          accent='sky'
          className='w-full'
          data-testid={`lesson-svg-frame-${block.id}`}
          fillHeight={options?.fillHeight}
          fit={block.fit}
          mediaType='svg'
          padding='md'
          style={{ maxWidth: `${block.maxWidth}px` }}
          dangerouslySetInnerHTML={{
            __html: sanitizeSvg(block.markup, { viewBox: block.viewBox }),
          }}
        />
      </div>
    </KangurSurfacePanel>
  );
}

function renderImageBlock(
  block: KangurLessonImageBlock,
  key: string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  const hasSource = block.src.trim().length > 0;
  const altText = block.altText?.trim() || block.title.trim() || 'Lesson illustration';

  return (
    <KangurSurfacePanel
      accent='amber'
      data-testid={`lesson-image-block-${block.id}`}
      fillHeight={options?.fillHeight}
      key={key}
      padding='lg'
    >
      {block.title ? (
        <div className='mb-3'>
          <KangurStatusChip
            accent='amber'
            className='text-sm uppercase tracking-[0.18em] text-amber-700/80'
            size='sm'
          >
            {block.title}
          </KangurStatusChip>
        </div>
      ) : null}
      <div
        className={cn(
          'flex w-full',
          options?.fillHeight && 'flex-1',
          IMAGE_ALIGN_CLASSNAME[block.align]
        )}
      >
        <KangurMediaFrame
          accent='amber'
          className='w-full'
          data-testid={`lesson-image-frame-${block.id}`}
          fillHeight={options?.fillHeight}
          fit={block.fit}
          mediaType='image'
          padding='md'
          style={{ maxWidth: `${block.maxWidth}px` }}
        >
          {hasSource ? (
            // Dynamic lesson document images can point at arbitrary uploads, so this stays on img.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.src} alt={altText} className='rounded-[18px]' loading='lazy' />
          ) : (
            <KangurInlineFallback
              accent='amber'
              className='min-h-[180px] rounded-[18px] border-amber-200/80 text-amber-700/80 shadow-none'
              data-testid={`lesson-image-empty-${block.id}`}
              icon={
                <span aria-hidden='true' className='text-lg'>
                  🖼️
                </span>
              }
              title='Image block has no source yet.'
            />
          )}
        </KangurMediaFrame>
      </div>
      {block.caption?.trim() ? (
        <div className='mt-3 text-sm leading-6 text-slate-600'>{block.caption.trim()}</div>
      ) : null}
    </KangurSurfacePanel>
  );
}

function renderActivityBlock(
  block: KangurLessonActivityBlock,
  key: string,
  renderMode: 'lesson' | 'editor'
): React.JSX.Element {
  return <KangurLessonActivityBlockView key={key} block={block} renderMode={renderMode} />;
}

function renderInlineBlock(
  block: KangurLessonInlineBlock,
  key: string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  if (block.type === 'svg') {
    return renderSvgBlock(block, key, options);
  }

  if (block.type === 'image') {
    return renderImageBlock(block, key, options);
  }

  return renderTextBlock(block, key, options);
}

function renderGridBlock(block: KangurLessonGridBlock, key: string): React.JSX.Element {
  return (
    <KangurSurfacePanel
      accent='violet'
      data-testid={`lesson-grid-block-${block.id}`}
      key={key}
      padding='lg'
    >
      <div
        className={cn(
          'grid',
          block.denseFill &&
            (block.stackOnMobile ? 'md:grid-flow-row-dense' : 'grid-flow-row-dense'),
          block.stackOnMobile
            ? GRID_CLASSNAME_BY_COLUMNS[block.columns]
            : GRID_CLASSNAME_BY_COLUMNS_NO_STACK[block.columns]
        )}
        style={{ gap: `${block.gap}px`, gridAutoRows: `${block.rowHeight}px` }}
      >
        {block.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'h-full',
              block.stackOnMobile
                ? GRID_ITEM_SPAN_CLASSNAME.stack[
                    item.colSpan as keyof typeof GRID_ITEM_SPAN_CLASSNAME.stack
                ]
                : GRID_ITEM_SPAN_CLASSNAME.fixed[
                    item.colSpan as keyof typeof GRID_ITEM_SPAN_CLASSNAME.fixed
                ],
              block.stackOnMobile
                ? GRID_ITEM_ROW_SPAN_CLASSNAME.stack[
                    item.rowSpan as keyof typeof GRID_ITEM_ROW_SPAN_CLASSNAME.stack
                ]
                : GRID_ITEM_ROW_SPAN_CLASSNAME.fixed[
                    item.rowSpan as keyof typeof GRID_ITEM_ROW_SPAN_CLASSNAME.fixed
                ],
              item.columnStart !== null &&
                (block.stackOnMobile
                  ? 'md:[grid-column-start:var(--lesson-grid-column-start)]'
                  : '[grid-column-start:var(--lesson-grid-column-start)]'),
              item.rowStart !== null &&
                (block.stackOnMobile
                  ? 'md:[grid-row-start:var(--lesson-grid-row-start)]'
                  : '[grid-row-start:var(--lesson-grid-row-start)]')
            )}
            style={getGridItemPlacementStyle(item.columnStart, item.rowStart)}
          >
            {renderInlineBlock(item.block, item.block.id, { fillHeight: true })}
          </div>
        ))}
      </div>
    </KangurSurfacePanel>
  );
}

export function KangurLessonDocumentRenderer(
  props: KangurLessonDocumentRendererProps
): React.JSX.Element {
  const { document, className, renderMode = 'lesson', activePageId } = props;
  const allPages = resolveKangurLessonDocumentPages(document);
  const pages = activePageId ? allPages.filter((page) => page.id === activePageId) : allPages;

  return (
    <div className={cn('w-full max-w-5xl space-y-6', className)}>
      {pages.map((page, pageIndex) =>
        (() => {
          const previousPage = pages[pageIndex - 1];
          const currentSectionIdentity = page.sectionKey?.trim() || page.sectionTitle?.trim() || '';
          const previousSectionIdentity =
            previousPage?.sectionKey?.trim() || previousPage?.sectionTitle?.trim() || '';
          const showSectionHeader =
            currentSectionIdentity.length > 0 && currentSectionIdentity !== previousSectionIdentity;

          return (
            <KangurGlassPanel
              key={page.id}
              data-testid={`lesson-page-shell-${page.id}`}
              className={cn(
                'space-y-6 backdrop-blur-sm',
                page.blocks.length === 0 && 'border-dashed'
              )}
              padding='md'
              surface='mistSoft'
              variant='elevated'
            >
              {showSectionHeader ? (
                <KangurSummaryPanel
                  accent='emerald'
                  description={page.sectionDescription?.trim() || undefined}
                  label='Section'
                  labelAccent='emerald'
                  padding='lg'
                  title={page.sectionTitle?.trim() || undefined}
                />
              ) : null}

              {pages.length > 1 || page.title?.trim() || page.description?.trim() ? (
                <KangurSummaryPanel
                  accent='slate'
                  description={page.description?.trim() || undefined}
                  label={`Page ${pageIndex + 1}`}
                  labelAccent='slate'
                  padding='lg'
                  title={page.title?.trim() || undefined}
                />
              ) : null}

              {page.blocks.length === 0 ? (
                <KangurEmptyState
                  accent='slate'
                  description={
                    renderMode === 'editor'
                      ? 'Add text, images, SVGs, or an activity block to start composing this page.'
                      : undefined
                  }
                  padding='xl'
                  title='This page has no blocks yet.'
                />
              ) : (
                page.blocks.map((block) => {
                  if (block.type === 'grid') {
                    return renderGridBlock(block, block.id);
                  }
                  if (block.type === 'activity') {
                    return renderActivityBlock(block, block.id, renderMode);
                  }
                  return renderInlineBlock(block, block.id);
                })
              )}
            </KangurGlassPanel>
          );
        })()
      )}
    </div>
  );
}
