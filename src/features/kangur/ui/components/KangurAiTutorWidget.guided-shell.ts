'use client';

import { useEffect, useMemo, useRef } from 'react';

import {
  formatGuidedArrowheadTransition,
  getFloatingTutorArrowheadGeometry,
  GUIDED_CALLOUT_HEIGHT,
  getGuidedCalloutClusterLayout,
  getGuidedCalloutLayout,
  getMotionPositionPoint,
  getSelectionSpotlightStyle,
  resolveContinuousRotationDegrees,
} from './KangurAiTutorGuidedLayout';
import { AVATAR_SIZE, EDGE_GAP, type TutorMotionPosition, type TutorMotionProfile } from './KangurAiTutorWidget.shared';

type GuidedMode = 'home_onboarding' | 'selection' | 'section' | 'auth' | null;
type GuidedPlacement = 'top' | 'bottom' | 'left' | 'right';
type GuidedShellState = {
  guidedArrowheadTransition: string | undefined;
  guidedAvatarArrowhead: ReturnType<typeof getFloatingTutorArrowheadGeometry>;
  guidedAvatarArrowheadDisplayAngle: number | null;
  guidedAvatarArrowheadDisplayAngleLabel: string | undefined;
  guidedAvatarLayout: { style: TutorMotionPosition; placement: GuidedPlacement } | null;
  guidedAvatarStyle: TutorMotionPosition | null;
  guidedCalloutLayout: ReturnType<typeof getGuidedCalloutLayout> | null;
  guidedCalloutStyle: ReturnType<typeof getGuidedCalloutLayout>['style'] | null;
  guidedCalloutTransitionDuration: number;
  isGuidedTutorMode: boolean;
  sectionContextSpotlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  sectionDropHighlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  selectionContextSpotlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  selectionSpotlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  shouldRenderGuidedCallout: boolean;
};

const GUIDED_CALLOUT_FOCUS_PROTECTED_AREA_RATIO_LIMIT = 6;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getAnchorAvatarStyle = (
  rect: DOMRect,
  viewport: { width: number; height: number }
): TutorMotionPosition => {
  const left = clamp(
    rect.left + rect.width / 2 - AVATAR_SIZE / 2,
    EDGE_GAP,
    viewport.width - EDGE_GAP - AVATAR_SIZE
  );
  const preferredTop = rect.top - AVATAR_SIZE - 12;
  const fallbackTop = rect.bottom + 12;
  const top =
    preferredTop >= EDGE_GAP
      ? preferredTop
      : clamp(fallbackTop, EDGE_GAP, viewport.height - EDGE_GAP - AVATAR_SIZE);

  return {
    left,
    top,
  };
};

export function useKangurAiTutorGuidedShellState(input: {
  activeSelectionFocusRect: DOMRect | null;
  activeSectionProtectedRect: DOMRect | null;
  activeSelectionProtectedRect: DOMRect | null;
  guidedFocusRect: DOMRect | null;
  guidedMode: GuidedMode;
  guidedSelectionSpotlightRect: DOMRect | null;
  hoveredSectionProtectedRect: DOMRect | null;
  isAnonymousVisitor: boolean;
  isAskModalMode: boolean;
  isAvatarDragging: boolean;
  isContextualPanelAnchor: boolean;
  isOpen: boolean;
  isTutorHidden: boolean;
  motionProfile: TutorMotionProfile;
  prefersReducedMotion: boolean;
  showSectionGuidanceCallout: boolean;
  showSelectionGuidanceCallout: boolean;
  viewport: { width: number; height: number };
}): GuidedShellState {
  const {
    activeSelectionFocusRect,
    activeSectionProtectedRect,
    activeSelectionProtectedRect,
    guidedFocusRect,
    guidedMode,
    guidedSelectionSpotlightRect,
    hoveredSectionProtectedRect,
    isAnonymousVisitor,
    isAskModalMode,
    isAvatarDragging,
    isContextualPanelAnchor,
    isOpen,
    isTutorHidden,
    motionProfile,
    prefersReducedMotion,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
    viewport,
  } = input;

  const guidedSelectionCalloutProtectedRect =
    showSelectionGuidanceCallout &&
    guidedFocusRect &&
    activeSelectionProtectedRect &&
    activeSelectionProtectedRect.width > 0 &&
    activeSelectionProtectedRect.height > 0
      ? (() => {
        const focusArea = Math.max(guidedFocusRect.width * guidedFocusRect.height, 1);
        const protectedArea =
          activeSelectionProtectedRect.width * activeSelectionProtectedRect.height;
        return protectedArea / focusArea <= GUIDED_CALLOUT_FOCUS_PROTECTED_AREA_RATIO_LIMIT
          ? activeSelectionProtectedRect
          : null;
      })()
      : null;
  const guidedCalloutAttachmentHeight = GUIDED_CALLOUT_HEIGHT;
  const guidedCalloutClusterLayout = guidedFocusRect
    ? getGuidedCalloutClusterLayout(
      guidedFocusRect,
      viewport,
      [guidedSelectionCalloutProtectedRect].filter((rect): rect is DOMRect => Boolean(rect)),
      {
        calloutHeight: guidedCalloutAttachmentHeight,
      }
    )
    : null;
  const guidedCalloutLayout = guidedCalloutClusterLayout
    ? {
      entryDirection: guidedCalloutClusterLayout.entryDirection,
      placement: guidedCalloutClusterLayout.placement,
      style: guidedCalloutClusterLayout.style,
    }
    : null;
  const guidedCalloutStyle = guidedCalloutClusterLayout?.style ?? null;
  const guidedAvatarLayout =
    guidedCalloutClusterLayout
      ? {
        placement: guidedCalloutClusterLayout.avatarPlacement,
        style: guidedCalloutClusterLayout.avatarStyle,
      }
      : guidedFocusRect
        ? { placement: 'top' as const, style: getAnchorAvatarStyle(guidedFocusRect, viewport) }
        : null;
  const guidedAvatarStyle = guidedAvatarLayout?.style ?? null;
  const guidedAvatarPoint = getMotionPositionPoint(guidedAvatarStyle);
  const guidedAvatarArrowhead = getFloatingTutorArrowheadGeometry({
    avatarPoint: guidedAvatarPoint,
    focusRect: guidedFocusRect,
  });
  const guidedArrowheadRenderAngleRef = useRef<number | null>(null);
  const guidedAvatarArrowheadRenderAngle = useMemo(() => {
    if (!guidedAvatarArrowhead) {
      return null;
    }

    return resolveContinuousRotationDegrees(
      guidedArrowheadRenderAngleRef.current,
      guidedAvatarArrowhead.angle
    );
  }, [guidedAvatarArrowhead]);

  useEffect(() => {
    guidedArrowheadRenderAngleRef.current = guidedAvatarArrowheadRenderAngle;
  }, [guidedAvatarArrowheadRenderAngle]);

  const guidedArrowheadTransition = useMemo(
    () => formatGuidedArrowheadTransition(motionProfile, prefersReducedMotion),
    [motionProfile, prefersReducedMotion]
  );
  const guidedAvatarArrowheadDisplayAngle =
    guidedAvatarArrowheadRenderAngle ?? guidedAvatarArrowhead?.angle ?? null;
  const guidedAvatarArrowheadDisplayAngleLabel =
    guidedAvatarArrowheadDisplayAngle !== null
      ? guidedAvatarArrowheadDisplayAngle.toFixed(2)
      : undefined;
  const shouldRenderGuidedCallout =
    !isTutorHidden &&
    (guidedMode !== null || showSelectionGuidanceCallout || showSectionGuidanceCallout) &&
    Boolean(guidedFocusRect && guidedCalloutStyle) &&
    (guidedMode === 'home_onboarding' ||
      guidedMode === 'auth' ||
      showSectionGuidanceCallout ||
      showSelectionGuidanceCallout ||
      isAnonymousVisitor);
  const guidedCalloutTransitionDuration = Math.max(
    0.34,
    motionProfile.guidedAvatarTransition.duration * 0.78
  );
  const selectionSpotlightStyle =
    guidedMode === 'selection' && guidedSelectionSpotlightRect
      ? getSelectionSpotlightStyle(guidedSelectionSpotlightRect)
      : null;
  const isGuidedTutorMode = !isTutorHidden && guidedMode !== null;
  const selectionContextSpotlightStyle =
    !isGuidedTutorMode &&
    !isAskModalMode &&
    isOpen &&
    isContextualPanelAnchor &&
    activeSelectionFocusRect
      ? getSelectionSpotlightStyle(activeSelectionFocusRect)
      : null;
  const sectionContextSpotlightStyle =
    !isGuidedTutorMode &&
    !isAskModalMode &&
    isOpen &&
    isContextualPanelAnchor &&
    activeSectionProtectedRect
      ? getSelectionSpotlightStyle(activeSectionProtectedRect)
      : null;
  const sectionDropHighlightStyle =
    !isOpen && isAvatarDragging && hoveredSectionProtectedRect
      ? getSelectionSpotlightStyle(hoveredSectionProtectedRect)
      : null;

  return {
    guidedArrowheadTransition,
    guidedAvatarArrowhead,
    guidedAvatarArrowheadDisplayAngle,
    guidedAvatarArrowheadDisplayAngleLabel,
    guidedAvatarLayout,
    guidedAvatarStyle,
    guidedCalloutLayout,
    guidedCalloutStyle,
    guidedCalloutTransitionDuration,
    isGuidedTutorMode,
    sectionContextSpotlightStyle,
    sectionDropHighlightStyle,
    selectionContextSpotlightStyle,
    selectionSpotlightStyle,
    shouldRenderGuidedCallout,
  };
}
