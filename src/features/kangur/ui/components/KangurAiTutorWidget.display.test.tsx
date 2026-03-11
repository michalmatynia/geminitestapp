/**
 * @vitest-environment jsdom
 */

import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import { useKangurAiTutorGuidedDisplayState } from './KangurAiTutorWidget.display';

import type {
  GuidedTutorTarget,
  PendingSelectionResponse,
} from './KangurAiTutorWidget.types';

type HarnessProps = {
  guidedTutorTarget?: GuidedTutorTarget | null;
  loginModalIsOpen?: boolean;
  openLoginModal?: (
    callbackUrl?: string | null,
    options?: { authMode?: 'sign-in' | 'create-account' }
  ) => void;
  selectionResponsePending?: PendingSelectionResponse | null;
};

function GuidedDisplayHarness({
  guidedTutorTarget = null,
  loginModalIsOpen = false,
  openLoginModal = vi.fn(),
  selectionResponsePending = null,
}: HarnessProps) {
  const guidedState = useKangurAiTutorGuidedDisplayState({
    activeSectionRect: null,
    activeSelectionPageRect: new DOMRect(120, 180, 140, 26),
    activeSelectionRect: new DOMRect(120, 180, 140, 26),
    askModalVisible: true,
    enabled: true,
    guestTutorAssistantLabel: 'Pomocnik',
    guidedTutorTarget,
    homeOnboardingEligibleContentId: 'game:home',
    homeOnboardingRecordStatus: null,
    homeOnboardingStepIndex: null,
    hoveredSectionAnchorId: null,
    isAuthenticated: true,
    isLoading: false,
    loginModalIsOpen,
    isOpen: true,
    isTutorHidden: false,
    mounted: true,
    openLoginModal,
    persistedSelectionPageRect: null,
    persistedSelectionRect: null,
    sectionResponsePending: null,
    selectionResponsePending,
    sessionContentId: 'lesson-1',
    sessionSurface: 'lesson',
    tutorAnchorContext: null,
    tutorContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
    tutorName: 'Pomocnik',
    viewportTick: 0,
  });

  return (
    <>
      <div data-testid='ask-modal-mode'>{String(guidedState.isAskModalMode)}</div>
      <div data-testid='selection-guidance'>{String(guidedState.showSelectionGuidanceCallout)}</div>
      <div data-testid='guided-mode'>{guidedState.guidedMode ?? 'null'}</div>
    </>
  );
}

describe('useKangurAiTutorGuidedDisplayState', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('keeps a guided selection target on the inline guidance surface even if ask-modal state is stale', () => {
    render(
      <GuidedDisplayHarness
        guidedTutorTarget={{
          mode: 'selection',
          kind: 'selection_excerpt',
          selectedText: '2 + 2',
        }}
      />
    );

    expect(screen.getByTestId('ask-modal-mode')).toHaveTextContent('false');
    expect(screen.getByTestId('selection-guidance')).toHaveTextContent('true');
    expect(screen.getByTestId('guided-mode')).toHaveTextContent('selection');
  });

  it('keeps the pending selected-text handoff on the inline guidance surface even if ask-modal state is stale', () => {
    render(<GuidedDisplayHarness selectionResponsePending={{ selectedText: '2 + 2' }} />);

    expect(screen.getByTestId('ask-modal-mode')).toHaveTextContent('false');
    expect(screen.getByTestId('selection-guidance')).toHaveTextContent('true');
    expect(screen.getByTestId('guided-mode')).toHaveTextContent('null');
  });

  it('scrolls the auth anchor into view when guided login help starts', () => {
    const scrollIntoViewMock = vi.fn();
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const anchor = document.createElement('button');
    anchor.dataset.kangurTutorAnchorSurface = 'auth';
    anchor.dataset.kangurTutorAnchorKind = 'login_action';
    anchor.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(anchor);

    window.requestAnimationFrame = ((callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = vi.fn() as typeof window.cancelAnimationFrame;

    try {
      render(
        <GuidedDisplayHarness
          guidedTutorTarget={{
            mode: 'auth',
            authMode: 'sign-in',
            kind: 'login_action',
          }}
        />
      );

      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
      expect(screen.getByTestId('guided-mode')).toHaveTextContent('auth');
    } finally {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it('retries auth anchor resolution when the login anchor mounts after guided auth starts', () => {
    const callbacks: FrameRequestCallback[] = [];
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;

    window.requestAnimationFrame = ((callback: FrameRequestCallback): number => {
      callbacks.push(callback);
      return callbacks.length;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = vi.fn() as typeof window.cancelAnimationFrame;

    try {
      render(
        <GuidedDisplayHarness
          guidedTutorTarget={{
            mode: 'auth',
            authMode: 'sign-in',
            kind: 'login_action',
          }}
        />
      );

      expect(screen.getByTestId('guided-mode')).toHaveTextContent('auth');

      const anchor = document.createElement('button');
      anchor.dataset.kangurTutorAnchorSurface = 'auth';
      anchor.dataset.kangurTutorAnchorKind = 'login_action';
      anchor.scrollIntoView = vi.fn();
      document.body.appendChild(anchor);

      const pendingCallbacks = [...callbacks];
      callbacks.length = 0;
      act(() => {
        pendingCallbacks.forEach((callback) => callback(0));
      });

      expect(anchor.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    } finally {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });

  it('opens the login modal when guided auth cannot resolve a login anchor', () => {
    const openLoginModalMock = vi.fn();
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;

    window.requestAnimationFrame = ((callback: FrameRequestCallback): number => {
      callback(0);
      return 1;
    }) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = vi.fn() as typeof window.cancelAnimationFrame;

    try {
      render(
        <GuidedDisplayHarness
          guidedTutorTarget={{
            mode: 'auth',
            authMode: 'sign-in',
            kind: 'login_action',
          }}
          openLoginModal={openLoginModalMock}
        />
      );

      expect(openLoginModalMock).toHaveBeenCalledWith(undefined, {
        authMode: 'sign-in',
      });
      expect(screen.getByTestId('guided-mode')).toHaveTextContent('auth');
    } finally {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });
});
