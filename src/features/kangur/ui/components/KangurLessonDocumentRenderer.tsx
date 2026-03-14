import React from 'react';

import { resolveKangurLessonDocumentPages } from '@/features/kangur/lesson-documents';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurInlineFallback,
  KangurMediaFrame,
  KangurProse,
  KangurSectionEyebrow,
  KangurStatusChip,
  KangurSurfacePanel,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import type {
  KangurLessonActivityBlock,
  KangurLessonCalloutBlock,
  KangurLessonDocument,
  KangurLessonGridBlock,
  KangurLessonImageBlock,
  KangurLessonInlineBlock,
  KangurLessonQuizBlock,
  KangurLessonSvgBlock,
  KangurLessonTextBlock,
} from '@/shared/contracts/kangur';
import { cn, sanitizeHtml, sanitizeSvg } from '@/shared/utils';

import { KangurLessonActivityBlock as KangurLessonActivityBlockView } from './KangurLessonActivityBlock';


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
            className='text-sm uppercase tracking-[0.18em]'
            style={{ color: 'color-mix(in srgb, rgb(3 105 161) 82%, var(--kangur-page-text))' }}
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
            className='text-sm uppercase tracking-[0.18em]'
            style={{ color: 'color-mix(in srgb, rgb(180 83 9) 82%, var(--kangur-page-text))' }}
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
            <img src={block.src} alt={altText} className='kangur-lesson-inset' loading='lazy' />
          ) : (
            <KangurInlineFallback
              accent='amber'
              className='kangur-lesson-inset min-h-[180px] shadow-none'
              style={{
                borderColor:
                  'color-mix(in srgb, var(--kangur-soft-card-border) 72%, rgb(251 191 36))',
                color: 'color-mix(in srgb, rgb(180 83 9) 80%, var(--kangur-page-text))',
              }}
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
        <div className='mt-3 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
          {block.caption.trim()}
        </div>
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

const CALLOUT_STYLES: Record<
  KangurLessonCalloutBlock['variant'],
  { border: string; icon: string; label: string; accentSurface: string; text: string }
> = {
  info: {
    border: 'border-indigo-200',
    icon: 'ℹ️',
    label: 'Info',
    accentSurface: '#e0e7ff',
    text: '#4338ca',
  },
  tip: {
    border: 'border-emerald-200',
    icon: '💡',
    label: 'Wskazówka',
    accentSurface: '#d1fae5',
    text: '#047857',
  },
  warning: {
    border: 'border-amber-200',
    icon: '⚠️',
    label: 'Uwaga',
    accentSurface: '#fde68a',
    text: '#b45309',
  },
  success: {
    border: 'border-teal-200',
    icon: '✅',
    label: 'Sukces',
    accentSurface: '#ccfbf1',
    text: '#0f766e',
  },
};

function renderCalloutBlock(block: KangurLessonCalloutBlock, key: string): React.JSX.Element {
  const style = CALLOUT_STYLES[block.variant];
  return (
    <div
      key={key}
      data-testid={`lesson-callout-block-${block.id}`}
      className='soft-card kangur-lesson-callout kangur-card-padding-md border'
      style={{
        background: `color-mix(in srgb, var(--kangur-soft-card-background) 84%, ${style.accentSurface})`,
        borderColor: `color-mix(in srgb, var(--kangur-soft-card-border) 72%, ${style.accentSurface})`,
      }}
    >
      <div className='mb-1 flex items-center gap-2 text-sm font-semibold' style={{ color: style.text }}>
        <span aria-hidden>{style.icon}</span>
        {block.title?.trim() || style.label}
      </div>
      <div
        className='prose prose-sm max-w-none'
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
      />
    </div>
  );
}

type QuizState = { selectedId: string | null; revealed: boolean };

function KangurLessonQuizBlockView({ block }: { block: KangurLessonQuizBlock }): React.JSX.Element {
  const [state, setState] = React.useState<QuizState>({ selectedId: null, revealed: false });

  const handleSelect = (choiceId: string): void => {
    if (state.revealed) return;
    setState({ selectedId: choiceId, revealed: true });
  };

  return (
    <div
      data-testid={`lesson-quiz-block-${block.id}`}
      className='soft-card kangur-lesson-callout kangur-card-padding-md border shadow-sm'
      style={{ borderColor: 'var(--kangur-soft-card-border)' }}
    >
      <div
        className='prose prose-sm mb-4 max-w-none font-semibold [color:var(--kangur-page-text)]'
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.question) }}
      />
      <div className='space-y-2'>
        {block.choices.map((choice) => {
          const isSelected = state.selectedId === choice.id;
          const isCorrect = choice.id === block.correctChoiceId;
          let choiceClass = 'rounded-lg border px-4 py-2 text-left text-sm w-full transition';
          if (!state.revealed) {
            choiceClass +=
              ' soft-card [color:var(--kangur-page-text)]';
          } else if (isCorrect) {
            choiceClass += ' font-semibold';
          } else if (isSelected) {
            choiceClass += '';
          } else {
            choiceClass +=
              ' [background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,#cbd5e1)] [color:var(--kangur-page-muted-text)] opacity-60';
          }
          return (
            <button
              key={choice.id}
              type='button'
              className={choiceClass}
              style={{
                borderColor: !state.revealed
                  ? 'var(--kangur-soft-card-border)'
                  : isCorrect
                    ? 'color-mix(in srgb, rgb(52 211 153) 72%, var(--kangur-soft-card-border))'
                    : isSelected
                      ? 'color-mix(in srgb, rgb(251 113 133) 68%, var(--kangur-soft-card-border))'
                      : 'color-mix(in srgb, var(--kangur-soft-card-border) 72%, #cbd5e1)',
                background: !state.revealed
                  ? 'var(--kangur-soft-card-background)'
                  : isCorrect
                    ? 'color-mix(in srgb, var(--kangur-soft-card-background) 82%, #d1fae5)'
                    : isSelected
                      ? 'color-mix(in srgb, var(--kangur-soft-card-background) 84%, #ffe4e6)'
                      : 'color-mix(in srgb, var(--kangur-soft-card-background) 86%, #cbd5e1)',
                color: isCorrect
                  ? 'color-mix(in srgb, rgb(6 95 70) 82%, var(--kangur-page-text))'
                  : isSelected
                    ? 'color-mix(in srgb, rgb(190 24 93) 76%, var(--kangur-page-text))'
                    : undefined,
              }}
              onClick={(): void => handleSelect(choice.id)}
              disabled={state.revealed}
            >
              {choice.text}
            </button>
          );
        })}
      </div>
      {state.revealed && block.explanation?.trim() ? (
        <div
          className='prose prose-sm kangur-lesson-inset kangur-card-padding-sm mt-3 max-w-none [background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,#cbd5e1)] [color:var(--kangur-page-text)]'
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.explanation) }}
        />
      ) : null}
    </div>
  );
}

function renderQuizBlock(
  block: KangurLessonQuizBlock,
  key: string,
  renderMode: 'lesson' | 'editor'
): React.JSX.Element {
  if (renderMode === 'editor') {
    return (
      <div
        key={key}
        data-testid={`lesson-quiz-block-${block.id}`}
        className='soft-card kangur-lesson-callout kangur-card-padding-md border'
        style={{ borderColor: 'var(--kangur-soft-card-border)' }}
      >
        <KangurSectionEyebrow className='mb-2 text-xs tracking-wide'>
          Quiz
        </KangurSectionEyebrow>
        <div
          className='prose prose-sm mb-3 max-w-none font-semibold [color:var(--kangur-page-text)]'
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.question) }}
        />
        <ul className='space-y-1'>
          {block.choices.map((choice) => (
            <li
              key={choice.id}
              className={cn(
                'kangur-lesson-inset px-3 py-1.5 text-sm',
                choice.id === block.correctChoiceId
                  ? 'font-semibold'
                  : '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,#cbd5e1)] [color:var(--kangur-page-muted-text)]'
              )}
              style={
                choice.id === block.correctChoiceId
                  ? {
                      background:
                        'color-mix(in srgb, var(--kangur-soft-card-background) 82%, #d1fae5)',
                      color:
                        'color-mix(in srgb, rgb(6 95 70) 82%, var(--kangur-page-text))',
                    }
                  : undefined
              }
            >
                {choice.id === block.correctChoiceId ? '✓ ' : ''}
              {choice.text}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return <KangurLessonQuizBlockView key={key} block={block} />;
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
                  if (block.type === 'callout') {
                    return renderCalloutBlock(block, block.id);
                  }
                  if (block.type === 'quiz') {
                    return renderQuizBlock(block, block.id, renderMode);
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
