/**
 * @vitest-environment jsdom
 */

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurAiTutorMock,
  useKangurTextHighlightMock,
  useOptionalKangurRoutingMock,
  usePlaywrightPersonasMock,
  sendMessageMock,
  openChatMock,
  closeChatMock,
  setHighlightedTextMock,
  clearSelectionMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  useKangurAiTutorMock: vi.fn(),
  useKangurTextHighlightMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
  usePlaywrightPersonasMock: vi.fn(),
  sendMessageMock: vi.fn(),
  openChatMock: vi.fn(),
  closeChatMock: vi.fn(),
  setHighlightedTextMock: vi.fn(),
  clearSelectionMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <div {...props}>{children}</div>,
    button: ({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement> & {
      animate?: unknown;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <button {...props}>{children}</button>,
  },
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutor: useKangurAiTutorMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTextHighlight', () => ({
  useKangurTextHighlight: useKangurTextHighlightMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: useOptionalKangurRoutingMock,
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  buildKangurRecommendationHref: (
    basePath: string,
    action: {
      page: 'Game' | 'Lessons' | 'ParentDashboard' | 'LearnerProfile';
      query?: Record<string, string>;
    }
  ) => {
    const pageSlug = action.page === 'Lessons' ? 'lessons' : action.page.toLowerCase();
    const params = action.query ? new URLSearchParams(action.query).toString() : '';
    return `${basePath}/${pageSlug}${params ? `?${params}` : ''}`;
  },
  getKangurRecommendationButtonVariant: (page: 'Game' | 'Lessons') =>
    page === 'Lessons' ? 'warm' : 'primary',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
}));

vi.mock('@/features/playwright/hooks/usePlaywrightPersonas', () => ({
  usePlaywrightPersonas: usePlaywrightPersonasMock,
}));

import { KangurAiTutorWidget } from './KangurAiTutorWidget';

describe('KangurAiTutorWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();

    Element.prototype.scrollIntoView = vi.fn();
    sendMessageMock.mockResolvedValue(undefined);
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1280,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 720,
    });
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
    });
    usePlaywrightPersonasMock.mockReturnValue({
      data: [],
    });

    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: null,
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
      selectedText: '2 + 2',
      selectionRect: new DOMRect(120, 180, 140, 26),
      clearSelection: clearSelectionMock,
    });
  });

  it('renders the active Kangur context and assistant sources', () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: null,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'encouraging',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><path d="M18 58 Q50 24 82 58" fill="none" stroke="#ffffff" stroke-width="8" /></svg>',
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: true,
      messages: [
        {
          role: 'assistant',
          content: 'Policz najpierw pierwszą parę.',
          followUpActions: [
            {
              id: 'recommendation:strengthen_lesson_mastery',
              label: 'Otworz lekcje',
              page: 'Lessons',
              query: {
                focus: 'adding',
              },
              reason: 'Powtorz lekcje: Dodawanie',
            },
          ],
          sources: [
            {
              documentId: 'doc-1',
              collectionId: 'lesson-library',
              score: 0.913,
              text: 'Dodawanie łączy liczby i tworzy sumę.',
              metadata: {
                title: 'Dodawanie podstawy',
              },
            },
          ],
        },
      ],
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

    expect(screen.getByText('Lekcja: Dodawanie')).toBeInTheDocument();
    expect(screen.getByText('Policz najpierw pierwszą parę.')).toBeInTheDocument();
    expect(screen.getByText('Kolejny krok')).toBeInTheDocument();
    expect(screen.getByText('Powtorz lekcje: Dodawanie')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=adding'
    );
    expect(screen.getByText('Zrodla')).toBeInTheDocument();
    expect(screen.getByText('Dodawanie podstawy')).toBeInTheDocument();
    expect(screen.getByText(/lesson-library · score 0\.913/i)).toBeInTheDocument();
    expect(screen.getByText(/Dodawanie łączy liczby i tworzy sumę\./)).toBeInTheDocument();
  });

  it('renders persona SVG avatars in the launcher and tutor header when available', () => {
    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-avatar-image').querySelector('svg')).not.toBeNull();
    expect(
      screen.getByTestId('kangur-ai-tutor-header-avatar-image').querySelector('svg')
    ).not.toBeNull();
  });

  it('tracks clicks on assistant follow-up actions', () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: null,
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
      isOpen: true,
      messages: [
        {
          role: 'assistant',
          content: 'Wybierz teraz kolejna lekcje.',
          followUpActions: [
            {
              id: 'recommendation:strengthen_lesson_mastery',
              label: 'Otworz lekcje',
              page: 'Lessons',
              query: {
                focus: 'adding',
              },
              reason: 'Powtorz lekcje: Dodawanie',
            },
          ],
        },
      ],
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

    fireEvent.click(screen.getByRole('link', { name: 'Otworz lekcje' }));

    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_follow_up_clicked',
      expect.objectContaining({
        surface: 'lesson',
        contentId: 'lesson-1',
        actionId: 'recommendation:strengthen_lesson_mastery',
        actionPage: 'Lessons',
        messageIndex: 0,
        hasQuery: true,
      })
    );
  });

  it('shows a selection action near highlighted text and opens anchored chat from it', async () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: null,
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

    const action = await screen.findByTestId('kangur-ai-tutor-selection-action');
    expect(action).toHaveTextContent('Zapytaj o to');
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_selection_cta_shown',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        selectionLength: 5,
      })
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));

    expect(setHighlightedTextMock).toHaveBeenCalledWith('2 + 2');
    expect(openChatMock).toHaveBeenCalledTimes(1);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_selection_cta_clicked',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        selectionLength: 5,
      })
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
        vi.advanceTimersByTime(400);
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

  it('uses a bottom-sheet layout on narrow mobile viewports', () => {
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

    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: clearSelectionMock,
    });

    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute('data-layout', 'sheet');
  });

  it('uses the selected motion preset to widen the sheet breakpoint', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 860,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 1180,
    });

    usePlaywrightPersonasMock.mockReturnValue({
      data: [
        {
          id: 'preset-tablet',
          name: 'Tablet anchor preset',
          settings: {
            headless: true,
            slowMo: 50,
            timeout: 15_000,
            navigationTimeout: 30_000,
            humanizeMouse: false,
            mouseJitter: 6,
            clickDelayMin: 30,
            clickDelayMax: 120,
            inputDelayMin: 20,
            inputDelayMax: 120,
            actionDelayMin: 200,
            actionDelayMax: 900,
            proxyEnabled: false,
            emulateDevice: true,
            deviceName: 'iPad (gen 7)',
          },
        },
      ],
    });

    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: 'preset-tablet',
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
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute('data-layout', 'sheet');
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
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
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: null,
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
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveTextContent(
      'Test: Kangur Mini'
    );
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveTextContent(
      'Pytanie 1/10'
    );
  });

  it('sends selected text as explicit tutor context metadata', async () => {
    render(<KangurAiTutorWidget />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Wpisz pytanie' }), {
      target: { value: 'Pomóż mi to zrozumieć.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));

    await waitFor(() =>
      expect(sendMessageMock).toHaveBeenCalledWith(
        'Pomóż mi to zrozumieć.',
        expect.objectContaining({
          promptMode: 'selected_text',
          selectedText: '2 + 2',
          focusKind: 'selection',
          focusId: 'selection',
        })
      )
    );
    expect(clearSelectionMock).toHaveBeenCalledTimes(1);
    expect(setHighlightedTextMock).toHaveBeenCalledWith(null);
  });

  it('exposes adaptive quick actions and tracks their usage', async () => {
    render(<KangurAiTutorWidget />);

    fireEvent.click(screen.getByRole('button', { name: 'Podpowiedz' }));

    await waitFor(() =>
      expect(sendMessageMock).toHaveBeenCalledWith(
        'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
        expect.objectContaining({
          promptMode: 'hint',
          selectedText: '2 + 2',
          focusKind: 'selection',
          interactionIntent: 'hint',
        })
      )
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_quick_action_clicked',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        action: 'hint',
        promptMode: 'hint',
        hasSelectedText: true,
      })
    );
    expect(screen.getByRole('button', { name: 'Co dalej?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ten fragment' })).toBeInTheDocument();
  });

  it('switches to review-oriented actions after revealing a test answer', async () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: null,
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
        currentQuestion: 'Ile to 2 + 2?',
        answerRevealed: true,
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

    expect(screen.getByRole('button', { name: 'Omow odpowiedz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Co poprawic?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Popros o omowienie odpowiedzi')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Omow odpowiedz' }));

    await waitFor(() =>
      expect(sendMessageMock).toHaveBeenCalledWith(
        'Omów to pytanie: co poszło dobrze, gdzie był błąd i co sprawdzić następnym razem.',
        expect.objectContaining({
          promptMode: 'explain',
          interactionIntent: 'review',
        })
      )
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_quick_action_clicked',
      expect.objectContaining({
        surface: 'test',
        title: 'Kangur Mini',
        action: 'review',
        promptMode: 'explain',
      })
    );
  });

  it('uses summary-specific actions after finishing a test', () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: null,
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
        questionProgressLabel: 'Ukończono 10/10',
        answerRevealed: true,
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

    expect(screen.getByRole('button', { name: 'Omow wynik' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Co cwiczyc?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Zapytaj o wynik lub nastepny krok')).toBeInTheDocument();
  });

  it('hides sources and selected-text affordances when parent guardrails disable them', () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        teachingAgentId: null,
        agentPersonaId: null,
        motionPresetId: null,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: false,
        allowSelectedTextSupport: false,
        dailyMessageLimit: 5,
      },
      tutorName: 'Pomocnik',
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
      },
      isOpen: true,
      messages: [
        {
          role: 'assistant',
          content: 'Policz najpierw pierwszą parę.',
          sources: [
            {
              documentId: 'doc-1',
              collectionId: 'lesson-library',
              score: 0.913,
              text: 'Dodawanie łączy liczby i tworzy sumę.',
              metadata: {
                title: 'Dodawanie podstawy',
              },
            },
          ],
        },
      ],
      isLoading: false,
      isUsageLoading: false,
      highlightedText: '2 + 2',
      usageSummary: {
        dateKey: '2026-03-07',
        messageCount: 5,
        dailyMessageLimit: 5,
        remainingMessages: 0,
      },
      openChat: vi.fn(),
      closeChat: vi.fn(),
      sendMessage: sendMessageMock,
      setHighlightedText: setHighlightedTextMock,
    });

    useKangurTextHighlightMock.mockReturnValue({
      selectedText: '2 + 2',
      selectionRect: new DOMRect(120, 180, 140, 26),
      clearSelection: clearSelectionMock,
    });

    render(<KangurAiTutorWidget />);

    expect(screen.getByText('Limit dzisiaj: 5/5')).toBeInTheDocument();
    expect(screen.getByText('Limit wyczerpany')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ten fragment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zapytaj o to' })).not.toBeInTheDocument();
    expect(screen.queryByText('Zrodla')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Podpowiedz' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Wpisz pytanie' })).toBeDisabled();
  });
});
