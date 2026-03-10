'use client';

import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react';

import type { KangurTutorAnchorRegistration } from '@/features/kangur/ui/context/kangur-tutor-types';

import { getMotionPositionPoint } from './KangurAiTutorGuidedLayout';
import { getExpandedRect, isSectionExplainableTutorAnchor } from './KangurAiTutorWidget.helpers';
import {
  AVATAR_SIZE,
  EDGE_GAP,
  type TutorMotionPosition,
} from './KangurAiTutorWidget.shared';
import { persistTutorAvatarPosition } from './KangurAiTutorWidget.storage';

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

const selectTutorSectionDropAnchor = (input: {
  anchors: KangurTutorAnchorRegistration[];
  point: TutorPoint;
}): SectionAnchor | null => {
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
      } => Boolean(entry.rect && entry.rect.width >= 0 && entry.rect.height >= 0)
    )
    .filter((entry) =>
      rectContainsPoint(
        getExpandedRect(entry.rect, SECTION_DROP_TARGET_PADDING_X, SECTION_DROP_TARGET_PADDING_Y),
        input.point
      )
    )
    .sort((left, right) => {
      if (right.anchor.priority !== left.anchor.priority) {
        return right.anchor.priority - left.anchor.priority;
      }

      return left.rect.width * left.rect.height - right.rect.width * right.rect.height;
    });

  return candidates[0]?.anchor ?? null;
};

export function useKangurAiTutorAvatarDrag(input: {
  avatarDragStateRef: MutableRefObject<TutorAvatarDragState | null>;
  avatarStyle: TutorMotionPosition;
  draggedAvatarPoint: TutorPoint | null;
  guidedTutorTarget: GuidedTutorTarget | null;
  homeOnboardingStepIndex: number | null;
  hoveredSectionAnchor: SectionAnchor | null;
  isOpen: boolean;
  selectionExplainTimeoutRef: MutableRefObject<number | null>;
  setDraggedAvatarPoint: Dispatch<SetStateAction<TutorPoint | null>>;
  setGuidedTutorTarget: Dispatch<SetStateAction<GuidedTutorTarget | null>>;
  setHomeOnboardingStepIndex: Dispatch<SetStateAction<number | null>>;
  setHoveredSectionAnchorId: Dispatch<SetStateAction<string | null>>;
  setIsAvatarDragging: Dispatch<SetStateAction<boolean>>;
  startGuidedSectionExplanation: (anchor: SectionAnchor) => void;
  suppressAvatarClickRef: MutableRefObject<boolean>;
  tutorAnchorContext: TutorAnchorRegistry;
  viewport: { width: number; height: number };
}) {
  const {
    avatarDragStateRef,
    avatarStyle,
    draggedAvatarPoint,
    guidedTutorTarget,
    homeOnboardingStepIndex,
    hoveredSectionAnchor,
    isOpen,
    selectionExplainTimeoutRef,
    setDraggedAvatarPoint,
    setGuidedTutorTarget,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setIsAvatarDragging,
    startGuidedSectionExplanation,
    suppressAvatarClickRef,
    tutorAnchorContext,
    viewport,
  } = input;

  const handleFloatingAvatarPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      if (event.button !== 0 || isOpen) {
        return;
      }

      const origin = getMotionPositionPoint(avatarStyle);
      if (!origin) {
        return;
      }

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
      avatarStyle,
      isOpen,
      setHoveredSectionAnchorId,
      setIsAvatarDragging,
      suppressAvatarClickRef,
    ]
  );

  const handleFloatingAvatarPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      const dragState = avatarDragStateRef.current;
      if (dragState?.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      const hasMovedEnough = Math.hypot(deltaX, deltaY) >= AVATAR_DRAG_THRESHOLD;
      const nextPoint = clampAvatarPoint(
        {
          x: dragState.origin.x + deltaX,
          y: dragState.origin.y + deltaY,
        },
        viewport
      );

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
          setGuidedTutorTarget(null);
        }
      }

      setDraggedAvatarPoint(nextPoint);
      if (hasMovedEnough && tutorAnchorContext) {
        const dropAnchor = selectTutorSectionDropAnchor({
          anchors: tutorAnchorContext.anchors,
          point: {
            x: event.clientX,
            y: event.clientY,
          },
        });
        setHoveredSectionAnchorId(dropAnchor?.id ?? null);
      }
    },
    [
      avatarDragStateRef,
      guidedTutorTarget,
      homeOnboardingStepIndex,
      selectionExplainTimeoutRef,
      setDraggedAvatarPoint,
      setGuidedTutorTarget,
      setHomeOnboardingStepIndex,
      setHoveredSectionAnchorId,
      suppressAvatarClickRef,
      tutorAnchorContext,
      viewport,
    ]
  );

  const finishFloatingAvatarDrag = useCallback(
    (pointerId: number, options?: { persistPosition?: boolean }): void => {
      const dragState = avatarDragStateRef.current;
      if (dragState?.pointerId !== pointerId) {
        return;
      }

      if (dragState.moved && draggedAvatarPoint && options?.persistPosition !== false) {
        persistTutorAvatarPosition({
          left: draggedAvatarPoint.x,
          top: draggedAvatarPoint.y,
        });
      }

      avatarDragStateRef.current = null;
      setIsAvatarDragging(false);
    },
    [avatarDragStateRef, draggedAvatarPoint, setIsAvatarDragging]
  );

  const handleFloatingAvatarPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      const shouldExplainDroppedSection =
        avatarDragStateRef.current?.pointerId === event.pointerId &&
        avatarDragStateRef.current?.moved &&
        Boolean(hoveredSectionAnchor);
      const droppedSectionAnchor = hoveredSectionAnchor;

      finishFloatingAvatarDrag(event.pointerId, {
        persistPosition: !shouldExplainDroppedSection,
      });
      setHoveredSectionAnchorId(null);
      if (shouldExplainDroppedSection && droppedSectionAnchor) {
        startGuidedSectionExplanation(droppedSectionAnchor);
      }
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [
      avatarDragStateRef,
      finishFloatingAvatarDrag,
      hoveredSectionAnchor,
      setHoveredSectionAnchorId,
      startGuidedSectionExplanation,
    ]
  );

  const handleFloatingAvatarPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>): void => {
      finishFloatingAvatarDrag(event.pointerId);
      setHoveredSectionAnchorId(null);
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    },
    [finishFloatingAvatarDrag, setHoveredSectionAnchorId]
  );

  return {
    handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove,
    handleFloatingAvatarPointerUp,
  };
}
