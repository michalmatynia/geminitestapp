/**
 * @vitest-environment jsdom
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  activateSelectionGlowMock,
  clearSelectionGlowMock,
  clearSelectionMock,
  navigateToLoginMock,
  openChatMock,
  prepareKangurAiTutorWidgetTest,
  sendMessageMock,
  setHighlightedTextMock,
  trackKangurClientEventMock,
  useKangurAiTutorMock,
  useKangurTextHighlightMock,
  useOptionalKangurAuthMock,
} from './KangurAiTutorWidget.test-support';

describe('KangurAiTutorWidget selection guidance', () => {
  let KangurAiTutorWidget: Awaited<ReturnType<typeof prepareKangurAiTutorWidgetTest>>;

  beforeEach(async () => {
    KangurAiTutorWidget = await prepareKangurAiTutorWidgetTest();
  }, 45_000);

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows a separate selection action near highlighted page text and opens from it', async () => {
    const scrollToMock = vi.fn();
    vi.stubGlobal('scrollTo', scrollToMock);
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: false,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: vi.fn(),
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      activateSelectionGlow: activateSelectionGlowMock,
      selectedText: '2 + 2',
      selectionLineRects: [new DOMRect(120, 620, 140, 26)],
      selectionRect: new DOMRect(120, 620, 140, 26),
      selectionContainerRect: new DOMRect(80, 580, 520, 240),
      clearSelection: clearSelectionMock,
      clearSelectionGlow: clearSelectionGlowMock,
      selectionGlowSupported: false,
    });
    render(<KangurAiTutorWidget />);
    expect(screen.getByTestId('kangur-ai-tutor-selection-action')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapytaj o to' })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Zapytaj o to' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));
    await waitFor(() =>
      expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toBeInTheDocument()
    );
    expect(setHighlightedTextMock).toHaveBeenCalledWith('2 + 2');
    expect(activateSelectionGlowMock).toHaveBeenCalledTimes(1);
    expect(clearSelectionMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('kangur-ai-tutor-selection-action')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-ai-tutor-selection-glow')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toHaveAttribute(
      'data-selection-emphasis',
      'glow'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toHaveStyle({
      width: '160px',
      height: '46px',
    });
    expect(screen.queryByTestId('kangur-ai-tutor-ask-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'guided'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-transition',
      'guided'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'selection_excerpt'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-pointer',
      'rim-arrowhead'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar-image')).toHaveClass(
      'kangur-chat-avatar-shell'
    );
    const guidedSelectionArrowhead = screen.getByTestId('kangur-ai-tutor-guided-arrowhead');
    const selectionArrowAnchorLeft = Number(
      guidedSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-left')
    );
    const selectionArrowAnchorTop = Number(
      guidedSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-top')
    );
    const selectionArrowTargetX = Number(
      guidedSelectionArrowhead.getAttribute('data-guidance-target-x')
    );
    const selectionArrowTargetY = Number(
      guidedSelectionArrowhead.getAttribute('data-guidance-target-y')
    );
    expect(selectionArrowAnchorLeft).toBeGreaterThanOrEqual(0);
    expect(selectionArrowAnchorLeft).toBeLessThanOrEqual(56);
    expect(selectionArrowAnchorTop).toBeGreaterThanOrEqual(0);
    expect(selectionArrowAnchorTop).toBeLessThanOrEqual(56);
    expect(selectionArrowTargetX).toBeGreaterThanOrEqual(120);
    expect(selectionArrowTargetX).toBeLessThanOrEqual(260);
    expect(selectionArrowTargetY).toBeGreaterThanOrEqual(620);
    expect(selectionArrowTargetY).toBeLessThanOrEqual(646);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_selection_guidance_started',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        selectionLength: 5,
      })
    );
    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        top: expect.any(Number),
        behavior: 'smooth',
      })
    );
    expect(
      (scrollToMock.mock.calls[0]?.[0] as ScrollToOptions | undefined)?.top ?? 0
    ).toBeGreaterThan(0);
    await waitFor(() =>
      expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeInTheDocument()
    );
    expect(sendMessageMock).toHaveBeenCalledWith(
      'Wyjaśnij zaznaczony fragment krok po kroku.',
      expect.objectContaining({
        promptMode: 'selected_text',
        selectedText: '2 + 2',
        focusKind: 'selection',
        focusId: 'selection',
        focusLabel: '2 + 2',
        interactionIntent: 'explain',
      })
    );
    expect(screen.queryByTestId('kangur-ai-tutor-ask-modal')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('keeps anonymous Zapytaj o to on the same guided-selection path without auto guest intro', async () => {
    vi.useFakeTimers();
    const scrollToMock = vi.fn();
    vi.stubGlobal('scrollTo', scrollToMock);
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      navigateToLogin: navigateToLoginMock,
    });
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: false,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: vi.fn(),
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      activateSelectionGlow: activateSelectionGlowMock,
      selectedText: '2 + 2',
      selectionLineRects: [new DOMRect(120, 620, 140, 26)],
      selectionRect: new DOMRect(120, 620, 140, 26),
      selectionContainerRect: new DOMRect(80, 580, 520, 240),
      clearSelection: clearSelectionMock,
      clearSelectionGlow: clearSelectionGlowMock,
      selectionGlowSupported: false,
    });
    render(<KangurAiTutorWidget />);

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Zapytaj o to' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));

    expect(screen.queryByTestId('kangur-ai-tutor-guest-intro')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-ai-tutor-guest-intro-backdrop')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-surface-diagnostics')).toHaveAttribute(
      'data-guest-intro-rendered',
      'false'
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'guided'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-ai-tutor-guest-intro')).not.toBeInTheDocument();
    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        top: expect.any(Number),
        behavior: 'smooth',
      })
    );
    vi.useRealTimers();
  });

  it('renders one aggregate spotlight and no per-line glow boxes for a multi-line excerpt outside tutor sections', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('scrollTo', vi.fn());
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: false,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: vi.fn(),
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      activateSelectionGlow: activateSelectionGlowMock,
      selectedText: 'Pierwsza linia druga linia',
      selectionLineRects: [
        new DOMRect(120, 620, 96, 24),
        new DOMRect(120, 652, 182, 24),
      ],
      selectionRect: new DOMRect(120, 620, 96, 24),
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
      clearSelectionGlow: clearSelectionGlowMock,
      selectionGlowSupported: false,
    });
    render(<KangurAiTutorWidget />);

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Zapytaj o to' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.queryAllByTestId('kangur-ai-tutor-selection-glow')).toHaveLength(0);
    expect(screen.getAllByTestId('kangur-ai-tutor-selection-spotlight')).toHaveLength(1);
    expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toHaveStyle({
      width: '202px',
      height: '76px',
    });

    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('keeps the previous conversation hidden during the selected-fragment explanation', async () => {
    vi.useFakeTimers();
    let tutorState = {
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: false,
      messages: [
        {
          role: 'assistant',
          content: 'W poprzednim wątku omawialiśmy zupełnie inne zadanie.',
        },
      ],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: 'Stary fragment',
      usageSummary: null,
      openChat: openChatMock,
      closeChat: vi.fn(),
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    };
    useKangurAiTutorMock.mockImplementation(() => tutorState);
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: '2 + 2',
      selectionRect: new DOMRect(120, 620, 140, 26),
      selectionContainerRect: new DOMRect(80, 580, 520, 240),
      clearSelection: clearSelectionMock,
    });
    const { rerender } = render(<KangurAiTutorWidget />);
    openChatMock.mockImplementation(() => {
      tutorState = {
        ...tutorState,
        isOpen: true,
      };
      rerender(<KangurAiTutorWidget />);
    });
    sendMessageMock.mockImplementation(async () => {
      tutorState = {
        ...tutorState,
        isOpen: true,
        isLoading: true,
        messages: [
          ...tutorState.messages,
          {
            role: 'user',
            content: 'Wyjaśnij zaznaczony fragment krok po kroku.',
          },
        ],
      };
      rerender(<KangurAiTutorWidget />);
      await Promise.resolve();
      tutorState = {
        ...tutorState,
        isOpen: true,
        isLoading: false,
        messages: [
          {
            role: 'assistant',
            content: 'W poprzednim wątku omawialiśmy zupełnie inne zadanie.',
          },
          {
            role: 'user',
            content: 'Wyjaśnij zaznaczony fragment krok po kroku.',
          },
          {
            role: 'assistant',
            content: 'Nowe wyjaśnienie fragmentu.',
          },
        ],
      };
      rerender(<KangurAiTutorWidget />);
    });
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole('button', { name: 'Zapytaj o to' }));
      fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));
    });
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(sendMessageMock).toHaveBeenCalled();
    expect(
      screen.queryByText('W poprzednim wątku omawialiśmy zupełnie inne zadanie.')
    ).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('places the selection action below the excerpt when the highlight is near the top edge', () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: false,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: vi.fn(),
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: '2 + 2',
      selectionRect: new DOMRect(220, 20, 140, 26),
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
    });
    render(<KangurAiTutorWidget />);
    expect(screen.getByTestId('kangur-ai-tutor-selection-action')).toHaveAttribute(
      'data-selection-placement',
      'bottom'
    );
  });

  it('keeps the guided selection avatar attached to the modal when the highlight is near the top edge', async () => {
    vi.useFakeTimers();
    openChatMock.mockImplementation(() => {});
    sendMessageMock.mockResolvedValue(undefined);
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: false,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: vi.fn(),
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: '2 + 2',
      selectionRect: new DOMRect(220, 32, 140, 26),
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
    });
    try {
      render(<KangurAiTutorWidget />);
      await act(async () => {
        fireEvent.mouseDown(screen.getByRole('button', { name: 'Zapytaj o to' }));
        fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));
      });
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      const guidedAvatarPlacement = screen
        .getByTestId('kangur-ai-tutor-avatar')
        .getAttribute('data-guidance-avatar-placement');
      expect(guidedAvatarPlacement).not.toBe('dock');
      expect(
        screen.queryByTestId('kangur-ai-tutor-selection-guided-callout')
      ).not.toBeInTheDocument();
      const topEdgeSelectionArrowhead = screen.getByTestId('kangur-ai-tutor-guided-arrowhead');
      expect(
        Number(topEdgeSelectionArrowhead.getAttribute('data-guidance-target-x'))
      ).toBeGreaterThanOrEqual(220);
      expect(
        Number(topEdgeSelectionArrowhead.getAttribute('data-guidance-target-x'))
      ).toBeLessThanOrEqual(360);
      expect(
        Number(topEdgeSelectionArrowhead.getAttribute('data-guidance-target-y'))
      ).toBeGreaterThanOrEqual(32);
      expect(
        Number(topEdgeSelectionArrowhead.getAttribute('data-guidance-target-y'))
      ).toBeLessThanOrEqual(58);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the selection guidance arrow anchored when the highlighted text is near the right edge', async () => {
    vi.useFakeTimers();
    openChatMock.mockImplementation(() => {});
    sendMessageMock.mockResolvedValue(undefined);
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: false,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: vi.fn(),
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: '2 + 2',
      selectionRect: new DOMRect(1140, 320, 110, 26),
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
    });
    try {
      render(<KangurAiTutorWidget />);
      await act(async () => {
        fireEvent.mouseDown(screen.getByRole('button', { name: 'Zapytaj o to' }));
        fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));
      });
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(
        screen.queryByTestId('kangur-ai-tutor-selection-guided-callout')
      ).not.toBeInTheDocument();
      const rightEdgeSelectionArrowhead = screen.getByTestId('kangur-ai-tutor-guided-arrowhead');
      expect(
        Number(rightEdgeSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-left'))
      ).toBeGreaterThanOrEqual(0);
      expect(
        Number(rightEdgeSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-left'))
      ).toBeLessThanOrEqual(56);
      expect(
        Number(rightEdgeSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-top'))
      ).toBeGreaterThanOrEqual(0);
      expect(
        Number(rightEdgeSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-top'))
      ).toBeLessThanOrEqual(56);
      expect(
        Number(rightEdgeSelectionArrowhead.getAttribute('data-guidance-target-x'))
      ).toBeGreaterThanOrEqual(1140);
      expect(
        Number(rightEdgeSelectionArrowhead.getAttribute('data-guidance-target-x'))
      ).toBeLessThanOrEqual(1250);
      expect(
        Number(rightEdgeSelectionArrowhead.getAttribute('data-guidance-target-y'))
      ).toBeGreaterThanOrEqual(320);
      expect(
        Number(rightEdgeSelectionArrowhead.getAttribute('data-guidance-target-y'))
      ).toBeLessThanOrEqual(346);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the selection guidance arrow anchored for highlighted test-question text', async () => {
    vi.useFakeTimers();
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      sessionContext: {
        surface: 'test',
        contentId: 'test-suite-1',
        title: 'Mini test dodawania',
        currentQuestion: 'Ile to 8 + 5?',
        questionId: 'test-question-1',
      },
      isOpen: false,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: vi.fn(),
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: 'Ile to 8 + 5?',
      selectionRect: new DOMRect(180, 180, 180, 28),
      selectionContainerRect: new DOMRect(140, 148, 420, 180),
      clearSelection: clearSelectionMock,
    });
    render(<KangurAiTutorWidget />);
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Zapytaj o to' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'selection_excerpt'
    );
    const testSelectionArrowhead = screen.getByTestId('kangur-ai-tutor-guided-arrowhead');
    expect(
      Number(testSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-left'))
    ).toBeGreaterThanOrEqual(0);
    expect(
      Number(testSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-left'))
    ).toBeLessThanOrEqual(56);
    expect(
      Number(testSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-top'))
    ).toBeGreaterThanOrEqual(0);
    expect(
      Number(testSelectionArrowhead.getAttribute('data-guidance-anchor-avatar-top'))
    ).toBeLessThanOrEqual(56);
    expect(
      Number(testSelectionArrowhead.getAttribute('data-guidance-target-x'))
    ).toBeGreaterThanOrEqual(180);
    expect(
      Number(testSelectionArrowhead.getAttribute('data-guidance-target-x'))
    ).toBeLessThanOrEqual(360);
    expect(
      Number(testSelectionArrowhead.getAttribute('data-guidance-target-y'))
    ).toBeGreaterThanOrEqual(180);
    expect(
      Number(testSelectionArrowhead.getAttribute('data-guidance-target-y'))
    ).toBeLessThanOrEqual(208);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_selection_guidance_started',
      expect.objectContaining({
        surface: 'test',
        title: 'Mini test dodawania',
        selectionLength: 13,
      })
    );
    vi.useRealTimers();
  });
});
