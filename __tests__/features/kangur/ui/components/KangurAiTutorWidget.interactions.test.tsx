/**
 * @vitest-environment jsdom
 */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildTutorAnchorsTree,
  clearSelectionMock,
  closeChatMock,
  mockWindowSelection,
  navigateToLoginMock,
  openChatMock,
  prepareKangurAiTutorWidgetTest,
  recordFollowUpCompletionMock,
  renderWithTutorAnchors,
  sendMessageMock,
  setHighlightedTextMock,
  trackKangurClientEventMock,
  useKangurAiTutorMock,
  useKangurTextHighlightMock,
  useOptionalKangurAuthMock,
} from './KangurAiTutorWidget.test-support';

describe('KangurAiTutorWidget interactions', () => {
  let KangurAiTutorWidget: Awaited<ReturnType<typeof prepareKangurAiTutorWidgetTest>>;

  beforeEach(async () => {
    KangurAiTutorWidget = await prepareKangurAiTutorWidgetTest();
  }, 45_000);

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('does not show the selection action when the live selection comes from inside the guest intro', async () => {
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      navigateToLogin: navigateToLoginMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: 'Czy chcesz pomocy z logowaniem albo założeniem konta?',
      selectionRect: new DOMRect(120, 180, 180, 26),
      selectionContainerRect: new DOMRect(80, 150, 520, 240),
      clearSelection: clearSelectionMock,
    });
    useKangurAiTutorMock.mockReturnValue({
      enabled: false,
      tutorSettings: null,
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: null,
      isOpen: false,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Neutralny nastrój.',
    });
    const view = render(<KangurAiTutorWidget />);
    fireEvent.click(screen.getByTestId('kangur-ai-tutor-avatar'));
    const guestIntro = await screen.findByTestId('kangur-ai-tutor-guest-intro');
    expect(guestIntro).toHaveAttribute('data-kangur-ai-tutor-root', 'true');

    const detailTextNode =
      guestIntro.querySelector('.tutor-assistant-bubble')?.firstChild ?? guestIntro;

    const getSelectionSpy = mockWindowSelection(
      detailTextNode ?? guestIntro,
      'Czy chcesz pomocy z logowaniem albo założeniem konta?'
    );
    view.rerender(<KangurAiTutorWidget />);

    expect(screen.queryByTestId('kangur-ai-tutor-selection-action')).not.toBeInTheDocument();
    getSelectionSpy.mockRestore();
  });

  it('persists a dragged launcher position without opening the tutor', () => {
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
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
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    render(<KangurAiTutorWidget />);
    const avatar = screen.getByTestId('kangur-ai-tutor-avatar');
    fireEvent.pointerDown(avatar, {
      button: 0,
      clientX: 1200,
      clientY: 650,
      pointerId: 1,
    });
    fireEvent.pointerMove(avatar, {
      clientX: 1090,
      clientY: 560,
      pointerId: 1,
    });
    fireEvent.pointerUp(avatar, {
      clientX: 1090,
      clientY: 560,
      pointerId: 1,
    });
    const persistedState = JSON.parse(
      window.sessionStorage.getItem('kangur-ai-tutor-widget-v1') ?? '{}'
    ) as {
      avatarPosition?: {
        left: number;
        top: number;
      };
    };
    expect(avatar).toHaveAttribute('data-is-dragging', 'false');
    expect(persistedState.avatarPosition).toEqual(
      expect.objectContaining({
        left: expect.any(Number),
        top: expect.any(Number),
      })
    );
    expect(openChatMock).not.toHaveBeenCalled();
  });

  it('shows a gentle section border while the dragged avatar overlaps a valid section', () => {
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
        surface: 'game',
        contentId: 'game:home',
        title: 'Grajmy',
      },
      isOpen: false,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    };
    useKangurAiTutorMock.mockImplementation(() => tutorState);
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: clearSelectionMock,
    });
    renderWithTutorAnchors(KangurAiTutorWidget, { homeAnchorKinds: ['leaderboard'] });
    const avatar = screen.getByTestId('kangur-ai-tutor-avatar');
    fireEvent.pointerDown(avatar, {
      button: 0,
      pointerId: 11,
      clientX: 980,
      clientY: 640,
    });
    fireEvent.pointerMove(avatar, {
      pointerId: 11,
      clientX: 260,
      clientY: 1080,
    });
    expect(screen.getByTestId('kangur-ai-tutor-section-drop-highlight')).toHaveClass(
      'kangur-chat-spotlight-frame'
    );
    fireEvent.pointerMove(avatar, {
      pointerId: 11,
      clientX: 930,
      clientY: 600,
    });
    expect(screen.queryByTestId('kangur-ai-tutor-section-drop-highlight')).not.toBeInTheDocument();
    fireEvent.pointerUp(avatar, {
      pointerId: 11,
      clientX: 930,
      clientY: 600,
    });
  });

  it('closes the tutor when the user clicks outside the desktop bubble', () => {
    render(<KangurAiTutorWidget />);
    fireEvent.pointerDown(document.body);
    expect(closeChatMock).toHaveBeenCalledTimes(1);
    expect(clearSelectionMock).toHaveBeenCalledTimes(1);
    expect(setHighlightedTextMock).toHaveBeenLastCalledWith(null);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_closed',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        reason: 'outside',
        messageCount: 0,
      })
    );
  });

  it('preserves the selection context while the tutor stays open after the live dom selection clears', () => {
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
      tutorMoodId: 'neutral',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: true,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: '2 + 2',
      usageSummary: null,
      openChat: openChatMock,
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: new DOMRect(120, 180, 140, 26),
      selectionContainerRect: new DOMRect(80, 150, 520, 240),
      clearSelection: clearSelectionMock,
    });
    render(<KangurAiTutorWidget />);
    expect(screen.getByTestId('kangur-ai-tutor-selection-context-spotlight')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-selection-context-spotlight')).toHaveStyle({
      width: '160px',
      height: '46px',
    });
    expect(screen.getByTestId('kangur-ai-tutor-selected-text-preview')).toHaveTextContent(
      'Wyjaśniany fragment'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selected-text-preview')).toHaveClass(
      'kangur-chat-padding-md'
    );
    expect(screen.getByText('Wyjaśniany fragment')).toHaveClass(
      '[color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selected-text-refocus')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do rozmowy' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-selected-text-preview')).toHaveTextContent(
      'Możesz wrócić do zwykłej rozmowy'
    );
    fireEvent.click(screen.getByTestId('kangur-ai-tutor-selected-text-refocus'));
    expect(scrollToMock).toHaveBeenCalledWith(
      expect.objectContaining({
        top: expect.any(Number),
        behavior: 'smooth',
      })
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_selection_refocused',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        selectionLength: 5,
      })
    );
    expect(screen.getByRole('button', { name: 'Wyjaśnij' })).toBeInTheDocument();
    expect(setHighlightedTextMock).not.toHaveBeenCalledWith(null);
  });

  it('lets the learner detach the selected fragment without closing the tutor', () => {
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
      tutorMoodId: 'neutral',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: true,
      messages: [
        {
          role: 'assistant',
          content: 'Wyjaśniam ten fragment krok po kroku.',
        },
      ],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: '2 + 2',
      usageSummary: null,
      openChat: openChatMock,
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: clearSelectionMock,
    });
    render(<KangurAiTutorWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do rozmowy' }));
    expect(clearSelectionMock).toHaveBeenCalled();
    expect(setHighlightedTextMock).toHaveBeenCalledWith(null);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_selection_detached',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        selectionLength: 5,
        messageCount: 1,
      })
    );
    expect(screen.queryByTestId('kangur-ai-tutor-selected-text-preview')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('kangur-ai-tutor-selection-context-spotlight')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wróć do rozmowy' })).not.toBeInTheDocument();
    expect(closeChatMock).not.toHaveBeenCalled();
  });

  it('hides the redundant selected-text quick action once fragment explanation is already in progress', () => {
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
      tutorMoodId: 'neutral',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: true,
      messages: [
        {
          role: 'assistant',
          content: 'Wyjaśniam ten fragment krok po kroku.',
        },
      ],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: '2 + 2',
      usageSummary: null,
      openChat: openChatMock,
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: clearSelectionMock,
    });
    render(<KangurAiTutorWidget />);
    expect(screen.getByTestId('kangur-ai-tutor-selected-text-preview')).toHaveTextContent(
      'Wyjaśniany fragment'
    );
    expect(screen.queryByRole('button', { name: 'Ten fragment' })).not.toBeInTheDocument();
  });

  it('styles the tutor launcher with the orange cta chrome instead of the old purple tint', () => {
    render(<KangurAiTutorWidget />);
    const launcher = screen.getByTestId('kangur-ai-tutor-avatar');
    expect(launcher).toHaveClass('kangur-chat-floating-avatar', 'focus-visible:ring-2');
    expect(launcher).not.toHaveClass(
      'from-indigo-500',
      'via-fuchsia-500',
      'focus-visible:ring-indigo-400'
    );
  });

  it('tracks anchor changes and motion completion for an open tutor', () => {
    vi.useFakeTimers();
    try {
      render(<KangurAiTutorWidget />);
      expect(trackKangurClientEventMock).toHaveBeenCalledWith(
        'kangur_ai_tutor_anchor_changed',
        expect.objectContaining({
          surface: 'lesson',
          title: 'Dodawanie',
          anchorKind: 'selection',
          anchorId: 'selection',
          layoutMode: 'bubble',
          hasSelectedText: true,
        })
      );
      act(() => {
        vi.runOnlyPendingTimers();
      });
      expect(trackKangurClientEventMock).toHaveBeenCalledWith(
        'kangur_ai_tutor_motion_completed',
        expect.objectContaining({
          surface: 'lesson',
          title: 'Dodawanie',
          anchorKind: 'selection',
          anchorId: 'selection',
          layoutMode: 'bubble',
          hasSelectedText: true,
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the outside-dismiss path for the mobile backdrop', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 844,
    });
    render(<KangurAiTutorWidget />);
    expect(screen.getByTestId('kangur-ai-tutor-backdrop')).toHaveClass('cursor-pointer');
    fireEvent.click(screen.getByTestId('kangur-ai-tutor-backdrop'));
    expect(closeChatMock).toHaveBeenCalledTimes(1);
    expect(clearSelectionMock).toHaveBeenCalledTimes(1);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_closed',
      expect.objectContaining({
        reason: 'outside',
      })
    );
  });

  it('keeps supporting legacy motion preset ids through local heuristics', () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: 'preset-tablet',
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
      isOpen: true,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: clearSelectionMock,
    });
    render(<KangurAiTutorWidget />);
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-motion-preset',
      'tablet'
    );
  });

  it('shows a context-switch notice when the tutor stays open and moves to another context', () => {
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: clearSelectionMock,
    });
    const { rerender } = render(<KangurAiTutorWidget />);
    expect(screen.queryByTestId('kangur-ai-tutor-context-switch')).not.toBeInTheDocument();
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
        contentId: 'suite-1',
        title: 'Kangur Mini',
        questionProgressLabel: 'Pytanie 1/10',
      },
      isOpen: true,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    rerender(<KangurAiTutorWidget />);
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveTextContent(
      'Nowe miejsce pomocy'
    );
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveClass(
      'kangur-chat-inset',
      'kangur-chat-padding-sm'
    );
    expect(screen.getByText('Nowe miejsce pomocy')).toHaveClass(
      '[color:var(--kangur-chat-kicker-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
    );
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveTextContent(
      'Test: Kangur Mini'
    );
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveTextContent('Pytanie 1/10');
  });

  it('restores the context-switch notice after remount using the persisted session key', () => {
    window.sessionStorage.setItem(
      'kangur-ai-tutor-widget-v1',
      JSON.stringify({ lastSessionKey: 'lesson:lesson-1', hidden: false })
    );
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: clearSelectionMock,
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
      tutorMoodId: 'neutral',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'test',
        contentId: 'suite-1',
        title: 'Kangur Mini',
        questionProgressLabel: 'Pytanie 1/10',
      },
      isOpen: true,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    render(<KangurAiTutorWidget />);
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveTextContent(
      'Nowe miejsce pomocy'
    );
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveTextContent(
      'Test: Kangur Mini'
    );
  });

  it('ignores a persisted session key when cross-page persistence is disabled', () => {
    window.sessionStorage.setItem(
      'kangur-ai-tutor-widget-v1',
      JSON.stringify({ lastSessionKey: 'lesson:lesson-1' })
    );
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: clearSelectionMock,
    });
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: false,
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
        surface: 'test',
        contentId: 'suite-1',
        title: 'Kangur Mini',
        questionProgressLabel: 'Pytanie 1/10',
      },
      isOpen: true,
      messages: [],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: null,
      usageSummary: null,
      openChat: openChatMock,
      closeChat: closeChatMock,
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });
    render(<KangurAiTutorWidget />);
    expect(screen.queryByTestId('kangur-ai-tutor-context-switch')).not.toBeInTheDocument();
  });
});
