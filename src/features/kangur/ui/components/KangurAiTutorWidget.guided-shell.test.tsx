/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@/__tests__/test-utils';
import { describe, expect, it } from 'vitest';

import { useKangurAiTutorGuidedShellState } from './KangurAiTutorWidget.guided-shell';
import { getGuidedSelectionCalloutHeight } from './KangurAiTutorGuidedLayout';
import { AVATAR_SIZE } from './KangurAiTutorWidget.shared';

import type { TutorMotionProfile } from './KangurAiTutorWidget.shared';

const motionProfile: TutorMotionProfile = {
  kind: 'default',
  sheetBreakpoint: 640,
  avatarTransition: { type: 'spring', stiffness: 320, damping: 28 },
  guidedAvatarTransition: { type: 'tween', duration: 0.58, ease: [0.22, 1, 0.36, 1] },
  bubbleTransition: { type: 'spring', stiffness: 300, damping: 28 },
  hoverScale: 1.06,
  tapScale: 0.94,
  motionCompletedDelayMs: 360,
  desktopBubbleWidth: 392,
  mobileBubbleWidth: 320,
};

const buildInput = (
  overrides: Partial<Parameters<typeof useKangurAiTutorGuidedShellState>[0]> = {}
): Parameters<typeof useKangurAiTutorGuidedShellState>[0] => ({
  activeSelectionFocusRect: null,
  activeSectionProtectedRect: null,
  activeSelectionProtectedRect: new DOMRect(80, 580, 520, 240),
  guidedFocusRect: new DOMRect(120, 620, 140, 26),
  guidedMode: 'selection',
  guidedSelectionGlowRects: [],
  guidedSelectionSpotlightRect: new DOMRect(120, 620, 140, 26),
  hoveredSectionProtectedRect: null,
  isAnonymousVisitor: false,
  isAskModalMode: false,
  isAvatarDragging: false,
  isContextualPanelAnchor: false,
  isOpen: false,
  selectionGlowSupported: true,
  isTutorHidden: false,
  motionProfile,
  prefersReducedMotion: false,
  showSelectionKnowledgeContext: false,
  showSelectionResolvedAnswer: false,
  showSectionGuidanceCallout: false,
  showSelectionGuidanceCallout: false,
  viewport: { width: 1280, height: 720 },
  ...overrides,
});

const getRectOverlapArea = (left: DOMRect, right: DOMRect): number => {
  const overlapLeft = Math.max(left.left, right.left);
  const overlapTop = Math.max(left.top, right.top);
  const overlapRight = Math.min(left.right, right.right);
  const overlapBottom = Math.min(left.bottom, right.bottom);
  const overlapWidth = Math.max(0, overlapRight - overlapLeft);
  const overlapHeight = Math.max(0, overlapBottom - overlapTop);
  return overlapWidth * overlapHeight;
};

const getRectSeparationDistance = (left: DOMRect, right: DOMRect): number => {
  const horizontalGap = Math.max(0, left.left - right.right, right.left - left.right);
  const verticalGap = Math.max(0, left.top - right.bottom, right.top - left.bottom);
  return Math.hypot(horizontalGap, verticalGap);
};

describe('KangurAiTutorWidget.guided-shell', () => {
  it('uses a bottom-sheet home onboarding callout on narrow mobile viewports', () => {
    const { result } = renderHook(() =>
      useKangurAiTutorGuidedShellState(
        buildInput({
          guidedMode: 'home_onboarding',
          guidedSelectionGlowRects: [],
          guidedSelectionSpotlightRect: null,
          viewport: { width: 320, height: 568 },
        })
      )
    );

    expect(result.current.guidedCalloutStyle).toMatchObject({
      position: 'fixed',
      bottom: 8,
      width: 288,
    });
    expect(result.current.guidedCalloutStyle).not.toHaveProperty('top');
  });

  it('keeps the guided selection avatar cluster stable before and after the preview reveal', () => {
    const { result, rerender } = renderHook(
      (input: Parameters<typeof useKangurAiTutorGuidedShellState>[0]) =>
        useKangurAiTutorGuidedShellState(input),
      {
        initialProps: buildInput(),
      }
    );
    const initialAvatarStyle = result.current.guidedAvatarStyle;
    const initialCalloutStyle = result.current.guidedCalloutStyle;
    const initialAvatarPlacement = result.current.guidedAvatarLayout?.placement;

    rerender(buildInput({ showSelectionGuidanceCallout: true }));

    expect(result.current.guidedAvatarStyle).toEqual(initialAvatarStyle);
    expect(result.current.guidedCalloutStyle).toEqual(initialCalloutStyle);
    expect(result.current.guidedAvatarLayout?.placement).toBe(initialAvatarPlacement);
  });

  it('keeps the guided selection spotlight overlay active even when text emphasis is DOM-owned', () => {
    const { result } = renderHook(() =>
      useKangurAiTutorGuidedShellState(buildInput({ selectionGlowSupported: true }))
    );

    expect(result.current.selectionGlowStyles).toHaveLength(0);
    expect(result.current.selectionSpotlightStyle).toMatchObject({
      width: 160,
      height: 46,
    });
  });

  it('keeps the guided selection avatar cluster visually close to a mid-page highlight', () => {
    const guidedFocusRect = new DOMRect(420, 360, 180, 28);
    const { result } = renderHook(() =>
      useKangurAiTutorGuidedShellState(
        buildInput({
          activeSelectionProtectedRect: new DOMRect(360, 320, 300, 120),
          guidedFocusRect,
          guidedSelectionSpotlightRect: guidedFocusRect,
          showSelectionGuidanceCallout: true,
          viewport: { width: 1440, height: 900 },
        })
      )
    );

    expect(result.current.guidedAvatarStyle).not.toBeNull();
    expect(result.current.guidedCalloutStyle).not.toBeNull();

    const avatarStyle = result.current.guidedAvatarStyle as { left: number; top: number };
    const avatarRect = new DOMRect(avatarStyle.left, avatarStyle.top, AVATAR_SIZE, AVATAR_SIZE);
    const calloutStyle = result.current.guidedCalloutStyle as {
      left: number;
      top: number;
      width: number;
    };
    const calloutRect = new DOMRect(calloutStyle.left, calloutStyle.top, calloutStyle.width, 260);

    expect(getRectSeparationDistance(avatarRect, guidedFocusRect)).toBeLessThanOrEqual(96);
    expect(getRectSeparationDistance(calloutRect, guidedFocusRect)).toBeLessThanOrEqual(48);
  });

  it('keeps a tall knowledge-backed selection callout clear of the highlighted text', () => {
    const viewport = { width: 1280, height: 720 };
    const guidedFocusRect = new DOMRect(620, 520, 220, 48);
    const { result } = renderHook(() =>
      useKangurAiTutorGuidedShellState(
        buildInput({
          activeSelectionProtectedRect: new DOMRect(600, 500, 280, 112),
          guidedFocusRect,
          guidedSelectionSpotlightRect: guidedFocusRect,
          showSelectionGuidanceCallout: true,
          showSelectionKnowledgeContext: true,
          showSelectionResolvedAnswer: true,
          viewport,
        })
      )
    );

    const calloutStyle = result.current.guidedCalloutStyle as {
      left: number;
      top: number;
      width: number;
    };
    const estimatedHeight = getGuidedSelectionCalloutHeight(viewport, {
      hasKnowledgeContext: true,
      hasResolvedAnswer: true,
    });
    const calloutRect = new DOMRect(
      calloutStyle.left,
      calloutStyle.top,
      calloutStyle.width,
      estimatedHeight
    );

    expect(getRectOverlapArea(calloutRect, guidedFocusRect)).toBe(0);
  });
});
