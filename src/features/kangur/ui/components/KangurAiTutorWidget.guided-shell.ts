import { useEffect, useMemo, useRef, type CSSProperties } from 'react';

import {
  formatGuidedArrowheadTransition,
  getFloatingTutorArrowheadGeometry,
  GUIDED_CALLOUT_HEIGHT,
  getGuidedCalloutClusterLayout,
  getGuidedCalloutLayout,
  getGuidedSelectionCalloutHeight,
  getMotionPositionPoint,
  getSelectionGlowStyle,
  getSelectionSpotlightStyle,
  resolveContinuousRotationDegrees,
} from './KangurAiTutorGuidedLayout';
import { getExpandedRect } from './KangurAiTutorWidget.helpers';
import { AVATAR_SIZE, EDGE_GAP, type TutorMotionPosition, type TutorMotionProfile } from './KangurAiTutorWidget.shared';

type GuidedMode = 'home_onboarding' | 'selection' | 'section' | 'auth' | null;
type GuidedPlacement = 'top' | 'bottom' | 'left' | 'right';
const GUIDED_CALLOUT_FOCUS_PROTECTED_AREA_RATIO_LIMIT = 18;
const GUIDED_SELECTION_CALLOUT_EDGE_BUFFER = EDGE_GAP * 2;

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
  selectionGlowStyles: CSSProperties[];
  selectionContextSpotlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  selectionSpotlightStyle: ReturnType<typeof getSelectionSpotlightStyle> | null;
  shouldRenderGuidedCallout: boolean;
};

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
  guidedSelectionGlowRects: DOMRect[];
  guidedSelectionSpotlightRect: DOMRect | null;
  hoveredSectionProtectedRect: DOMRect | null;
  isAnonymousVisitor: boolean;
  isAskModalMode: boolean;
  isAvatarDragging: boolean;
  isContextualPanelAnchor: boolean;
  isOpen: boolean;
  panelShellMode: 'default' | 'minimal';
  suppressPanelSurface: boolean;
  selectionGlowSupported: boolean;
  isTutorHidden: boolean;
  motionProfile: TutorMotionProfile;
  prefersReducedMotion: boolean;
  showSelectionKnowledgeContext: boolean;
  showSelectionResolvedAnswer: boolean;
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
    guidedSelectionGlowRects,
    guidedSelectionSpotlightRect,
    hoveredSectionProtectedRect,
    isAnonymousVisitor,
    isAskModalMode,
    isAvatarDragging,
    isContextualPanelAnchor,
    isOpen,
    panelShellMode,
    suppressPanelSurface,
    isTutorHidden,
    motionProfile,
    prefersReducedMotion,
    showSelectionKnowledgeContext,
    showSelectionResolvedAnswer,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
    viewport,
  } = input;
  const shouldUseSelectionGuidanceLayout =
    Boolean(guidedFocusRect) && (guidedMode === 'selection' || showSelectionGuidanceCallout);
  const isMobileHomeOnboardingSheet =
    guidedMode === 'home_onboarding' && viewport.width < motionProfile.sheetBreakpoint;

  const guidedSelectionCalloutProtectedRect =
    shouldUseSelectionGuidanceLayout &&
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
  const guidedSelectionFallbackProtectedPaddingX = guidedFocusRect
    ? clamp(Math.round(guidedFocusRect.width * 0.12), 10, 24)
    : 16;
  const guidedSelectionFallbackProtectedPaddingY = guidedFocusRect
    ? clamp(Math.round(guidedFocusRect.height * 0.5), 8, 16)
    : 12;
  const guidedSelectionFallbackProtectedRect =
    shouldUseSelectionGuidanceLayout && guidedFocusRect
      ? getExpandedRect(
        guidedFocusRect,
        guidedSelectionFallbackProtectedPaddingX,
        guidedSelectionFallbackProtectedPaddingY
      )
      : null;
  const guidedSelectionProtectedRects =
    shouldUseSelectionGuidanceLayout && guidedFocusRect
      ? [
        guidedFocusRect,
        guidedSelectionCalloutProtectedRect,
        guidedSelectionFallbackProtectedRect,
      ].filter(
        (rect): rect is DOMRect => Boolean(rect)
      )
      : [];
  const guidedCalloutAttachmentHeight =
    shouldUseSelectionGuidanceLayout
      ? getGuidedSelectionCalloutHeight(viewport, {
          hasKnowledgeContext: showSelectionKnowledgeContext,
          hasResolvedAnswer: showSelectionResolvedAnswer,
        })
      : GUIDED_CALLOUT_HEIGHT;
  const guidedCalloutClusterLayout = guidedFocusRect
    ? getGuidedCalloutClusterLayout(
      guidedFocusRect,
      viewport,
      guidedSelectionProtectedRects,
      {
        calloutHeight: guidedCalloutAttachmentHeight,
        hasSelectionPreview: shouldUseSelectionGuidanceLayout,
      }
    )
    : null;
  const mobileHomeOnboardingCalloutWidth = clamp(
    viewport.width - EDGE_GAP * 2,
    Math.min(280, viewport.width - EDGE_GAP * 2),
    motionProfile.mobileBubbleWidth
  );
  const mobileHomeOnboardingCalloutBottom = viewport.height < 640 ? 8 : 16;
  const mobileHomeOnboardingCalloutStyle: CSSProperties | null =
    guidedFocusRect && isMobileHomeOnboardingSheet
      ? ({
        position: 'fixed',
        left: Math.max(EDGE_GAP, Math.round((viewport.width - mobileHomeOnboardingCalloutWidth) / 2)),
        bottom: mobileHomeOnboardingCalloutBottom,
        width: mobileHomeOnboardingCalloutWidth,
      } satisfies CSSProperties)
      : null;
  const guidedCalloutLayout =
    guidedCalloutClusterLayout
      ? {
        entryDirection: guidedCalloutClusterLayout.entryDirection,
        placement: guidedCalloutClusterLayout.placement,
        style: mobileHomeOnboardingCalloutStyle ?? guidedCalloutClusterLayout.style,
      }
      : mobileHomeOnboardingCalloutStyle
        ? {
          entryDirection: 'right' as const,
          placement: 'bottom' as const,
          style: mobileHomeOnboardingCalloutStyle,
        }
        : null;
  const guidedCalloutStyle = guidedCalloutLayout?.style ?? null;
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
  const shouldSuppressSelectionGuidanceCallout =
    shouldUseSelectionGuidanceLayout &&
    guidedFocusRect &&
    (guidedFocusRect.top <= GUIDED_SELECTION_CALLOUT_EDGE_BUFFER ||
      guidedFocusRect.right >= viewport.width - GUIDED_SELECTION_CALLOUT_EDGE_BUFFER);
  const shouldDeferSelectionGuidanceCallout =
    guidedMode === 'selection' && !showSelectionGuidanceCallout;
  const shouldRenderGuidedCallout =
    !isTutorHidden &&
    (!isOpen || panelShellMode === 'minimal' || suppressPanelSurface) &&
    (guidedMode !== null || showSelectionGuidanceCallout || showSectionGuidanceCallout) &&
    Boolean(guidedFocusRect && guidedCalloutStyle) &&
    (guidedMode === 'home_onboarding' ||
      guidedMode === 'auth' ||
      guidedMode === 'selection' ||
      guidedMode === 'section' ||
      showSectionGuidanceCallout ||
      showSelectionGuidanceCallout ||
      isAnonymousVisitor) &&
    !(
      shouldSuppressSelectionGuidanceCallout &&
      (guidedMode === 'selection' || showSelectionGuidanceCallout)
    ) &&
    !shouldDeferSelectionGuidanceCallout;
  const guidedCalloutTransitionDuration = Math.max(
    0.34,
    motionProfile.guidedAvatarTransition.duration * 0.78
  );
  const selectionGlowStyles: CSSProperties[] =
    guidedMode === 'selection'
      ? guidedSelectionGlowRects.map((rect) => getSelectionGlowStyle(rect))
      : [];
  const selectionSpotlightStyle =
    guidedMode === 'selection' &&
    guidedSelectionSpotlightRect &&
    selectionGlowStyles.length === 0
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
    selectionGlowStyles,
    selectionContextSpotlightStyle,
    selectionSpotlightStyle,
    shouldRenderGuidedCallout,
  };
}
