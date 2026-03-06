'use client';

import type {
  KangurLessonDocument,
  KangurLessonGridBlock,
  KangurLessonInlineBlock,
  KangurLessonSvgBlock,
  KangurLessonTextBlock,
} from '@/shared/contracts/kangur';
import { cn, sanitizeHtml, sanitizeSvg } from '@/shared/utils';

import React from 'react';

type KangurLessonDocumentRendererProps = {
  document: KangurLessonDocument;
  className?: string | undefined;
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
    <section
      key={key}
      className={cn(
        'rounded-[28px] border border-indigo-200/70 bg-white/95 p-6 shadow-[0_18px_48px_-30px_rgba(79,70,229,0.55)] text-slate-800',
        options?.fillHeight && 'flex h-full flex-col',
        TEXT_ALIGN_CLASSNAME[block.align]
      )}
    >
      <div
        className='mx-auto max-w-none text-[1rem] leading-7 [&_a]:text-indigo-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-200 [&_blockquote]:pl-4 [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:leading-tight [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:my-3 [&_strong]:font-semibold'
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
      />
    </section>
  );
}

function renderSvgBlock(
  block: KangurLessonSvgBlock,
  key: string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  return (
    <section
      key={key}
      className={cn(
        'rounded-[28px] border border-sky-200/80 bg-white/95 p-5 shadow-[0_18px_48px_-30px_rgba(14,165,233,0.55)]',
        options?.fillHeight && 'flex h-full flex-col'
      )}
    >
      {block.title ? (
        <div className='mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-sky-700/80'>
          {block.title}
        </div>
      ) : null}
      <div className={cn('flex w-full', options?.fillHeight && 'flex-1', SVG_ALIGN_CLASSNAME[block.align])}>
        <div
          className={cn(
            'w-full rounded-[24px] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4',
            options?.fillHeight && 'flex h-full items-center',
            block.fit === 'cover' && '[&_svg]:h-[260px] [&_svg]:w-full [&_svg]:object-cover',
            block.fit === 'contain' && '[&_svg]:h-auto [&_svg]:max-h-[320px] [&_svg]:w-full [&_svg]:object-contain',
            block.fit === 'none' && '[&_svg]:h-auto [&_svg]:w-auto [&_svg]:max-w-full'
          )}
          style={{ maxWidth: `${block.maxWidth}px` }}
          dangerouslySetInnerHTML={{
            __html: sanitizeSvg(block.markup, { viewBox: block.viewBox }),
          }}
        />
      </div>
    </section>
  );
}

function renderInlineBlock(
  block: KangurLessonInlineBlock,
  key: string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  return block.type === 'svg'
    ? renderSvgBlock(block, key, options)
    : renderTextBlock(block, key, options);
}

function renderGridBlock(block: KangurLessonGridBlock, key: string): React.JSX.Element {
  return (
    <section
      key={key}
      className='rounded-[32px] border border-violet-200/80 bg-white/90 p-5 shadow-[0_18px_48px_-30px_rgba(139,92,246,0.55)]'
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
    </section>
  );
}

export function KangurLessonDocumentRenderer(
  props: KangurLessonDocumentRendererProps
): React.JSX.Element {
  const { document, className } = props;

  return (
    <div className={cn('w-full max-w-5xl space-y-6', className)}>
      {document.blocks.map((block) => {
        if (block.type === 'grid') {
          return renderGridBlock(block, block.id);
        }
        return renderInlineBlock(block, block.id);
      })}
    </div>
  );
}
