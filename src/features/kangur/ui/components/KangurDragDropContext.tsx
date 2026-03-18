'use client';

import { useCallback } from 'react';
import type { JSX, ReactNode } from 'react';

import {
  DragDropContext,
} from '@hello-pangea/dnd';
import type {
  DragDropContextProps,
  OnDragEndResponder,
  OnDragStartResponder,
} from '@hello-pangea/dnd';

import { useKangurMobileInteractionScrollLock } from '@/features/kangur/ui/hooks/useKangurMobileInteractionScrollLock';

type DragStartResponder = NonNullable<OnDragStartResponder>;
type DragEndResponder = NonNullable<OnDragEndResponder>;

type Props = Omit<DragDropContextProps, 'children'> & {
  onDragStart?: DragStartResponder;
  onDragEnd?: DragEndResponder;
  children?: ReactNode;
};

export const KangurDragDropContext = ({
  onDragStart,
  onDragEnd,
  children,
  ...props
}: Props): JSX.Element => {
  const { lock, unlock } = useKangurMobileInteractionScrollLock();

  const handleDragStart = useCallback(
    (...args: Parameters<DragStartResponder>): void => {
      lock();
      if (onDragStart) {
        onDragStart(...args);
      }
    },
    [lock, onDragStart]
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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DragDropContext>
  );
};
