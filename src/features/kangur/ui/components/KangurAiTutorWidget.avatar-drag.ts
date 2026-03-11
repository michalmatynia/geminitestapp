'use client';

import {
  useCallback,
  useEffect,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';

import type { KangurTutorAnchorRegistration } from '@/features/kangur/ui/context/kangur-tutor-types';

import { getExpandedRect, isSectionExplainableTutorAnchor } from './KangurAiTutorWidget.helpers';
import { AVATAR_SIZE, EDGE_GAP } from './KangurAiTutorWidget.shared';
import {
  clearPersistedTutorAvatarPosition,
  persistTutorAvatarPosition,
} from './KangurAiTutorWidget.storage';

import type {
  GuidedTutorSectionKind,
  GuidedTutorTarget,
  TutorAvatarDragState,
  TutorPoint,
  TutorSurface,
} from './KangurAiTutorWidget.types';

const AVATAR_DRAG_THRESHOLD = 6;
const SECTION_DROP_TARGET_PADDING_X = 18;
const SECTION_DROP_TARGET_PADDING_Y = 18;

type TutorAnchorRegistry = {
  anchors: KangurTutorAnchorRegistration[];
} | null;

type SectionAnchor = KangurTutorAnchorRegistration & {
  kind: GuidedTutorSectionKind;
  surface: TutorSurface;
};

const hasUsableRect = (rect: DOMRect | null | undefined): rect is DOMRect =>
  Boolean(rect && rect.width > 0 && rect.height > 0);

const createRect = (left: number, top: number, width: number, height: number): DOMRect => {
  if (typeof DOMRect === 'function') {
    return new DOMRect(left, top, width, height);
  }

  return {
    x: left,
    y: top,
    width,
    height,
    left,
    top,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({
      x: left,
      y: top,
      width,
      height,
      left,
      top,
      right: left + width,
      bottom: top + height,
    }),
  } as DOMRect;
};

const getRectOverlapArea = (left: DOMRect, right: DOMRect): number => {
  const overlapWidth = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  const overlapHeight = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return overlapWidth * overlapHeight;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const clampAvatarPoint = (
  point: TutorPoint,
  viewport: {
    width: number;
    height: number;
  }
): TutorPoint => ({
  x: clamp(point.x, EDGE_GAP, viewport.width - EDGE_GAP - AVATAR_SIZE),
  y: clamp(point.y, EDGE_GAP, viewport.height - EDGE_GAP - AVATAR_SIZE),
});

const rectContainsPoint = (rect: DOMRect | null | undefined, point: TutorPoint): boolean => {
  if (!rect) {
    return false;
  }

  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  );
};

const getAvatarRect = (point: TutorPoint): DOMRect => createRect(point.x, point.y, AVATAR_SIZE, AVATAR_SIZE);

const getDraggedAvatarPoint = (input: {
  dragState: TutorAvatarDragState;
  pointerPoint: TutorPoint;
  viewport: {
    width: number;
    height: number;
  };
}): TutorPoint =>
  clampAvatarPoint(
    {
      x: input.dragState.origin.x + (input.pointerPoint.x - input.dragState.startX),
      y: input.dragState.origin.y + (input.pointerPoint.y - input.dragState.startY),
    },
    input.viewport
  );

const selectTutorSectionDropAnchor = (input: {
  anchors: KangurTutorAnchorRegistration[];
  avatarPoint?: TutorPoint | null;
  point: TutorPoint;
}): SectionAnchor | null => {
  const avatarRect = input.avatarPoint ? getAvatarRect(input.avatarPoint) : null;
  const candidates = input.anchors
    .filter(isSectionExplainableTutorAnchor)
    .map((anchor) => ({
      anchor,
      rect: anchor.getRect(),
    }))
    .filter(
      (
        entry
      ): entry is {
        anchor: SectionAnchor;
        rect: DOMRect;
      } => hasUsableRect(entry.rect)
    )
    .map((entry) => ({
      ...entry,
      expandedRect: getExpandedRect(
        entry.rect,
        SECTION_DROP_TARGET_PADDING_X,
        SECTION_DROP_TARGET_PADDING_Y
      ),
    }))
    .filter(
      (
        entry
      ): entry is {
        anchor: SectionAnchor;
        expandedRect: DOMRect;
        rect: DOMRect;
      } => hasUsableRect(entry.expandedRect)
    )
    .map((entry) => ({
      ...entry,
      overlapArea: avatarRect ? getRectOverlapArea(entry.expandedRect, avatarRect) : 0,
    }))
    .filter((entry) => entry.overlapArea > 0 || rectContainsPoint(entry.expandedRect, input.point))
    .sort((left, right) => {
      if (right.anchor.priority !== left.anchor.priority) {
        return right.anchor.priority - left.anchor.priority;
      }

      if (right.overlapArea !== left.overlapArea) {
        return right.overlapArea - left.overlapArea;
      }

      return left.rect.width * left.rect.height - right.rect.width * right.rect.height;
    });

  return candidates[0]?.anchor ?? null;
};

const getSectionAnchorById = (
  anchors: KangurTutorAnchorRegistration[],
  anchorId: string
): SectionAnchor | null =>
  anchors.find(
    (anchor): anchor is SectionAnchor =>
      anchor.id === anchorId && isSectionExplainableTutorAnchor(anchor)
  ) ?? null;

const selectTutorSectionDropAnchorFromDom = (input: {
  anchors: KangurTutorAnchorRegistration[];
  point: TutorPoint;
}): SectionAnchor | null => {
  if (typeof document === 'undefined' || typeof document.elementsFromPoint !== 'function') {
    return null;
  }

  const elements = document.elementsFromPoint(input.point.x, input.point.y);
  for (const element of elements) {
    const anchorElement = element.closest<HTMLElement>('[data-kangur-tutor-anchor-id]');
    const anchorId = anchorElement?.dataset['kangurTutorAnchorId'];
    if (!anchorId) {
      continue;
    }

    const anchor = getSectionAnchorById(input.anchors, anchorId);
    if (!anchor || !hasUsableRect(anchor.getRect())) {
      continue;
    }

    return anchor;
  }

  return null;
};

const resolveTutorSectionDropAnchor = (input: {
  anchors: KangurTutorAnchorRegistration[];
  avatarPoint?: TutorPoint | null;
  point: TutorPoint;
}): SectionAnchor | null =>
  selectTutorSectionDropAnchorFromDom(input) ?? selectTutorSectionDropAnchor(input);

export function useKangurAiTutorAvatarDrag(input: {
  avatarDragStateRef: MutableRefObject<TutorAvatarDragState | null>;
  draggedAvatarPoint: TutorPoint | null;
  guidedTutorTarget: GuidedTutorTarget | null;
  homeOnboardingStepIndex: number | null;
  hoveredSectionAnchor: SectionAnchor | null;
  isAvatarDragging: boolean;
  isOpen: boolean;
  selectionExplainTimeoutRef: MutableRefObject<number | null>;
  selectionGuidanceRevealTimeoutRef: MutableRefObject<number | null>;
  setDraggedAvatarPoint: Dispatch<SetStateAction<TutorPoint | null>>;
  setGuidedTutorTarget: Dispatch<SetStateAction<GuidedTutorTarget | null>>;
  setHomeOnboardingStepIndex: Dispatch<SetStateAction<number | null>>;
  setHoveredSectionAnchorId: Dispatch<SetStateAction<string | null>>;
  setIsAvatarDragging: Dispatch<SetStateAction<boolean>>;
  setSelectionGuidanceCalloutVisibleText: Dispatch<SetStateAction<string | null>>;
  startGuidedSectionExplanation: (anchor: SectionAnchor) => void;
  suppressAvatarClickRef: MutableRefObject<boolean>;
  handleAvatarTap: () => void;
  tutorAnchorContext: TutorAnchorRegistry;
  viewport: { width: number; height: number };
}) {
  const {
    avatarDragStateRef,
    draggedAvatarPoint,
    guidedTutorTarget,
    homeOnboardingStepIndex,
    hoveredSectionAnchor,
    isAvatarDragging,
    isOpen,
    selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef,
    setDraggedAvatarPoint,
    setGuidedTutorTarget,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setIsAvatarDragging,
    setSelectionGuidanceCalloutVisibleText,
    startGuidedSectionExplanation,
    suppressAvatarClickRef,
    handleAvatarTap,
    tutorAnchorContext,
    viewport,
  } = input;

  const handleFloatingAvatarPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      if (event.button !== 0 || isOpen) {
        return;
      }

      const avatarRect = event.currentTarget.getBoundingClientRect();
      const origin = clampAvatarPoint(
        {
          x: avatarRect.left,
          y: avatarRect.top,
        },
        viewport
      );

      avatarDragStateRef.current = {
        moved: false,
        origin,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
      };
      setHoveredSectionAnchorId(null);
      setIsAvatarDragging(true);
      suppressAvatarClickRef.current = false;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [
      avatarDragStateRef,
      isOpen,
      setHoveredSectionAnchorId,
      setIsAvatarDragging,
      suppressAvatarClickRef,
      viewport,
    ]
  );

  const updateFloatingAvatarDrag = useCallback(
    (pointerId: number, clientX: number, clientY: number): void => {
      const dragState = avatarDragStateRef.current;
      if (dragState?.pointerId !== pointerId) {
        return;
      }

      const pointerPoint = { x: clientX, y: clientY };
      const deltaX = pointerPoint.x - dragState.startX;
      const deltaY = pointerPoint.y - dragState.startY;
      const hasMovedEnough = Math.hypot(deltaX, deltaY) >= AVATAR_DRAG_THRESHOLD;
      const nextPoint = getDraggedAvatarPoint({
        dragState,
        pointerPoint,
        viewport,
      });

      if (hasMovedEnough) {
        dragState.moved = true;
        suppressAvatarClickRef.current = true;
        if (homeOnboardingStepIndex !== null) {
          setHomeOnboardingStepIndex(null);
        }
        if (guidedTutorTarget) {
          if (selectionExplainTimeoutRef.current !== null) {
            window.clearTimeout(selectionExplainTimeoutRef.current);
            selectionExplainTimeoutRef.current = null;
          }
          if (selectionGuidanceRevealTimeoutRef.current !== null) {
            window.clearTimeout(selectionGuidanceRevealTimeoutRef.current);
            selectionGuidanceRevealTimeoutRef.current = null;
          }
          setSelectionGuidanceCalloutVisibleText(null);
          setGuidedTutorTarget(null);
        }
      }

      setDraggedAvatarPoint(nextPoint);
      if (hasMovedEnough && tutorAnchorContext) {
        const dropAnchor = resolveTutorSectionDropAnchor({
          anchors: tutorAnchorContext.anchors,
          avatarPoint: nextPoint,
          point: pointerPoint,
        });
        setHoveredSectionAnchorId(dropAnchor?.id ?? null);
      }
    },
    [
      avatarDragStateRef,
      guidedTutorTarget,
      homeOnboardingStepIndex,
      selectionExplainTimeoutRef,
      selectionGuidanceRevealTimeoutRef,
      setDraggedAvatarPoint,
      setGuidedTutorTarget,
      setHomeOnboardingStepIndex,
      setHoveredSectionAnchorId,
      setSelectionGuidanceCalloutVisibleText,
      suppressAvatarClickRef,
      tutorAnchorContext,
      viewport,
    ]
  );

  const handleFloatingAvatarPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      updateFloatingAvatarDrag(event.pointerId, event.clientX, event.clientY);
    },
    [updateFloatingAvatarDrag]
  );

  const finishFloatingAvatarDrag = useCallback(
    (pointerId: number, persistPosition?: TutorPoint | null): void => {
      const dragState = avatarDragStateRef.current;
      if (dragState?.pointerId !== pointerId) {
        return;
      }

      avatarDragStateRef.current = null;
      if (persistPosition) {
        persistTutorAvatarPosition({
          left: persistPosition.x,
          top: persistPosition.y,
        });
      } else {
        clearPersistedTutorAvatarPosition();
      }
      setDraggedAvatarPoint(null);
      setIsAvatarDragging(false);
    },
    [avatarDragStateRef, setDraggedAvatarPoint, setIsAvatarDragging]
  );

  const completeFloatingAvatarDrag = useCallback(
    (pointerId: number, clientX: number, clientY: number): void => {
      const dragState = avatarDragStateRef.current;
      const pointerPoint = { x: clientX, y: clientY };
      const releaseAvatarPoint =
        dragState?.pointerId === pointerId
          ? getDraggedAvatarPoint({
            dragState,
            pointerPoint,
            viewport,
          })
          : draggedAvatarPoint;
      const droppedSectionAnchor =
        dragState?.pointerId === pointerId && dragState.moved && tutorAnchorContext
          ? resolveTutorSectionDropAnchor({
            anchors: tutorAnchorContext.anchors,
            avatarPoint: releaseAvatarPoint,
            point: pointerPoint,
          }) ?? hoveredSectionAnchor
          : null;
      const shouldExplainDroppedSection =
        dragState?.pointerId === pointerId && dragState.moved && Boolean(droppedSectionAnchor);
      const shouldPersistAvatarPosition =
        dragState?.pointerId === pointerId && dragState.moved && !shouldExplainDroppedSection;
      const persistPosition = shouldPersistAvatarPosition ? releaseAvatarPoint : null;

      finishFloatingAvatarDrag(pointerId, persistPosition);
      setHoveredSectionAnchorId(null);
      if (shouldExplainDroppedSection && droppedSectionAnchor) {
        startGuidedSectionExplanation(droppedSectionAnchor);
      }
    },
    [
      avatarDragStateRef,
      draggedAvatarPoint,
      finishFloatingAvatarDrag,
      hoveredSectionAnchor,
      setHoveredSectionAnchorId,
      startGuidedSectionExplanation,
      tutorAnchorContext,
      viewport,
    ]
  );

  const handleFloatingAvatarPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      const dragState = avatarDragStateRef.current;
      const shouldTreatAsTap =
        dragState?.pointerId === event.pointerId && !dragState.moved && !isOpen;

      completeFloatingAvatarDrag(event.pointerId, event.clientX, event.clientY);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (shouldTreatAsTap) {
        handleAvatarTap();
        suppressAvatarClickRef.current = true;
      }
    },
    [avatarDragStateRef, completeFloatingAvatarDrag, handleAvatarTap, isOpen, suppressAvatarClickRef]
  );

  const handleFloatingAvatarMouseUp = useCallback(
    (_event: ReactMouseEvent<HTMLButtonElement>): void => {
      if (isOpen || suppressAvatarClickRef.current) {
        return;
      }

      handleAvatarTap();
      suppressAvatarClickRef.current = true;
    },
    [handleAvatarTap, isOpen, suppressAvatarClickRef]
  );

  const handleFloatingAvatarPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      finishFloatingAvatarDrag(event.pointerId);
      setHoveredSectionAnchorId(null);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [finishFloatingAvatarDrag, setHoveredSectionAnchorId]
  );

  useEffect(() => {
    if (!isAvatarDragging || typeof window === 'undefined') {
      return;
    }

    const handleWindowPointerMove = (event: PointerEvent): void => {
      updateFloatingAvatarDrag(event.pointerId, event.clientX, event.clientY);
    };

    const handleWindowPointerUp = (event: PointerEvent): void => {
      completeFloatingAvatarDrag(event.pointerId, event.clientX, event.clientY);
    };

    const handleWindowPointerCancel = (event: PointerEvent): void => {
      finishFloatingAvatarDrag(event.pointerId);
      setHoveredSectionAnchorId(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove, true);
    window.addEventListener('pointerup', handleWindowPointerUp, true);
    window.addEventListener('pointercancel', handleWindowPointerCancel, true);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove, true);
      window.removeEventListener('pointerup', handleWindowPointerUp, true);
      window.removeEventListener('pointercancel', handleWindowPointerCancel, true);
    };
  }, [
    completeFloatingAvatarDrag,
    finishFloatingAvatarDrag,
    isAvatarDragging,
    setHoveredSectionAnchorId,
    updateFloatingAvatarDrag,
  ]);

  return {
    handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove,
    handleFloatingAvatarMouseUp,
    handleFloatingAvatarPointerUp,
  };
}
