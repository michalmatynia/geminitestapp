/**
 * @vitest-environment jsdom
 */
import { renderHook } from '@/__tests__/test-utils';
import { describe, expect, it } from 'vitest';

import { useKangurAiTutorPanelShellState } from './KangurAiTutorWidget.panel-shell';

const baseInput = {
  activeFocusKind: 'selection',
  askModalDockStyle: null,
  bubblePlacement: {
    launchOrigin: 'dock-bottom-right' as const,
    mode: 'bubble' as const,
    strategy: 'left' as const,
    style: {
      left: 240,
      top: 180,
    },
    width: 420,
  },
  compactDockedTutorPanelWidth: 420,
  contextualTutorMode: null,
  displayFocusRect: new DOMRect(120, 180, 140, 26),
  draggedAvatarPoint: null,
  guidedAvatarStyle: null,
  guidedFocusRect: null,
  guidedMode: null,
  guidedTutorTarget: null,
  hasContextualVisibilityFallback: true,
  homeOnboardingStepKind: null,
  isAnchoredUiMode: true,
  isAvatarDragging: false,
  isCompactDockedTutorPanel: false,
  isAskModalMode: false,
  isContextualPanelAnchor: true,
  isFreeformUiMode: false,
  isGuidedTutorMode: false,
  isOpen: true,
  isPanelDragging: false,
  isStaticUiMode: false,
  isTutorHidden: false,
  motionProfile: {
    avatarTransition: { type: 'spring' as const, stiffness: 340, damping: 26 },
    bubbleTransition: { type: 'spring' as const, stiffness: 340, damping: 26 },
    desktopBubbleWidth: 420,
    guidedAvatarTransition: {
      type: 'tween' as const,
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
    hoverScale: 1.02,
    kind: 'default',
    mobileBubbleWidth: 360,
    motionCompletedDelayMs: 180,
    sheetBreakpoint: 768,
    tapScale: 0.98,
  },
  panelMeasuredHeight: 320,
  panelPosition: null,
  panelShellMode: 'default' as const,
  panelSnapPreference: 'free' as const,
  prefersReducedMotion: false,
  reducedMotionTransitions: {
    instant: { duration: 0 },
  },
  showSectionGuidanceCallout: false,
  showSelectionGuidanceCallout: false,
  viewport: { width: 1280, height: 900 },
};

describe('useKangurAiTutorPanelShellState', () => {
  it('uses a fade entry for the deferred selection-explain minimal panel', () => {
    const { result } = renderHook(() =>
      useKangurAiTutorPanelShellState({
        ...baseInput,
        contextualTutorMode: 'selection_explain',
        panelShellMode: 'minimal',
      })
    );

    expect(result.current.panelOpenAnimation).toBe('fade');
  });

  it('keeps the contextual dock-launch animation for standard anchored panels', () => {
    const { result } = renderHook(() =>
      useKangurAiTutorPanelShellState(baseInput)
    );

    expect(result.current.panelOpenAnimation).toBe('dock-launch');
  });
});
