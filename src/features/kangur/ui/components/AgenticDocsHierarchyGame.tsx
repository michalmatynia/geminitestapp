'use client';

import {
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DraggableProvidedDraggableProps,
  type DropResult,
} from '@hello-pangea/dnd';
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

const resolveCorrectOrder = (
  items: readonly HierarchyItem[],
  correctOrder: readonly string[]
): readonly string[] => (
  correctOrder.length === items.length ? correctOrder : items.map((item) => item.id)
);

const resolveStatusLabel = ({
  checked,
  isComplete,
  correctCount,
  totalCount,
}: {
  checked: boolean;
  isComplete: boolean;
  correctCount: number;
  totalCount: number;
}): string => {
  if (!checked) return 'Przeciągnij, aby ułożyć';
  if (isComplete) return 'Perfekcyjna kolejność';
  return `${correctCount}/${totalCount} poprawnie`;
};

const resolveTouchHint = ({
  helperText,
  selectedItem,
  touchSelectedTemplate,
}: {
  helperText?: string;
  selectedItem: HierarchyItem | null;
  touchSelectedTemplate?: string;
}): string => (
  selectedItem
    ? (touchSelectedTemplate ?? '').replaceAll('{title}', selectedItem.title)
    : helperText ?? ''
);

const resolveGuidanceCaption = ({
  checked,
  isComplete,
  attempts,
}: {
  checked: boolean;
  isComplete: boolean;
  attempts: number;
}): string | null => {
  if (!checked || isComplete || attempts < 1) return null;
  return 'Zaczynaj od celu i kontekstu, a operacyjne rzeczy zostaw na koniec.';
};

const resolveResultCaption = ({
  checked,
  isComplete,
}: {
  checked: boolean;
  isComplete: boolean;
}): string | null => {
  if (!checked) return null;
  return isComplete
    ? 'Świetnie! To jest prawidłowa hierarchia.'
    : 'Sprawdź, które elementy są jeszcze nie na miejscu.';
};

const resolveListStateClassName = ({
  isDraggingOver,
  isTouchMoveTargetActive,
}: {
  isDraggingOver: boolean;
  isTouchMoveTargetActive: boolean;
}): string => {
  if (isDraggingOver) return 'border-emerald-300 bg-emerald-50/60';
  if (isTouchMoveTargetActive) return 'border-emerald-200 bg-emerald-50/35';
  return 'border-slate-200';
};

const resolveItemSurfaceClassName = ({
  isCoarsePointer,
  isCorrect,
  isIncorrect,
  checked,
  isDragging,
  isSelected,
  accent,
}: {
  isCoarsePointer: boolean;
  isCorrect: boolean;
  isIncorrect: boolean;
  checked: boolean;
  isDragging: boolean;
  isSelected: boolean;
  accent: KangurAccent;
}): string =>
  cn(
    'flex w-full items-start gap-3 rounded-[18px] border text-left shadow-[0_12px_24px_-20px_rgba(15,23,42,0.35)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white touch-manipulation',
    isCoarsePointer ? 'min-h-[5rem] px-4 py-3' : 'px-3 py-2',
    KANGUR_ACCENT_STYLES[accent].hoverCard,
    isCorrect && 'border-emerald-200 bg-emerald-50',
    isIncorrect && 'border-rose-200 bg-rose-50',
    !checked && 'border-slate-200 bg-white/80',
    isDragging && 'scale-[1.01] shadow-[0_18px_32px_-20px_rgba(5,150,105,0.35)]',
    isSelected && !isDragging && 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white'
  );

type HierarchyItemButtonProps = {
  item: HierarchyItem;
  index: number;
  accent: KangurAccent;
  isCoarsePointer: boolean;
  isCorrect: boolean;
  isIncorrect: boolean;
  checked: boolean;
  isDragging: boolean;
  isSelected: boolean;
  isComplete: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  draggableProps: DraggableProvidedDraggableProps;
  innerRef: (element: HTMLElement | null) => void;
  onItemClick: (itemId: string, targetIndex: number) => void;
};

function HierarchyItemButton({
  item,
  index,
  accent,
  isCoarsePointer,
  isCorrect,
  isIncorrect,
  checked,
  isDragging,
  isSelected,
  isComplete,
  dragHandleProps,
  draggableProps,
  innerRef,
  onItemClick,
}: HierarchyItemButtonProps): React.JSX.Element {
  return (
    <button
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      style={getKangurMobileDragHandleStyle(draggableProps.style, isCoarsePointer)}
      type='button'
      className={resolveItemSurfaceClassName({
        isCoarsePointer,
        isCorrect,
        isIncorrect,
        checked,
        isDragging,
        isSelected,
        accent,
      })}
      data-testid={`agentic-docs-hierarchy-item-${item.id}`}
      aria-label={`Pozycja ${index + 1}: ${item.title}`}
      aria-pressed={isSelected}
      disabled={isComplete}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onItemClick(item.id, index);
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
        <span className='text-sm font-semibold [color:var(--kangur-page-text)]'>{item.title}</span>
        {item.description ? <span className='text-xs text-slate-600'>{item.description}</span> : null}
      </span>
    </button>
  );
}

type HierarchyDraggableItemProps = {
  item: HierarchyItem;
  index: number;
  accent: KangurAccent;
  checked: boolean;
  resolvedOrder: readonly string[];
  isCoarsePointer: boolean;
  isComplete: boolean;
  selectedItemId: string | null;
  onItemClick: (itemId: string, targetIndex: number) => void;
};

function HierarchyDraggableItem({
  item,
  index,
  accent,
  checked,
  resolvedOrder,
  isCoarsePointer,
  isComplete,
  selectedItemId,
  onItemClick,
}: HierarchyDraggableItemProps): React.JSX.Element {
  const isCorrect = checked && item.id === resolvedOrder[index];
  const isIncorrect = checked && !isCorrect;

  return (
    <Draggable
      draggableId={item.id}
      index={index}
      isDragDisabled={isComplete}
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => {
        const button = (
          <HierarchyItemButton
            item={item}
            index={index}
            accent={accent}
            isCoarsePointer={isCoarsePointer}
            isCorrect={isCorrect}
            isIncorrect={isIncorrect}
            checked={checked}
            isDragging={snapshot.isDragging}
            isSelected={selectedItemId === item.id}
            isComplete={isComplete}
            dragHandleProps={provided.dragHandleProps}
            draggableProps={provided.draggableProps}
            innerRef={provided.innerRef}
            onItemClick={onItemClick}
          />
        );

        if (snapshot.isDragging && dragPortal) {
          return createPortal(button, dragPortal);
        }
        return button;
      }}
    </Draggable>
  );
}

type HierarchyListProps = {
  droppableId: string;
  order: HierarchyItem[];
  accent: KangurAccent;
  checked: boolean;
  resolvedOrder: readonly string[];
  isCoarsePointer: boolean;
  isComplete: boolean;
  selectedItemId: string | null;
  isTouchMoveTargetActive: boolean;
  onDragEnd: (result: DropResult) => void;
  onItemClick: (itemId: string, targetIndex: number) => void;
};

function HierarchyList({
  droppableId,
  order,
  accent,
  checked,
  resolvedOrder,
  isCoarsePointer,
  isComplete,
  selectedItemId,
  isTouchMoveTargetActive,
  onDragEnd,
  onItemClick,
}: HierarchyListProps): React.JSX.Element {
  return (
    <KangurDragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={`docs-hierarchy-${droppableId}`}>
        {(droppableProvided, snapshot) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            data-testid='agentic-docs-hierarchy-list'
            className={cn(
              KANGUR_STACK_SPACED_CLASSNAME,
              'mt-3 rounded-[20px] border border-dashed px-3 py-3 transition touch-manipulation',
              resolveListStateClassName({
                isDraggingOver: snapshot.isDraggingOver,
                isTouchMoveTargetActive,
              })
            )}
          >
            {order.map((item, index) => (
              <HierarchyDraggableItem
                key={item.id}
                item={item}
                index={index}
                accent={accent}
                checked={checked}
                resolvedOrder={resolvedOrder}
                isCoarsePointer={isCoarsePointer}
                isComplete={isComplete}
                selectedItemId={selectedItemId}
                onItemClick={onItemClick}
              />
            ))}
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </KangurDragDropContext>
  );
}

const resolveCheckButtonTone = (
  checked: boolean,
  isComplete: boolean
): 'success' | 'error' | null => {
  if (!checked) return null;
  return isComplete ? 'success' : 'error';
};

function HierarchyTouchHint(props: {
  show: boolean;
  text: string;
}): React.JSX.Element | null {
  if (!props.show) return null;

  return (
    <KangurLessonCaption
      className='mt-2 text-left font-semibold text-emerald-700'
      data-testid='agentic-docs-hierarchy-touch-hint'
      role='status'
      aria-live='polite'
      aria-atomic='true'
    >
      {props.text}
    </KangurLessonCaption>
  );
}

function HierarchyOutcomeCaptions(props: {
  guidanceCaption: string | null;
  resultCaption: string | null;
}): React.JSX.Element {
  return (
    <>
      {props.guidanceCaption ? (
        <KangurLessonCaption className='mt-2 text-left'>
          {props.guidanceCaption}
        </KangurLessonCaption>
      ) : null}
      {props.resultCaption ? (
        <KangurLessonCaption role='status' aria-live='polite' className='mt-2 text-left'>
          {props.resultCaption}
        </KangurLessonCaption>
      ) : null}
    </>
  );
}

const createResetHierarchyGame = ({
  items,
  setOrder,
  setChecked,
  setAttempts,
  setSelectedItemId,
}: {
  items: readonly HierarchyItem[];
  setOrder: React.Dispatch<React.SetStateAction<HierarchyItem[]>>;
  setChecked: React.Dispatch<React.SetStateAction<boolean>>;
  setAttempts: React.Dispatch<React.SetStateAction<number>>;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
}) => () => {
  setOrder(shuffle(items));
  setChecked(false);
  setAttempts(0);
  setSelectedItemId(null);
};

const createHierarchyDragEndHandler = ({
  order,
  checked,
  setOrder,
  setSelectedItemId,
  setChecked,
}: {
  order: HierarchyItem[];
  checked: boolean;
  setOrder: React.Dispatch<React.SetStateAction<HierarchyItem[]>>;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
  setChecked: React.Dispatch<React.SetStateAction<boolean>>;
}) => (result: DropResult): void => {
  if (!result.destination) return;
  setOrder(reorder(order, result.source.index, result.destination.index));
  setSelectedItemId(null);
  if (checked) {
    setChecked(false);
  }
};

const createMoveSelectedToIndexHandler = ({
  checked,
  selectedItemId,
  setOrder,
  setSelectedItemId,
}: {
  checked: boolean;
  selectedItemId: string | null;
  setOrder: React.Dispatch<React.SetStateAction<HierarchyItem[]>>;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
}) => (targetIndex: number): void => {
  if (checked || !selectedItemId) return;
  setOrder((prev) => {
    const currentIndex = prev.findIndex((item) => item.id === selectedItemId);
    if (currentIndex < 0 || currentIndex === targetIndex) return prev;
    return reorder(prev, currentIndex, targetIndex);
  });
  setSelectedItemId(null);
};

const createHierarchyItemClickHandler = ({
  isComplete,
  isCoarsePointer,
  selectedItemId,
  moveSelectedToIndex,
  setSelectedItemId,
}: {
  isComplete: boolean;
  isCoarsePointer: boolean;
  selectedItemId: string | null;
  moveSelectedToIndex: (targetIndex: number) => void;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
}) => (itemId: string, targetIndex: number): void => {
  if (isComplete) return;
  if (isCoarsePointer && selectedItemId && selectedItemId !== itemId) {
    moveSelectedToIndex(targetIndex);
    return;
  }
  setSelectedItemId((current) => (current === itemId ? null : itemId));
};

function useHierarchyGameRuntime({
  items,
  correctOrder,
  helperText,
  touchSelectedTemplate,
}: Pick<AgenticDocsHierarchyGameProps, 'items' | 'correctOrder' | 'helperText' | 'touchSelectedTemplate'>) {
  const isCoarsePointer = useKangurCoarsePointer();
  const droppableId = useId().replace(/[:]/g, '');
  const resolvedOrder = useMemo(
    () => resolveCorrectOrder(items, correctOrder),
    [correctOrder, items]
  );
  const [order, setOrder] = useState<HierarchyItem[]>(() => shuffle(items));
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const resetHierarchyGame = useCallback(
    createResetHierarchyGame({ items, setOrder, setChecked, setAttempts, setSelectedItemId }),
    [items]
  );

  useEffect(() => {
    resetHierarchyGame();
  }, [resetHierarchyGame]);

  const correctCount = useMemo(
    () => order.filter((item, index) => item.id === resolvedOrder[index]).length,
    [order, resolvedOrder]
  );
  const isComplete = checked && correctCount === order.length;

  const moveSelectedToIndex = useCallback(
    createMoveSelectedToIndexHandler({ checked, selectedItemId, setOrder, setSelectedItemId }),
    [checked, selectedItemId]
  );

  const handleDragEnd = useCallback(
    createHierarchyDragEndHandler({ order, checked, setOrder, setSelectedItemId, setChecked }),
    [checked, order]
  );

  const handleCheck = (): void => {
    setChecked(true);
    setAttempts((prev) => prev + 1);
  };

  const handleReset = resetHierarchyGame;

  const handleItemClick = useCallback(
    createHierarchyItemClickHandler({
      isComplete,
      isCoarsePointer,
      selectedItemId,
      moveSelectedToIndex,
      setSelectedItemId,
    }),
    [isCoarsePointer, isComplete, moveSelectedToIndex, selectedItemId]
  );

  const selectedItem = selectedItemId
    ? order.find((item) => item.id === selectedItemId) ?? null
    : null;
  const statusLabel = resolveStatusLabel({
    checked,
    isComplete,
    correctCount,
    totalCount: order.length,
  });
  const showTouchHint = isCoarsePointer || selectedItem !== null;
  const touchHint = resolveTouchHint({ helperText, selectedItem, touchSelectedTemplate });
  const guidanceCaption = resolveGuidanceCaption({ checked, isComplete, attempts });
  const resultCaption = resolveResultCaption({ checked, isComplete });
  const isTouchMoveTargetActive = Boolean(selectedItemId && !checked && isCoarsePointer);

  return {
    droppableId,
    isCoarsePointer,
    resolvedOrder,
    order,
    checked,
    isComplete,
    selectedItemId,
    statusLabel,
    showTouchHint,
    touchHint,
    guidanceCaption,
    resultCaption,
    isTouchMoveTargetActive,
    handleDragEnd,
    handleItemClick,
    handleCheck,
    handleReset,
  };
}

export default function AgenticDocsHierarchyGame({
  items,
  correctOrder,
  accent = 'emerald',
  prompt = 'Ułóż hierarchię trosk w dokumentacji.',
  helperText = 'Najważniejsze u góry, najbardziej operacyjne na dole.',
  touchSelectedTemplate = 'Wybrana karta: {title}. Dotknij innej pozycji, aby przenieść kartę.',
}: AgenticDocsHierarchyGameProps): React.JSX.Element {
  const runtime = useHierarchyGameRuntime({
    items,
    correctOrder,
    helperText,
    touchSelectedTemplate,
  });

  return (
    <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
      <div className={cn(KANGUR_CENTER_ROW_CLASSNAME, 'justify-between gap-3')}>
        <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>{prompt}</div>
        <KangurStatusChip accent={accent} size='sm' labelStyle='caps'>
          {runtime.statusLabel}
        </KangurStatusChip>
      </div>
      <KangurLessonCaption className='mt-2 text-left'>{helperText}</KangurLessonCaption>
      <HierarchyTouchHint show={runtime.showTouchHint} text={runtime.touchHint} />
      <HierarchyList
        droppableId={runtime.droppableId}
        order={runtime.order}
        accent={accent}
        checked={runtime.checked}
        resolvedOrder={runtime.resolvedOrder}
        isCoarsePointer={runtime.isCoarsePointer}
        isComplete={runtime.isComplete}
        selectedItemId={runtime.selectedItemId}
        isTouchMoveTargetActive={runtime.isTouchMoveTargetActive}
        onDragEnd={runtime.handleDragEnd}
        onItemClick={runtime.handleItemClick}
      />
      <div className={cn(KANGUR_CENTER_ROW_CLASSNAME, 'mt-3 flex-wrap justify-start gap-2')}>
        <KangurButton
          size='sm'
          variant='primary'
          onClick={runtime.handleCheck}
          disabled={runtime.isComplete}
          className={getKangurCheckButtonClassName(
            undefined,
            resolveCheckButtonTone(runtime.checked, runtime.isComplete)
          )}
        >
          Sprawdź
        </KangurButton>
        <KangurButton size='sm' variant='ghost' onClick={runtime.handleReset}>
          Reset
        </KangurButton>
      </div>
      <HierarchyOutcomeCaptions
        guidanceCaption={runtime.guidanceCaption}
        resultCaption={runtime.resultCaption}
      />
    </KangurLessonCallout>
  );
}
