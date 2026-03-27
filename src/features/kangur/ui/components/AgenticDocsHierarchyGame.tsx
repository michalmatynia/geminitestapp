'use client';

import { Draggable, Droppable, type DropResult } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import { getKangurCheckButtonClassName } from '@/features/kangur/ui/components/KangurCheckButton';

import { KangurButton, KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import {
  KangurLessonCallout,
  KangurLessonCaption,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_STACK_SPACED_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { cn } from '@/features/kangur/shared/utils';

type HierarchyItem = {
  id: string;
  title: string;
  description?: string;
};

type AgenticDocsHierarchyGameProps = {
  items: readonly HierarchyItem[];
  correctOrder: readonly string[];
  accent?: KangurAccent;
  prompt?: string;
  helperText?: string;
  touchSelectedTemplate?: string;
};

const dragPortal = typeof document === 'undefined' ? null : document.body;

const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const reorder = <T,>(items: T[], from: number, to: number): T[] => {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (!moved) return items;
  next.splice(to, 0, moved);
  return next;
};

export default function AgenticDocsHierarchyGame({
  items,
  correctOrder,
  accent = 'emerald',
  prompt = 'Ułóż hierarchię trosk w dokumentacji.',
  helperText = 'Najważniejsze u góry, najbardziej operacyjne na dole.',
  touchSelectedTemplate = 'Wybrana karta: {title}. Dotknij innej pozycji, aby przenieść kartę.',
}: AgenticDocsHierarchyGameProps): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const droppableId = useId().replace(/[:]/g, '');
  const resolvedOrder = useMemo(
    () => (correctOrder.length === items.length ? correctOrder : items.map((item) => item.id)),
    [correctOrder, items]
  );
  const [order, setOrder] = useState<HierarchyItem[]>(() => shuffle(items));
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    setOrder(shuffle(items));
    setChecked(false);
    setAttempts(0);
    setSelectedItemId(null);
  }, [items]);

  const correctCount = useMemo(
    () => order.filter((item, index) => item.id === resolvedOrder[index]).length,
    [order, resolvedOrder]
  );
  const isComplete = checked && correctCount === order.length;

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const next = reorder(order, result.source.index, result.destination.index);
      setOrder(next);
      setSelectedItemId(null);
      if (checked) {
        setChecked(false);
      }
    },
    [checked, order]
  );

  const handleCheck = (): void => {
    setChecked(true);
    setAttempts((prev) => prev + 1);
  };

  const handleReset = (): void => {
    setOrder(shuffle(items));
    setChecked(false);
    setSelectedItemId(null);
  };

  const moveSelectedToIndex = (targetIndex: number): void => {
    if (checked || !selectedItemId) return;
    setOrder((prev) => {
      const currentIndex = prev.findIndex((item) => item.id === selectedItemId);
      if (currentIndex < 0 || currentIndex === targetIndex) return prev;
      return reorder(prev, currentIndex, targetIndex);
    });
    setSelectedItemId(null);
  };

  const selectedItem = selectedItemId
    ? order.find((item) => item.id === selectedItemId) ?? null
    : null;

  const statusLabel = checked
    ? isComplete
      ? 'Perfekcyjna kolejność'
      : `${correctCount}/${order.length} poprawnie`
    : 'Przeciągnij, aby ułożyć';

  return (
    <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
      <div className={cn(KANGUR_CENTER_ROW_CLASSNAME, 'justify-between gap-3')}>
        <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>{prompt}</div>
        <KangurStatusChip accent={accent} size='sm' labelStyle='caps'>
          {statusLabel}
        </KangurStatusChip>
      </div>
      <KangurLessonCaption className='mt-2 text-left'>{helperText}</KangurLessonCaption>
      {isCoarsePointer || selectedItem ? (
        <KangurLessonCaption
          className='mt-2 text-left font-semibold text-emerald-700'
          data-testid='agentic-docs-hierarchy-touch-hint'
          role='status'
          aria-live='polite'
          aria-atomic='true'
        >
          {selectedItem
            ? touchSelectedTemplate.replaceAll('{title}', selectedItem.title)
            : helperText}
        </KangurLessonCaption>
      ) : null}
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`docs-hierarchy-${droppableId}`}>
          {(droppableProvided, snapshot) => (
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              data-testid='agentic-docs-hierarchy-list'
              className={cn(
                KANGUR_STACK_SPACED_CLASSNAME,
                'mt-3 rounded-[20px] border border-dashed px-3 py-3 transition touch-manipulation',
                snapshot.isDraggingOver
                  ? 'border-emerald-300 bg-emerald-50/60'
                  : selectedItemId && !checked && isCoarsePointer
                    ? 'border-emerald-200 bg-emerald-50/35'
                    : 'border-slate-200'
              )}
            >
              {order.map((item, index) => (
                <Draggable
                  key={item.id}
                  draggableId={item.id}
                  index={index}
                  isDragDisabled={isComplete}
                  disableInteractiveElementBlocking
                >
                  {(provided, snapshot) => {
                    const isCorrect = checked && item.id === resolvedOrder[index];
                    const isIncorrect = checked && item.id !== resolvedOrder[index];
                    const content = (
                      <button
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={getKangurMobileDragHandleStyle(
                          provided.draggableProps.style,
                          isCoarsePointer
                        )}
                        type='button'
                        className={cn(
                          'flex w-full items-start gap-3 rounded-[18px] border text-left shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white touch-manipulation',
                          isCoarsePointer ? 'min-h-[5rem] px-4 py-3' : 'px-3 py-2',
                          KANGUR_ACCENT_STYLES[accent].hoverCard,
                          isCorrect && 'border-emerald-200 bg-emerald-50',
                          isIncorrect && 'border-rose-200 bg-rose-50',
                          !checked && 'border-slate-200 bg-white/80',
                          snapshot.isDragging && 'scale-[1.01] shadow-[0_18px_32px_-20px_rgba(5,150,105,0.35)]',
                          selectedItemId === item.id &&
                            !snapshot.isDragging &&
                            'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white'
                        )}
                        data-testid={`agentic-docs-hierarchy-item-${item.id}`}
                        aria-label={`Pozycja ${index + 1}: ${item.title}`}
                        aria-pressed={selectedItemId === item.id}
                        disabled={isComplete}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (isComplete) return;
                          if (isCoarsePointer && selectedItemId && selectedItemId !== item.id) {
                            moveSelectedToIndex(index);
                            return;
                          }
                          setSelectedItemId((current) => (current === item.id ? null : item.id));
                        }}
                      >
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                            KANGUR_ACCENT_STYLES[accent].badge
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className='flex flex-col gap-1'>
                          <span className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                            {item.title}
                          </span>
                          {item.description ? (
                            <span className='text-xs text-slate-600'>{item.description}</span>
                          ) : null}
                        </span>
                      </button>
                    );

                    if (snapshot.isDragging && dragPortal) {
                      return createPortal(content, dragPortal);
                    }
                    return content;
                  }}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </KangurDragDropContext>
      <div className={cn(KANGUR_CENTER_ROW_CLASSNAME, 'mt-3 flex-wrap justify-start gap-2')}>
        <KangurButton
          size='sm'
          variant='primary'
          onClick={handleCheck}
          disabled={isComplete}
          className={getKangurCheckButtonClassName(
            undefined,
            checked ? (isComplete ? 'success' : 'error') : null
          )}
        >
          Sprawdź
        </KangurButton>
        <KangurButton size='sm' variant='ghost' onClick={handleReset}>
          Reset
        </KangurButton>
      </div>
      {checked && !isComplete && attempts > 0 ? (
        <KangurLessonCaption className='mt-2 text-left'>
          Zaczynaj od celu i kontekstu, a operacyjne rzeczy zostaw na koniec.
        </KangurLessonCaption>
      ) : null}
      {checked ? (
        <KangurLessonCaption role='status' aria-live='polite' className='mt-2 text-left'>
          {isComplete
            ? 'Świetnie! To jest prawidłowa hierarchia.'
            : 'Sprawdź, które elementy są jeszcze nie na miejscu.'}
        </KangurLessonCaption>
      ) : null}
    </KangurLessonCallout>
  );
}
