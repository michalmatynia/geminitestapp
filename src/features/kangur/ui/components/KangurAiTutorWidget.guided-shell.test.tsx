/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useKangurAiTutorGuidedShellState } from './KangurAiTutorWidget.guided-shell';

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
  guidedSelectionGlowRects: [new DOMRect(120, 620, 140, 26)],
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
  showSectionGuidanceCallout: false,
  showSelectionGuidanceCallout: false,
  viewport: { width: 1280, height: 720 },
  ...overrides,
});

describe('KangurAiTutorWidget.guided-shell', () => {
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

  it('keeps the tutor-owned glow overlay active even when CSS highlight support is available', () => {
    const { result } = renderHook(() =>
      useKangurAiTutorGuidedShellState(buildInput({ selectionGlowSupported: true }))
    );

    expect(result.current.selectionGlowStyles).toHaveLength(1);
    expect(result.current.selectionSpotlightStyle).toBeNull();
  });
});
