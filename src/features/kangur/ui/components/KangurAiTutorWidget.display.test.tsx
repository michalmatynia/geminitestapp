/**
 * @vitest-environment jsdom
 */

import { act, render, screen } from '@/__tests__/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';

import { useKangurAiTutorGuidedDisplayState } from './KangurAiTutorWidget.display';

import type {
  KangurTutorAnchorRegistration,
} from '@/features/kangur/ui/context/kangur-tutor-types';
import type {
  GuidedTutorTarget,
  PendingSelectionResponse,
} from './KangurAiTutorWidget.types';

type HarnessProps = {
  activeSelectionPageRect?: DOMRect | null;
  activeSelectionPageRects?: DOMRect[];
  activeSelectionRect?: DOMRect | null;
  guidedTutorTarget?: GuidedTutorTarget | null;
  loginModalIsOpen?: boolean;
  openLoginModal?: (
    callbackUrl?: string | null,
    options?: { authMode?: 'sign-in' | 'create-account' }
  ) => void;
  persistedSelectionPageRect?: DOMRect | null;
  persistedSelectionPageRects?: DOMRect[];
  persistedSelectionRect?: DOMRect | null;
  selectionGuidanceCalloutVisibleText?: string | null;
  selectionResponsePending?: PendingSelectionResponse | null;
  tutorAnchorContext?: { anchors: KangurTutorAnchorRegistration[] } | null;
};

function GuidedDisplayHarness({
  activeSelectionPageRect = new DOMRect(120, 180, 140, 26),
  activeSelectionPageRects = [new DOMRect(120, 180, 140, 26)],
  activeSelectionRect = new DOMRect(120, 180, 140, 26),
  guidedTutorTarget = null,
  loginModalIsOpen = false,
  openLoginModal = vi.fn(),
  persistedSelectionPageRect = null,
  persistedSelectionPageRects = [],
  persistedSelectionRect = null,
  selectionGuidanceCalloutVisibleText = null,
  selectionResponsePending = null,
  tutorAnchorContext = null,
}: HarnessProps) {
  const guidedState = useKangurAiTutorGuidedDisplayState({
    activeSectionRect: null,
    activeSelectionPageRect,
    activeSelectionPageRects,
    activeSelectionRect,
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
    persistedSelectionPageRect,
    persistedSelectionPageRects,
    persistedSelectionRect,
    sectionResponsePending: null,
    selectionGuidanceCalloutVisibleText,
    selectionResponsePending,
    sessionContentId: 'lesson-1',
    sessionSurface: 'lesson',
    tutorAnchorContext,
    tutorContent: DEFAULT_KANGUR_AI_TUTOR_CONTENT,
    tutorName: 'Pomocnik',
    viewportTick: 0,
  });

  return (
    <>
      <div data-testid='ask-modal-mode'>{String(guidedState.isAskModalMode)}</div>
      <div data-testid='selection-guidance'>{String(guidedState.showSelectionGuidanceCallout)}</div>
      <div data-testid='guided-mode'>{guidedState.guidedMode ?? 'null'}</div>
      <div data-testid='guided-selection-rect'>
        {guidedState.guidedSelectionRect
          ? JSON.stringify({
            left: guidedState.guidedSelectionRect.left,
            top: guidedState.guidedSelectionRect.top,
            width: guidedState.guidedSelectionRect.width,
            height: guidedState.guidedSelectionRect.height,
          })
          : 'null'}
      </div>
      <div data-testid='guided-selection-spotlight-rect'>
        {guidedState.guidedSelectionSpotlightRect
          ? JSON.stringify({
            left: guidedState.guidedSelectionSpotlightRect.left,
            top: guidedState.guidedSelectionSpotlightRect.top,
            width: guidedState.guidedSelectionSpotlightRect.width,
            height: guidedState.guidedSelectionSpotlightRect.height,
          })
          : 'null'}
      </div>
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
        selectionGuidanceCalloutVisibleText='2 + 2'
      />
    );

    expect(screen.getByTestId('ask-modal-mode')).toHaveTextContent('false');
    expect(screen.getByTestId('selection-guidance')).toHaveTextContent('true');
    expect(screen.getByTestId('guided-mode')).toHaveTextContent('selection');
  });

  it('keeps the pending selected-text handoff on the inline guidance surface even if ask-modal state is stale', () => {
    render(
      <GuidedDisplayHarness
        selectionGuidanceCalloutVisibleText='2 + 2'
        selectionResponsePending={{ selectedText: '2 + 2' }}
      />
    );

    expect(screen.getByTestId('ask-modal-mode')).toHaveTextContent('false');
    expect(screen.getByTestId('selection-guidance')).toHaveTextContent('true');
    expect(screen.getByTestId('guided-mode')).toHaveTextContent('null');
  });

  it('uses the full selection line cluster as the guided focus rect when multiple line rects exist', () => {
    render(
      <GuidedDisplayHarness
        guidedTutorTarget={{
          mode: 'selection',
          kind: 'selection_excerpt',
          selectedText: 'Pierwsza linia druga linia',
        }}
        activeSelectionPageRect={new DOMRect(120, 180, 96, 24)}
        activeSelectionPageRects={[
          new DOMRect(120, 180, 96, 24),
          new DOMRect(120, 212, 182, 24),
        ]}
        activeSelectionRect={new DOMRect(120, 180, 96, 24)}
      />
    );

    expect(screen.getByTestId('guided-selection-rect')).toHaveTextContent(
      JSON.stringify({
        left: 120,
        top: 180,
        width: 182,
        height: 56,
      })
    );
  });

  it('uses one aggregate spotlight rect for multi-line selections without a matching tutor section', () => {
    render(
      <GuidedDisplayHarness
        guidedTutorTarget={{
          mode: 'selection',
          kind: 'selection_excerpt',
          selectedText: 'Pierwsza linia druga linia',
        }}
        activeSelectionPageRect={new DOMRect(120, 180, 96, 24)}
        activeSelectionPageRects={[
          new DOMRect(120, 180, 96, 24),
          new DOMRect(120, 212, 182, 24),
        ]}
        activeSelectionRect={new DOMRect(120, 180, 96, 24)}
      />
    );

    expect(screen.getByTestId('guided-selection-spotlight-rect')).toHaveTextContent(
      JSON.stringify({
        left: 120,
        top: 180,
        width: 182,
        height: 56,
      })
    );
  });

  it('keeps the guided spotlight on the selected text even when the excerpt resolves to a tutor anchor', () => {
    const sectionRect = new DOMRect(80, 140, 520, 240);

    render(
      <GuidedDisplayHarness
        guidedTutorTarget={{
          mode: 'selection',
          kind: 'selection_excerpt',
          selectedText: 'Pierwsza linia druga linia',
        }}
        activeSelectionPageRect={new DOMRect(120, 180, 96, 24)}
        activeSelectionPageRects={[
          new DOMRect(120, 180, 96, 24),
          new DOMRect(120, 212, 182, 24),
        ]}
        activeSelectionRect={new DOMRect(120, 180, 96, 24)}
        tutorAnchorContext={{
          anchors: [
            {
              getRect: () => sectionRect,
              id: 'lesson-section-document',
              kind: 'document',
              metadata: {
                contentId: 'lesson-1',
                label: 'Sekcja dokumentu',
              },
              priority: 100,
              surface: 'lesson',
            },
          ],
        }}
      />
    );

    expect(screen.getByTestId('guided-selection-rect')).toHaveTextContent(
      JSON.stringify({
        left: 120,
        top: 180,
        width: 182,
        height: 56,
      })
    );
    expect(screen.getByTestId('guided-selection-spotlight-rect')).toHaveTextContent(
      JSON.stringify({
        left: 120,
        top: 180,
        width: 182,
        height: 56,
      })
    );
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
      expect(screen.getByTestId('selection-guidance')).toHaveTextContent('false');
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
      act(() => {});

      expect(screen.getByTestId('guided-mode')).toHaveTextContent('auth');
      expect(callbacks.length).toBeGreaterThan(0);

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
      const scrollCallbacks = [...callbacks];
      callbacks.length = 0;
      act(() => {
        scrollCallbacks.forEach((callback) => callback(0));
      });

      expect(screen.getByTestId('guided-mode')).toHaveTextContent('auth');
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

  it('keeps guided auth on the nav target when the login anchor is temporarily unavailable', () => {
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
      act(() => {});

      expect(openLoginModalMock).not.toHaveBeenCalled();
      expect(screen.getByTestId('guided-mode')).toHaveTextContent('auth');
    } finally {
      window.requestAnimationFrame = originalRequestAnimationFrame;
      window.cancelAnimationFrame = originalCancelAnimationFrame;
    }
  });
});
