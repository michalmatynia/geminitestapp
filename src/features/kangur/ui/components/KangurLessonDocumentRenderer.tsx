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
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurPanel } from '@/features/kangur/ui/design/primitives';
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
    <KangurPanel
      key={key}
      className={cn(
        'border-indigo-200/70 bg-white/95 text-slate-800',
        options?.fillHeight && 'flex h-full flex-col',
        TEXT_ALIGN_CLASSNAME[block.align]
      )}
      padding='xl'
      variant='soft'
    >
      <div
        className='mx-auto max-w-none text-[1rem] leading-7 [&_a]:text-indigo-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-200 [&_blockquote]:pl-4 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:leading-tight [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-3 [&_strong]:font-semibold'
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
      />
    </KangurPanel>
  );
}

function renderSvgBlock(
  block: KangurLessonSvgBlock,
  key: string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  return (
    <KangurPanel
      key={key}
      className={cn(
        'border-sky-200/80 bg-white/95',
        options?.fillHeight && 'flex h-full flex-col'
      )}
      padding='lg'
      variant='soft'
    >
      {block.title ? (
        <div className='mb-3'>
          <KangurLessonChip accent='sky' className='text-sm uppercase tracking-[0.18em] text-sky-700/80'>
            {block.title}
          </KangurLessonChip>
        </div>
      ) : null}
      <div className={cn('flex w-full', options?.fillHeight && 'flex-1', SVG_ALIGN_CLASSNAME[block.align])}>
        <KangurLessonCallout
          accent='sky'
          className={cn(
            'w-full border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50',
            options?.fillHeight && 'flex h-full items-center',
            block.fit === 'cover' && '[&_svg]:h-[260px] [&_svg]:w-full [&_svg]:object-cover',
            block.fit === 'contain' && '[&_svg]:h-auto [&_svg]:max-h-[320px] [&_svg]:w-full [&_svg]:object-contain',
            block.fit === 'none' && '[&_svg]:h-auto [&_svg]:w-auto [&_svg]:max-w-full'
          )}
          padding='md'
          style={{ maxWidth: `${block.maxWidth}px` }}
          dangerouslySetInnerHTML={{
            __html: sanitizeSvg(block.markup, { viewBox: block.viewBox }),
          }}
        />
      </div>
    </KangurPanel>
  );
}

function renderImageBlock(
  block: KangurLessonImageBlock,
  key: string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  const hasSource = block.src.trim().length > 0;
  const altText = block.altText?.trim() || block.title.trim() || 'Lesson image';

  return (
    <KangurPanel
      key={key}
      className={cn(
        'border-amber-200/80 bg-white/95',
        options?.fillHeight && 'flex h-full flex-col'
      )}
      padding='lg'
      variant='soft'
    >
      {block.title ? (
        <div className='mb-3'>
          <KangurLessonChip accent='amber' className='text-sm uppercase tracking-[0.18em] text-amber-700/80'>
            {block.title}
          </KangurLessonChip>
        </div>
      ) : null}
      <div className={cn('flex w-full', options?.fillHeight && 'flex-1', IMAGE_ALIGN_CLASSNAME[block.align])}>
        <KangurLessonCallout
          accent='amber'
          className={cn(
            'w-full border-amber-100 bg-gradient-to-br from-amber-50 via-white to-orange-50',
            options?.fillHeight && 'flex h-full items-center',
            block.fit === 'cover' && 'overflow-hidden [&_img]:h-[260px] [&_img]:w-full [&_img]:object-cover',
            block.fit === 'contain' && '[&_img]:h-auto [&_img]:max-h-[320px] [&_img]:w-full [&_img]:object-contain',
            block.fit === 'none' && '[&_img]:h-auto [&_img]:w-auto [&_img]:max-w-full'
          )}
          padding='md'
          style={{ maxWidth: `${block.maxWidth}px` }}
        >
          {hasSource ? (
            // Dynamic lesson document images can point at arbitrary uploads, so this stays on img.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={block.src} alt={altText} className='rounded-[18px]' loading='lazy' />
          ) : (
            <div className='flex min-h-[180px] items-center justify-center rounded-[18px] border border-dashed border-amber-200 bg-white/70 px-4 text-center text-sm text-amber-700/80'>
              Image block has no source yet.
            </div>
          )}
        </KangurLessonCallout>
      </div>
      {block.caption?.trim() ? (
        <div className='mt-3 text-sm leading-6 text-slate-600'>{block.caption.trim()}</div>
      ) : null}
    </KangurPanel>
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
    <KangurPanel
      key={key}
      className='border-violet-200/80 bg-white/90'
      padding='lg'
      variant='soft'
    >
      <div
        className={cn(
          'grid',
          block.denseFill && (block.stackOnMobile ? 'md:grid-flow-row-dense' : 'grid-flow-row-dense'),
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
                ? GRID_ITEM_SPAN_CLASSNAME.stack[item.colSpan as keyof typeof GRID_ITEM_SPAN_CLASSNAME.stack]
                : GRID_ITEM_SPAN_CLASSNAME.fixed[item.colSpan as keyof typeof GRID_ITEM_SPAN_CLASSNAME.fixed],
              block.stackOnMobile
                ? GRID_ITEM_ROW_SPAN_CLASSNAME.stack[item.rowSpan as keyof typeof GRID_ITEM_ROW_SPAN_CLASSNAME.stack]
                : GRID_ITEM_ROW_SPAN_CLASSNAME.fixed[item.rowSpan as keyof typeof GRID_ITEM_ROW_SPAN_CLASSNAME.fixed],
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
    </KangurPanel>
  );
}

export function KangurLessonDocumentRenderer(
  props: KangurLessonDocumentRendererProps
): React.JSX.Element {
  const { document, className, renderMode = 'lesson', activePageId } = props;
  const allPages = resolveKangurLessonDocumentPages(document);
  const pages = activePageId
    ? allPages.filter((page) => page.id === activePageId)
    : allPages;

  return (
    <div className={cn('w-full max-w-5xl space-y-6', className)}>
      {pages.map((page, pageIndex) => (
        (() => {
          const previousPage = pages[pageIndex - 1];
          const currentSectionIdentity = page.sectionKey?.trim() || page.sectionTitle?.trim() || '';
          const previousSectionIdentity =
            previousPage?.sectionKey?.trim() || previousPage?.sectionTitle?.trim() || '';
          const showSectionHeader =
            currentSectionIdentity.length > 0 && currentSectionIdentity !== previousSectionIdentity;

          return (
            <KangurPanel
              key={page.id}
              className={cn(
                'space-y-6 border-white/70 bg-white/45 backdrop-blur-sm',
                page.blocks.length === 0 && 'border-dashed'
              )}
              padding='md'
              variant='elevated'
            >
              {showSectionHeader ? (
                <KangurPanel
                  className='border-emerald-200/80 bg-white/92'
                  padding='lg'
                  variant='subtle'
                >
                  <KangurLessonChip accent='emerald' className='text-[11px] uppercase tracking-[0.16em] text-emerald-600/90'>
                    Section
                  </KangurLessonChip>
                  {page.sectionTitle?.trim() ? (
                    <h2 className='mt-2 text-2xl font-extrabold text-slate-900'>
                      {page.sectionTitle.trim()}
                    </h2>
                  ) : null}
                  {page.sectionDescription?.trim() ? (
                    <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-600'>
                      {page.sectionDescription.trim()}
                    </p>
                  ) : null}
                </KangurPanel>
              ) : null}

              {pages.length > 1 || page.title?.trim() || page.description?.trim() ? (
                <KangurPanel
                  className='border-slate-200/80 bg-white/88'
                  padding='lg'
                  variant='subtle'
                >
                  <KangurLessonChip accent='slate' className='text-[11px] uppercase tracking-[0.16em] text-slate-500'>
                    Page {pageIndex + 1}
                  </KangurLessonChip>
                  {page.title?.trim() ? (
                    <h2 className='mt-2 text-2xl font-extrabold text-slate-900'>
                      {page.title.trim()}
                    </h2>
                  ) : null}
                  {page.description?.trim() ? (
                    <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-600'>
                      {page.description.trim()}
                    </p>
                  ) : null}
                </KangurPanel>
              ) : null}

              {page.blocks.length === 0 ? (
                <KangurLessonCallout
                  accent='slate'
                  className='border-dashed px-5 py-8 text-sm text-slate-500'
                >
                  This page has no blocks yet.
                </KangurLessonCallout>
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
            </KangurPanel>
          );
        })()
      ))}
    </div>
  );
}
