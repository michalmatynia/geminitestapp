'use client';

import { useCallback } from 'react';
import type { CSSProperties, JSX, ReactNode } from 'react';

import {
  DragDropContext,
} from '@hello-pangea/dnd';
import type {
  DragDropContextProps,
  OnBeforeDragStartResponder,
  OnDragEndResponder,
  OnDragStartResponder,
} from '@hello-pangea/dnd';

import { useKangurMobileInteractionScrollLock } from '@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock';

type BeforeDragStartResponder = NonNullable<OnBeforeDragStartResponder>;
type DragStartResponder = NonNullable<OnDragStartResponder>;
type DragEndResponder = NonNullable<OnDragEndResponder>;

export const getKangurMobileDragHandleStyle = (
  style: CSSProperties | undefined,
  isCoarsePointer: boolean
): CSSProperties | undefined => {
  if (!isCoarsePointer) {
    return style;
  }

  return {
    ...(style ?? {}),
    touchAction: 'none',
  };
};

type Props = Omit<DragDropContextProps, 'children'> & {
  onBeforeDragStart?: BeforeDragStartResponder;
  onDragStart?: DragStartResponder;
  onDragEnd?: DragEndResponder;
  children?: ReactNode;
};

export const KangurDragDropContext = ({
  onBeforeDragStart,
  onDragStart,
  onDragEnd,
  children,
  ...props
}: Props): JSX.Element => {
  const { lock, unlock } = useKangurMobileInteractionScrollLock();

  const handleBeforeDragStart = useCallback(
    (...args: Parameters<BeforeDragStartResponder>): void => {
      lock();
      if (onBeforeDragStart) {
        onBeforeDragStart(...args);
      }
    },
    [lock, onBeforeDragStart]
  );

  const handleDragStart = useCallback(
    (...args: Parameters<DragStartResponder>): void => {
      if (onDragStart) {
        onDragStart(...args);
      }
    },
    [onDragStart]
  );

  const handleDragEnd = useCallback(
    (...args: Parameters<DragEndResponder>): void => {
      unlock();
      if (onDragEnd) {
        onDragEnd(...args);
      }
    },
    [unlock, onDragEnd]
  );

  return (
    <DragDropContext
      {...props}
      onBeforeDragStart={handleBeforeDragStart}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DragDropContext>
  );
};
