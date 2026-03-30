'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, JSX, ReactNode, ReactPortal } from 'react';
import { createPortal } from 'react-dom';

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

const KANGUR_DRAG_HANDLE_SELECTOR = [
  '[data-rfd-drag-handle-draggable-id]',
  '[data-rbd-drag-handle-draggable-id]',
].join(', ');

const getClosestDragHandle = (target: EventTarget | null): HTMLElement | null => {
  if (target instanceof HTMLElement) {
    return target.closest<HTMLElement>(KANGUR_DRAG_HANDLE_SELECTOR);
  }
  if (target instanceof Node) {
    return target.parentElement?.closest<HTMLElement>(KANGUR_DRAG_HANDLE_SELECTOR) ?? null;
  }
  return null;
};

const isTouchPointerEvent = (event: Event): boolean =>
  typeof PointerEvent !== 'undefined' &&
  event instanceof PointerEvent &&
  (event.pointerType === 'touch' || event.pointerType === 'pen');

const preventDefaultIfCancelable = (event: Event): void => {
  if (event.cancelable) {
    event.preventDefault();
  }
};

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

export const renderKangurDragPreview = (
  content: JSX.Element,
  isDragging: boolean
): JSX.Element | ReactPortal => {
  if (!isDragging || typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
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
  const isTouchInteractionActiveRef = useRef(false);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const handleTouchStart = (event: Event): void => {
      if (isTouchInteractionActiveRef.current || getClosestDragHandle(event.target) === null) {
        return;
      }
      preventDefaultIfCancelable(event);
      isTouchInteractionActiveRef.current = true;
      lock();
    };

    const handlePointerDown = (event: Event): void => {
      if (
        isTouchInteractionActiveRef.current ||
        !isTouchPointerEvent(event) ||
        getClosestDragHandle(event.target) === null
      ) {
        return;
      }
      preventDefaultIfCancelable(event);
      isTouchInteractionActiveRef.current = true;
      lock();
    };

    const handleInteractionEnd = (): void => {
      if (!isTouchInteractionActiveRef.current) {
        return;
      }
      isTouchInteractionActiveRef.current = false;
      unlock();
    };

    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    document.addEventListener('touchend', handleInteractionEnd, { capture: true, passive: true });
    document.addEventListener('touchcancel', handleInteractionEnd, {
      capture: true,
      passive: true,
    });
    document.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: false });
    document.addEventListener('pointerup', handleInteractionEnd, { capture: true, passive: true });
    document.addEventListener('pointercancel', handleInteractionEnd, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchend', handleInteractionEnd, { capture: true });
      document.removeEventListener('touchcancel', handleInteractionEnd, { capture: true });
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('pointerup', handleInteractionEnd, { capture: true });
      document.removeEventListener('pointercancel', handleInteractionEnd, { capture: true });
      if (isTouchInteractionActiveRef.current) {
        isTouchInteractionActiveRef.current = false;
        unlock();
      }
    };
  }, [lock, unlock]);

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
