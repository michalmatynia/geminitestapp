'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { resolveKangurLessonDocumentPages } from '@/features/kangur/lesson-documents';
import {
  KangurButton,
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
import { KANGUR_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useOptionalKangurLessonPrint } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
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
} from '@/features/kangur/shared/contracts/kangur';
import { cn, sanitizeHtml, sanitizeSvg } from '@/features/kangur/shared/utils';

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
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
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
    2: 'col-span-1 sm:col-span-2',
    3: 'col-span-1 sm:col-span-2 lg:col-span-3',
    4: 'col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4',
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
    2: 'row-span-1 sm:row-span-2',
    3: 'row-span-1 sm:row-span-2 lg:row-span-3',
    4: 'row-span-1 sm:row-span-2 lg:row-span-3 xl:row-span-4',
  },
} as const;

const GRID_ITEM_COLUMN_START_CLASSNAME_NO_STACK: Record<
  KangurLessonGridBlock['columns'],
  string
> = {
  1: '',
  2: 'sm:[grid-column-start:var(--lesson-grid-column-start)]',
  3: 'lg:[grid-column-start:var(--lesson-grid-column-start)]',
  4: 'xl:[grid-column-start:var(--lesson-grid-column-start)]',
};

const GRID_ITEM_ROW_START_CLASSNAME_NO_STACK: Record<
  KangurLessonGridBlock['columns'],
  string
> = {
  1: '',
  2: 'sm:[grid-row-start:var(--lesson-grid-row-start)]',
  3: 'lg:[grid-row-start:var(--lesson-grid-row-start)]',
  4: 'xl:[grid-row-start:var(--lesson-grid-row-start)]',
};

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
  translate: (key: string) => string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  const svgLabel =
    block.ttsDescription?.trim() ||
    block.title.trim() ||
    translate('svgAltFallback');

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
          role='img'
          aria-label={svgLabel}
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
  translate: (key: string) => string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  const hasSource = block.src.trim().length > 0;
  const altText = block.altText?.trim() || block.title.trim() || translate('imageAltFallback');

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
              title={translate('imageMissingSource')}
            />
          )}
        </KangurMediaFrame>
      </div>
      {block.caption?.trim() ? (
        <div className='mt-3 break-words text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
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
  translate: (key: string) => string,
  options?: { fillHeight?: boolean }
): React.JSX.Element {
  if (block.type === 'svg') {
    return renderSvgBlock(block, key, translate, options);
  }

  if (block.type === 'image') {
    return renderImageBlock(block, key, translate, options);
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

function renderCalloutBlock(
  block: KangurLessonCalloutBlock,
  key: string,
  translate: (key: string) => string
): React.JSX.Element {
  const style = {
    ...CALLOUT_STYLES[block.variant],
    label: translate(`callouts.${block.variant}`),
  };
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
      <div
        className={`mb-1 ${KANGUR_CENTER_ROW_CLASSNAME} break-words text-sm font-semibold`}
        style={{ color: style.text }}
      >
        <span aria-hidden>{style.icon}</span>
        {block.title?.trim() || style.label}
      </div>
      <KangurProse
        className='text-sm leading-6'
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.html) }}
      />
    </div>
  );
}

type QuizState = { selectedId: string | null; revealed: boolean };

function KangurLessonQuizBlockView(
  props: { block: KangurLessonQuizBlock; translate: (key: string, values?: Record<string, string | number>) => string }
): React.JSX.Element {
  const { block, translate } = props;
  const navigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const isCoarsePointer = useKangurCoarsePointer();
  const lessonPrint = useOptionalKangurLessonPrint();
  const [state, setState] = React.useState<QuizState>({ selectedId: null, revealed: false });
  const correctChoiceId = block.correctChoiceId;
  const printPanelId = `lesson-quiz-panel-${block.id}`;
  const printPanelTitle = translate('quizEyebrow');
  const printPanelLabel = navigationTranslations('printPanel');

  const handleSelect = (choiceId: string): void => {
    if (state.revealed) return;
    setState({ selectedId: choiceId, revealed: true });
  };

  return (
    <div
      data-testid={`lesson-quiz-block-${block.id}`}
      data-kangur-print-panel='true'
      data-kangur-print-panel-id={printPanelId}
      data-kangur-print-panel-title={printPanelTitle}
      className='soft-card kangur-lesson-callout kangur-card-padding-md border shadow-sm'
      style={{ borderColor: 'var(--kangur-soft-card-border)' }}
    >
      <div
        className='kangur-print-only space-y-3 border-b border-slate-200 pb-4'
        data-testid={`lesson-quiz-print-summary-${block.id}`}
      >
        <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
          {translate('quizEyebrow')}
        </div>
        <KangurProse
          className='text-sm font-semibold leading-6 text-slate-900'
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.question) }}
        />
        <ul className='space-y-2 text-sm text-slate-700'>
          {block.choices.map((choice) => {
            const isCorrect = choice.id === correctChoiceId;
            return (
              <li
                key={choice.id}
                data-testid={`lesson-quiz-print-choice-${choice.id}`}
                className={cn(
                  'rounded-lg border px-4 py-2',
                  isCorrect && 'font-semibold'
                )}
                style={{
                  borderColor: isCorrect ? '#86efac' : '#cbd5e1',
                  background: isCorrect ? '#f0fdf4' : '#ffffff',
                  color: isCorrect ? '#166534' : '#334155',
                }}
              >
                {isCorrect ? '✓ ' : ''}
                {choice.text}
              </li>
            );
          })}
        </ul>
        {block.explanation?.trim() ? (
          <KangurProse
            className='border-t border-slate-200 pt-3 text-sm leading-6 text-slate-600'
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.explanation) }}
          />
        ) : null}
      </div>

      <div data-kangur-print-exclude='true' data-testid={`lesson-quiz-live-ui-${block.id}`}>
        {lessonPrint?.onPrintPanel ? (
          <div className='mb-4 flex justify-end'>
            <KangurButton
              type='button'
              size='sm'
              variant='surface'
              className={
                isCoarsePointer
                  ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
                  : 'px-4'
              }
              data-testid={`lesson-quiz-print-button-${block.id}`}
              aria-label={printPanelLabel}
              title={printPanelLabel}
              onClick={(): void => {
                lessonPrint.onPrintPanel?.(printPanelId);
              }}
            >
              <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
              <span className='sr-only'>{printPanelLabel}</span>
            </KangurButton>
          </div>
        ) : null}
        <KangurProse
          className='mb-4 text-sm font-semibold leading-6 [color:var(--kangur-page-text)]'
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.question) }}
        />
        <div className='space-y-2'>
          {block.choices.map((choice) => {
            const isSelected = state.selectedId === choice.id;
            const isCorrect = choice.id === correctChoiceId;
            let choiceClass =
              'w-full cursor-pointer break-words rounded-lg border px-4 py-2 text-left text-sm transition touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white active:scale-[0.985] disabled:cursor-default';
            if (isCoarsePointer) {
              choiceClass += ' min-h-[4.25rem] rounded-2xl py-3 text-base';
            }
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
                aria-label={translate('quizAnswerAria', { answer: choice.text })}
                aria-pressed={isSelected}
                data-testid={`lesson-quiz-choice-${choice.id}`}
              >
                {choice.text}
              </button>
            );
          })}
        </div>
      </div>
      {state.revealed && block.explanation?.trim() ? (
        <KangurProse
          className='kangur-lesson-inset kangur-card-padding-sm mt-3 text-sm leading-6 [background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,#cbd5e1)] [color:var(--kangur-page-text)]'
          data-kangur-print-exclude='true'
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.explanation) }}
        />
      ) : null}
    </div>
  );
}

function renderQuizBlock(
  block: KangurLessonQuizBlock,
  key: string,
  translate: (key: string, values?: Record<string, string | number>) => string,
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
          {translate('quizEyebrow')}
        </KangurSectionEyebrow>
        <KangurProse
          className='mb-3 text-sm font-semibold leading-6 [color:var(--kangur-page-text)]'
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.question) }}
        />
        <ul className='space-y-1'>
          {block.choices.map((choice) => (
            <li
              key={choice.id}
              className={cn(
                'kangur-lesson-inset break-words px-3 py-1.5 text-sm',
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

  return <KangurLessonQuizBlockView key={key} block={block} translate={translate} />;
}

function renderGridBlock(
  block: KangurLessonGridBlock,
  key: string,
  translate: (key: string) => string
): React.JSX.Element {
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
                  : GRID_ITEM_COLUMN_START_CLASSNAME_NO_STACK[block.columns]),
              item.rowStart !== null &&
                (block.stackOnMobile
                  ? 'md:[grid-row-start:var(--lesson-grid-row-start)]'
                  : GRID_ITEM_ROW_START_CLASSNAME_NO_STACK[block.columns])
            )}
            style={getGridItemPlacementStyle(item.columnStart, item.rowStart)}
          >
            {renderInlineBlock(item.block, item.block.id, translate, { fillHeight: true })}
          </div>
        ))}
      </div>
    </KangurSurfacePanel>
  );
}

export function KangurLessonDocumentRenderer(
  props: KangurLessonDocumentRendererProps
): React.JSX.Element {
  const translations = useTranslations('KangurLessonsWidgets.documentRenderer');
  const navigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const { document, className, renderMode = 'lesson', activePageId } = props;
  const lessonPrint = useOptionalKangurLessonPrint();
  const isCoarsePointer = useKangurCoarsePointer();
  const allPages = resolveKangurLessonDocumentPages(document);
  const pages = activePageId ? allPages.filter((page) => page.id === activePageId) : allPages;
  const printPanelLabel = navigationTranslations('printPanel');

  return (
    <div
      className={cn('w-full max-w-5xl space-y-6', className)}
      data-kangur-print-document='true'
      data-testid='lesson-document-root'
    >
      {pages.map((page, pageIndex) =>
        (() => {
          const previousPage = pages[pageIndex - 1];
          const currentSectionIdentity = page.sectionKey?.trim() || page.sectionTitle?.trim() || '';
          const previousSectionIdentity =
            previousPage?.sectionKey?.trim() || previousPage?.sectionTitle?.trim() || '';
          const showSectionHeader =
            currentSectionIdentity.length > 0 && currentSectionIdentity !== previousSectionIdentity;
          const shouldShowPageSummary =
            pages.length > 1 || Boolean(page.title?.trim()) || Boolean(page.description?.trim());
          const printHeadingTitle =
            page.title?.trim() ||
            (showSectionHeader ? page.sectionTitle?.trim() || '' : '');
          const printHeadingDescription =
            page.title?.trim()
              ? page.description?.trim() || ''
              : showSectionHeader
                ? page.sectionDescription?.trim() || page.description?.trim() || ''
                : page.description?.trim() || '';
          const shouldShowPrintHeading =
            printHeadingTitle.length > 0 || printHeadingDescription.length > 0;

          return (
            <KangurGlassPanel
              key={page.id}
              data-kangur-print-panel='true'
              data-kangur-print-paged-panel='true'
              data-kangur-print-panel-id={page.id}
              data-kangur-print-panel-title={printHeadingTitle || page.title?.trim() || page.sectionTitle?.trim() || ''}
              data-testid={`lesson-page-shell-${page.id}`}
              className={cn(
                'space-y-6 backdrop-blur-sm',
                page.blocks.length === 0 && 'border-dashed'
              )}
              padding='md'
              surface='mistSoft'
              variant='elevated'
            >
              {renderMode === 'lesson' && lessonPrint?.onPrintPanel ? (
                <div className='flex justify-end' data-kangur-print-exclude='true'>
                  <KangurButton
                    onClick={() => lessonPrint.onPrintPanel?.(page.id)}
                    size='sm'
                    type='button'
                    variant='surface'
                    className={cn(
                      'justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)]',
                      isCoarsePointer
                        ? 'min-h-11 touch-manipulation select-none active:scale-[0.97]'
                        : null
                    )}
                    data-testid={`lesson-page-print-button-${page.id}`}
                    aria-label={printPanelLabel}
                    title={printPanelLabel}
                  >
                    <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
                    <span className='sr-only'>{printPanelLabel}</span>
                  </KangurButton>
                </div>
              ) : null}
              {shouldShowPrintHeading ? (
                <div
                  className='kangur-print-only space-y-2 border-b border-slate-200 pb-4'
                  data-kangur-print-page-heading='true'
                  data-testid={`lesson-page-print-heading-${page.id}`}
                >
                  {printHeadingTitle ? (
                    <div className='text-xl font-black text-slate-900'>{printHeadingTitle}</div>
                  ) : null}
                  {printHeadingDescription ? (
                    <p className='text-sm text-slate-600'>{printHeadingDescription}</p>
                  ) : null}
                </div>
              ) : null}

              {showSectionHeader ? (
                <KangurSummaryPanel
                  accent='emerald'
                  data-kangur-print-exclude='true'
                  data-testid={`lesson-page-section-summary-${page.id}`}
                  description={page.sectionDescription?.trim() || undefined}
                  label={translations('sectionLabel')}
                  labelAccent='emerald'
                  padding='lg'
                  title={page.sectionTitle?.trim() || undefined}
                />
              ) : null}

              {shouldShowPageSummary ? (
                <KangurSummaryPanel
                  accent='slate'
                  data-kangur-print-exclude='true'
                  data-testid={`lesson-page-summary-${page.id}`}
                  description={page.description?.trim() || undefined}
                  label={translations('pageLabel', { index: pageIndex + 1 })}
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
                      ? translations('editorEmptyDescription')
                      : undefined
                  }
                  padding='xl'
                  title={translations('noBlocksTitle')}
                />
              ) : (
                page.blocks.map((block) => {
                  if (block.type === 'grid') {
                    return renderGridBlock(block, block.id, translations);
                  }
                  if (block.type === 'activity') {
                    return renderActivityBlock(block, block.id, renderMode);
                  }
                  if (block.type === 'callout') {
                    return renderCalloutBlock(block, block.id, translations);
                  }
                  if (block.type === 'quiz') {
                    return renderQuizBlock(block, block.id, translations, renderMode);
                  }
                  return renderInlineBlock(block, block.id, translations);
                })
              )}
            </KangurGlassPanel>
          );
        })()
      )}
    </div>
  );
}
