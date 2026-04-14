'use client';

import {
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DraggableProvidedDraggableProps,
  type DropResult,
} from '@hello-pangea/dnd';
import React from 'react';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import { getKangurCheckButtonClassName } from '@/features/kangur/ui/components/KangurCheckButton';

import { KangurButton } from '@/features/kangur/ui/design/primitives';
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

type AgenticDocsHierarchyGameContextValue = {
  accent: KangurAccent;
  isCoarsePointer: boolean;
  checked: boolean;
  resolvedOrder: readonly string[];
  isComplete: boolean;
  selectedItemId: string | null;
  showTouchHint: boolean;
  touchHint: string;
  onItemClick: (itemId: string, targetIndex: number) => void;
  onDragEnd: (result: DropResult) => void;
};

const AgenticDocsHierarchyGameContext = React.createContext<AgenticDocsHierarchyGameContextValue | null>(null);

function useAgenticDocsHierarchyGame(): AgenticDocsHierarchyGameContextValue {
  const context = React.useContext(AgenticDocsHierarchyGameContext);
  if (!context) {
    throw new Error('useAgenticDocsHierarchyGame must be used within AgenticDocsHierarchyGame.');
  }
  return context;
}

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
  isCorrect: boolean;
  isIncorrect: boolean;
  isDragging: boolean;
  isSelected: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  draggableProps: DraggableProvidedDraggableProps;
  innerRef: (element: HTMLElement | null) => void;
};

function HierarchyItemButton({
  item,
  index,
  isCorrect,
  isIncorrect,
  isDragging,
  isSelected,
  dragHandleProps,
  draggableProps,
  innerRef,
}: HierarchyItemButtonProps): React.JSX.Element {
  const { accent, isCoarsePointer, checked, isComplete, onItemClick } = useAgenticDocsHierarchyGame();
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

type HierarchyDraggableItemConfig = {
  item: HierarchyItem;
  index: number;
};

function HierarchyDraggableItem({
  config,
}: {
  config: HierarchyDraggableItemConfig;
}): React.JSX.Element {
  const { item, index } = config;
  const { checked, resolvedOrder, selectedItemId, isComplete } = useAgenticDocsHierarchyGame();
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
            isCorrect={isCorrect}
            isIncorrect={isIncorrect}
            isDragging={snapshot.isDragging}
            isSelected={selectedItemId === item.id}
            dragHandleProps={provided.dragHandleProps}
            draggableProps={provided.draggableProps}
            innerRef={provided.innerRef}
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
  isTouchMoveTargetActive: boolean;
};

function HierarchyList({
  droppableId,
  state,
}: {
  droppableId: string;
  state: {
    order: HierarchyItem[];
    isTouchMoveTargetActive: boolean;
  };
}): React.JSX.Element {
  const { order, isTouchMoveTargetActive } = state;
  const { onDragEnd } = useAgenticDocsHierarchyGame();
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
                config={{ item, index }}
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

function HierarchyTouchHint(): React.JSX.Element | null {
  const { showTouchHint: show, touchHint: text } = useAgenticDocsHierarchyGame();
  if (!show) return null;

  return (
    <KangurLessonCaption
      className='mt-2 text-left font-semibold text-emerald-700'
      data-testid='agentic-docs-hierarchy-touch-hint'
      role='status'
      aria-live='polite'
      aria-atomic='true'
    >
      {text}
    </KangurLessonCaption>
  );
}

const createResetHierarchyGame = ({
  items,
  setOrder,
  setChecked,
  setSelectedItemId,
}: {
  items: readonly HierarchyItem[];
  setOrder: React.Dispatch<React.SetStateAction<HierarchyItem[]>>;
  setChecked: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedItemId: React.Dispatch<React.SetStateAction<string | null>>;
}) => () => {
  setOrder(shuffle(items));
  setChecked(false);
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
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const resetHierarchyGame = useCallback(
    createResetHierarchyGame({ items, setOrder, setChecked, setSelectedItemId }),
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
  const showTouchHint = isCoarsePointer || selectedItem !== null;
  const touchHint = resolveTouchHint({ helperText, selectedItem, touchSelectedTemplate });
  const isTouchMoveTargetActive = Boolean(selectedItemId && !checked && isCoarsePointer);

  return {
    droppableId,
    isCoarsePointer,
    resolvedOrder,
    order,
    checked,
    isComplete,
    selectedItemId,
    showTouchHint,
    touchHint,
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
    <AgenticDocsHierarchyGameContext.Provider
      value={{
        accent,
        isCoarsePointer: runtime.isCoarsePointer,
        checked: runtime.checked,
        resolvedOrder: runtime.resolvedOrder,
        isComplete: runtime.isComplete,
        selectedItemId: runtime.selectedItemId,
        showTouchHint: runtime.showTouchHint,
        touchHint: runtime.touchHint,
        onItemClick: runtime.handleItemClick,
        onDragEnd: runtime.handleDragEnd,
      }}
    >
      <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
        <div className={cn(KANGUR_CENTER_ROW_CLASSNAME, 'justify-between gap-3')}>
          <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>{prompt}</div>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>{helperText}</KangurLessonCaption>
        <HierarchyTouchHint />
        <HierarchyList
          droppableId={runtime.droppableId}
          order={runtime.order}
          isTouchMoveTargetActive={runtime.isTouchMoveTargetActive}
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
      </KangurLessonCallout>
    </AgenticDocsHierarchyGameContext.Provider>
  );
}
