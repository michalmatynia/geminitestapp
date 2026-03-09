/**
 * @vitest-environment jsdom
 */

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
} from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useKangurAiTutorMock,
  useOptionalKangurAuthMock,
  useKangurTextHighlightMock,
  useOptionalKangurRoutingMock,
  useReducedMotionMock,
  sendMessageMock,
  openChatMock,
  closeChatMock,
  recordFollowUpCompletionMock,
  navigateToLoginMock,
  setHighlightedTextMock,
  clearSelectionMock,
  trackKangurClientEventMock,
} = vi.hoisted(() => ({
  useKangurAiTutorMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
  useKangurTextHighlightMock: vi.fn(),
  useOptionalKangurRoutingMock: vi.fn(),
  useReducedMotionMock: vi.fn(),
  sendMessageMock: vi.fn(),
  openChatMock: vi.fn(),
  closeChatMock: vi.fn(),
  recordFollowUpCompletionMock: vi.fn(),
  navigateToLoginMock: vi.fn(),
  setHighlightedTextMock: vi.fn(),
  clearSelectionMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: useReducedMotionMock,
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

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => <img alt={alt} {...props} />,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutor: useKangurAiTutorMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: useOptionalKangurAuthMock,
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
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    scroll: _scroll,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  trackKangurClientEvent: trackKangurClientEventMock,
}));

import { KangurAiTutorWidget } from './KangurAiTutorWidget';

describe('KangurAiTutorWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.sessionStorage.clear();

    Element.prototype.scrollIntoView = vi.fn();
    sendMessageMock.mockResolvedValue(undefined);
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoadingAuth: false,
      navigateToLogin: navigateToLoginMock,
    });
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
    useReducedMotionMock.mockReturnValue(false);

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
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
    });

    useKangurTextHighlightMock.mockReturnValue({
      selectedText: '2 + 2',
      selectionRect: new DOMRect(120, 180, 140, 26),
      selectionContainerRect: new DOMRect(80, 150, 520, 240),
      clearSelection: clearSelectionMock,
    });
  });

  it('shows the guest intro prompt for a first anonymous visit and stores a local marker', async () => {
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      navigateToLogin: navigateToLoginMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
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
      tutorBehaviorMoodDescription: 'Neutralny nastroj.',
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ok: true,
        shouldShow: true,
        reason: 'first_visit',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurAiTutorWidget />);

    expect(await screen.findByTestId('kangur-ai-tutor-guest-intro')).toBeInTheDocument();
    expect(screen.getByText('Do you need help with the website?')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'No' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/guest-intro', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
    expect(
      JSON.parse(window.localStorage.getItem('kangur-ai-tutor-guest-intro-v1') ?? '{}')
    ).toEqual(
      expect.objectContaining({
        status: 'shown',
        version: 1,
      })
    );
  });

  it('does not request the guest intro when a local suppression record already exists', () => {
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      navigateToLogin: navigateToLoginMock,
    });
    window.localStorage.setItem(
      'kangur-ai-tutor-guest-intro-v1',
      JSON.stringify({
        status: 'dismissed',
        version: 1,
        updatedAt: '2026-03-08T10:00:00.000Z',
      })
    );
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
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
      tutorBehaviorMoodDescription: 'Neutralny nastroj.',
    });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurAiTutorWidget />);

    expect(screen.queryByTestId('kangur-ai-tutor-guest-intro')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the guest intro on every anonymous page entry when admin repeat mode is enabled', async () => {
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      navigateToLogin: navigateToLoginMock,
    });
    window.localStorage.setItem(
      'kangur-ai-tutor-guest-intro-v1',
      JSON.stringify({
        status: 'dismissed',
        version: 1,
        updatedAt: '2026-03-08T10:00:00.000Z',
      })
    );
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
    });
    useKangurAiTutorMock.mockReturnValue({
      enabled: false,
      appSettings: {
        agentPersonaId: null,
        motionPresetId: null,
        dailyMessageLimit: null,
        guestIntroMode: 'every_visit',
      },
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
      setHighlightedText: setHighlightedTextMock,
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Neutralny nastroj.',
    });

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurAiTutorWidget />);

    expect(await screen.findByTestId('kangur-ai-tutor-guest-intro')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This helper appears on every anonymous page entry while AI Tutor onboarding is enabled.'
      )
    ).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      JSON.parse(window.localStorage.getItem('kangur-ai-tutor-guest-intro-v1') ?? '{}')
    ).toEqual(
      expect.objectContaining({
        status: 'shown',
        version: 1,
      })
    );
  });

  it('opens the guest assistance card after accepting the intro and exposes login actions', async () => {
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      navigateToLogin: navigateToLoginMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
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
      setHighlightedText: setHighlightedTextMock,
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Neutralny nastroj.',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ok: true,
          shouldShow: true,
          reason: 'first_visit',
        }),
      })
    );

    render(<KangurAiTutorWidget />);

    fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));

    expect(await screen.findByTestId('kangur-ai-tutor-guest-assistance')).toBeInTheDocument();
    expect(
      JSON.parse(window.localStorage.getItem('kangur-ai-tutor-guest-intro-v1') ?? '{}')
    ).toEqual(
      expect.objectContaining({
        status: 'accepted',
        version: 1,
      })
    );

    expect(screen.getByRole('button', { name: 'Open login' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create parent account' }));

    expect(navigateToLoginMock).toHaveBeenNthCalledWith(1, {
      authMode: 'create-account',
    });
  });

  it('hides the guest intro after selecting No', async () => {
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      navigateToLogin: navigateToLoginMock,
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
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
      setHighlightedText: setHighlightedTextMock,
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Neutralny nastroj.',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          ok: true,
          shouldShow: true,
          reason: 'first_visit',
        }),
      })
    );

    render(<KangurAiTutorWidget />);

    fireEvent.click(await screen.findByRole('button', { name: 'No' }));

    await waitFor(() => {
      expect(screen.queryByTestId('kangur-ai-tutor-guest-intro')).not.toBeInTheDocument();
    });
    expect(
      JSON.parse(window.localStorage.getItem('kangur-ai-tutor-guest-intro-v1') ?? '{}')
    ).toEqual(
      expect.objectContaining({
        status: 'dismissed',
        version: 1,
      })
    );
  });

  it('renders the active Kangur context and assistant sources', () => {
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
      tutorMoodId: 'encouraging',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><path d="M18 58 Q50 24 82 58" fill="none" stroke="#ffffff" stroke-width="8" /></svg>',
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
          content: 'Policz najpierw pierwszą parę.',
          coachingFrame: {
            mode: 'hint_ladder',
            label: 'Jeden trop',
            description:
              'Daj tylko jeden maly krok albo pytanie kontrolne, bez pelnego rozwiazania.',
            rationale: 'Uczen jest w trakcie proby, wiec tutor powinien prowadzic bardzo malymi krokami.',
          },
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
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
    });

    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: clearSelectionMock,
    });

    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-header')).toHaveClass(
      'bg-gradient-to-r',
      'from-amber-300',
      'via-orange-400',
      'to-orange-500'
    );
    expect(screen.getByRole('button', { name: 'Zamknij' })).toHaveClass('cursor-pointer');
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveClass('cursor-pointer');
    expect(screen.getByText('Lekcja: Dodawanie')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-coaching-frame')).toHaveAttribute(
      'data-coaching-mode',
      'hint_ladder'
    );
    expect(screen.getByText('Jeden trop')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Daj tylko jeden maly krok albo pytanie kontrolne, bez pelnego rozwiazania.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Policz najpierw pierwszą parę.')).toBeInTheDocument();
    expect(screen.getByText('Kolejny krok')).toBeInTheDocument();
    expect(screen.getByText('Powtorz lekcje: Dodawanie')).toBeInTheDocument();
    expect(screen.getByText('Powtorz lekcje: Dodawanie').parentElement).toHaveClass(
      'border-amber-100',
      'bg-amber-50/70'
    );
    expect(screen.getByRole('link', { name: 'Otworz lekcje' })).toHaveAttribute(
      'href',
      '/kangur/lessons?focus=adding'
    );
    expect(screen.getByText('Zrodla')).toBeInTheDocument();
    expect(screen.getByText('Dodawanie podstawy')).toBeInTheDocument();
    expect(screen.getByText(/lesson-library · score 0\.913/i)).toBeInTheDocument();
    expect(screen.getByText(/Dodawanie łączy liczby i tworzy sumę\./)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Wpisz pytanie' })).toHaveClass(
      'focus:border-amber-300',
      'focus:ring-amber-200/70'
    );
  });

  it('renders persona SVG avatars in the launcher and tutor header when available', () => {
    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-avatar-image').querySelector('svg')).not.toBeNull();
    expect(
      screen.getByTestId('kangur-ai-tutor-header-avatar-image').querySelector('svg')
    ).not.toBeNull();
  });

  it('shows the learner-specific tutor mood in the modal header without depending on avatar changes', () => {
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
      tutorBehaviorMoodId: 'supportive',
      tutorBehaviorMoodLabel: 'Wspierajacy',
      tutorBehaviorMoodDescription: 'Tutor aktywnie podtrzymuje ucznia w biezacej probie.',
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

    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-mood-chip')).toHaveTextContent(
      'Nastroj: Wspierajacy'
    );
    expect(screen.getByTestId('kangur-ai-tutor-mood-chip')).toHaveAttribute(
      'data-mood-id',
      'supportive'
    );
    expect(screen.getByTestId('kangur-ai-tutor-mood-description')).toHaveTextContent(
      'Tutor aktywnie podtrzymuje ucznia w biezacej probie.'
    );
    expect(screen.getByTestId('kangur-ai-tutor-header-avatar-image')).toBeInTheDocument();
  });

  it('renders the tutor avatar from the uploaded image url when one is available', () => {
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
      tutorAvatarSvg: null,
      tutorAvatarImageUrl: '/uploads/agentcreator/personas/persona-1/neutral/avatar.png',
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

    render(<KangurAiTutorWidget />);

    expect(screen.getByAltText('Pomocnik avatar (neutral)')).toHaveAttribute(
      'src',
      '/uploads/agentcreator/personas/persona-1/neutral/avatar.png'
    );
  });

  it('renders user messages in the warm orange tutor bubble instead of the old indigo bubble', () => {
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
          role: 'user',
          content: 'Jak mam to policzyc?',
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

    expect(screen.getByText('Jak mam to policzyc?')).toHaveClass(
      'border-orange-400',
      'bg-gradient-to-br',
      'from-orange-400',
      'to-amber-500'
    );
  });

  it('tracks clicks on assistant follow-up actions', () => {
    window.history.pushState({}, '', '/kangur/lesson-1');

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
    expect(
      JSON.parse(window.sessionStorage.getItem('kangur-ai-tutor-widget-v1') ?? '{}')
    ).toMatchObject({
      pendingFollowUp: {
        actionId: 'recommendation:strengthen_lesson_mastery',
        actionLabel: 'Otworz lekcje',
        actionReason: 'Powtorz lekcje: Dodawanie',
        actionPage: 'Lessons',
        pathname: '/kangur/lessons',
        search: '?focus=adding',
        sourcePathname: '/kangur/lesson-1',
      },
    });
  });

  it('tracks tutor follow-up completion after landing on the suggested route', async () => {
    window.sessionStorage.setItem(
      'kangur-ai-tutor-widget-v1',
      JSON.stringify({
        pendingFollowUp: {
          version: 1,
          href: '/kangur/lessons?focus=adding',
          pathname: '/kangur/lessons',
          search: '?focus=adding',
          actionId: 'recommendation:strengthen_lesson_mastery',
          actionLabel: 'Otworz lekcje',
          actionReason: 'Powtorz lekcje: Dodawanie',
          actionPage: 'Lessons',
          messageIndex: 0,
          hasQuery: true,
          sourceSurface: 'lesson',
          sourceContentId: 'lesson-1',
          sourceTitle: 'Dodawanie',
          sourcePathname: '/kangur/lesson-1',
          sourceSearch: '',
          createdAt: new Date().toISOString(),
        },
      })
    );
    window.history.pushState({}, '', '/kangur/lessons?focus=adding');
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons?focus=adding',
    });

    const { rerender } = render(<KangurAiTutorWidget />);

    await waitFor(() =>
      expect(trackKangurClientEventMock).toHaveBeenCalledWith(
        'kangur_ai_tutor_follow_up_completed',
        expect.objectContaining({
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
          actionId: 'recommendation:strengthen_lesson_mastery',
          actionPage: 'Lessons',
          messageIndex: 0,
          hasQuery: true,
          targetPath: '/kangur/lessons',
          targetSearch: '?focus=adding',
          pageKey: 'Lessons',
        })
      )
    );
    expect(recordFollowUpCompletionMock).toHaveBeenCalledWith({
      actionId: 'recommendation:strengthen_lesson_mastery',
      actionLabel: 'Otworz lekcje',
      actionReason: 'Powtorz lekcje: Dodawanie',
      actionPage: 'Lessons',
      targetPath: '/kangur/lessons',
      targetSearch: '?focus=adding',
    });
    expect(
      JSON.parse(window.sessionStorage.getItem('kangur-ai-tutor-widget-v1') ?? '{}')
    ).not.toHaveProperty('pendingFollowUp');

    rerender(<KangurAiTutorWidget />);

    await waitFor(() =>
      expect(
        trackKangurClientEventMock.mock.calls.filter(
          ([eventName]) => eventName === 'kangur_ai_tutor_follow_up_completed'
        )
      ).toHaveLength(1)
    );
  });

  it('tracks learner feedback on assistant replies and locks the controls after submission', () => {
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
      isOpen: true,
      messages: [
        {
          role: 'assistant',
          content: 'Sprobuj najpierw policzyc dziesiatke.',
          coachingFrame: {
            mode: 'hint_ladder',
            label: 'Jeden trop',
            description: 'Daj tylko jeden maly krok.',
          },
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

    fireEvent.click(screen.getByTestId('kangur-ai-tutor-feedback-helpful-0'));

    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_feedback_submitted',
      expect.objectContaining({
        surface: 'lesson',
        contentId: 'lesson-1',
        feedback: 'helpful',
        messageIndex: 0,
        coachingMode: 'hint_ladder',
        hasFollowUpActions: false,
        hasSources: false,
      })
    );
    expect(screen.getByTestId('kangur-ai-tutor-feedback-helpful-0')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('kangur-ai-tutor-feedback-helpful-0')).toBeDisabled();
    expect(screen.getByTestId('kangur-ai-tutor-feedback-not-helpful-0')).toBeDisabled();
    expect(screen.getByTestId('kangur-ai-tutor-feedback-status-0')).toHaveTextContent(
      'Dzieki. To pomaga dopasowac kolejne odpowiedzi tutora.'
    );
  });

  it('shows a selection action near highlighted text and opens anchored chat from it', async () => {
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

    const action = await screen.findByTestId('kangur-ai-tutor-selection-action');
    expect(action).toHaveTextContent('Zapytaj o to');
    expect(screen.getByRole('button', { name: 'Zapytaj o to' })).toHaveClass(
      'kangur-cta-pill',
      'primary-cta',
      'focus-visible:ring-amber-300/70'
    );
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

  it('treats launcher opens with an active lesson selection as selection-mode opens', () => {
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

    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveClass('cursor-pointer');
    fireEvent.mouseDown(screen.getByTestId('kangur-ai-tutor-avatar'));
    fireEvent.click(screen.getByTestId('kangur-ai-tutor-avatar'));

    expect(openChatMock).toHaveBeenCalledTimes(1);
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_opened',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        reason: 'selection',
        hasSelectedText: true,
        messageCount: 0,
      })
    );
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

  it('keeps the tutor open when the user interacts inside the tutor bubble', () => {
    render(<KangurAiTutorWidget />);

    fireEvent.pointerDown(screen.getByTestId('kangur-ai-tutor-panel'));

    expect(closeChatMock).not.toHaveBeenCalled();
  });

  it('preserves the selection context while the tutor stays open after the live dom selection clears', () => {
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
      selectionRect: null,
      clearSelection: clearSelectionMock,
    });

    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveTextContent('"2 + 2"');
    expect(screen.getByRole('button', { name: 'Ten fragment' })).toBeInTheDocument();
    expect(setHighlightedTextMock).not.toHaveBeenCalledWith(null);
  });

  it('keeps the tutor docked in static ui mode while preserving selection context', () => {
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'static',
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
      selectedText: '2 + 2',
      selectionRect: new DOMRect(120, 180, 140, 26),
      clearSelection: clearSelectionMock,
    });

    render(<KangurAiTutorWidget />);

    expect(screen.queryByTestId('kangur-ai-tutor-avatar')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute('data-ui-mode', 'static');
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute('data-layout', 'bubble');
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-avatar-placement',
      'hidden'
    );
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute('data-has-pointer', 'false');
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-open-animation',
      'fade'
    );
    expect(screen.getByTestId('kangur-ai-tutor-focus-chip')).toHaveTextContent('Fragment lekcji');
    expect(screen.getByRole('button', { name: 'Ten fragment' })).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-ai-tutor-pointer')).not.toBeInTheDocument();
  });

  it('attaches the anchored tutor launcher to the open panel instead of rendering it as a separate floater', () => {
    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'attached'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-attachment-side',
      'left'
    );
    expect(screen.getByTestId('kangur-ai-tutor-pointer')).toHaveAttribute(
      'data-pointer-side',
      'left'
    );
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-avatar-placement',
      'attached'
    );
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute('data-has-pointer', 'true');
  });

  it('launches the anchored tutor from the dock and prefers empty space beside the highlighted lesson block', () => {
    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-launch-origin',
      'dock-bottom-right'
    );
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-open-animation',
      'dock-launch'
    );
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-placement-strategy',
      'right'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-attachment-side',
      'left'
    );
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-pointer-side',
      'left'
    );
    expect(screen.getByTestId('kangur-ai-tutor-pointer')).toHaveAttribute(
      'data-pointer-side',
      'left'
    );
  });

  it('switches the anchored tutor to the left side when the highlighted block occupies the right edge', () => {
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: '2 + 2',
      selectionRect: new DOMRect(980, 180, 140, 26),
      selectionContainerRect: new DOMRect(720, 140, 500, 260),
      clearSelection: clearSelectionMock,
    });

    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-placement-strategy',
      'left'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-attachment-side',
      'right'
    );
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-pointer-side',
      'right'
    );
    expect(screen.getByTestId('kangur-ai-tutor-pointer')).toHaveAttribute(
      'data-pointer-side',
      'right'
    );
  });

  it('switches the tutor chrome into reduced-motion behavior when the user prefers less motion', () => {
    useReducedMotionMock.mockReturnValue(true);

    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-motion-behavior',
      'reduced'
    );
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-motion-behavior',
      'reduced'
    );
  });

  it('styles the tutor launcher with the orange cta chrome instead of the old purple tint', () => {
    render(<KangurAiTutorWidget />);

    const launcher = screen.getByTestId('kangur-ai-tutor-avatar');

    expect(launcher).toHaveClass(
      'bg-gradient-to-br',
      'from-amber-300',
      'via-orange-400',
      'to-orange-500',
      'focus-visible:ring-amber-300/70'
    );
    expect(launcher).not.toHaveClass('from-indigo-500', 'via-fuchsia-500', 'focus-visible:ring-indigo-400');
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
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-open-animation',
      'sheet'
    );
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute('data-has-pointer', 'false');
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'attached'
    );
    expect(screen.queryByTestId('kangur-ai-tutor-pointer')).not.toBeInTheDocument();
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

  it('uses the selected local motion preset to widen the sheet breakpoint', () => {
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

    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: 'tablet',
        uiMode: 'anchored',
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
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute('data-layout', 'sheet');
    expect(screen.getByTestId('kangur-ai-tutor-panel')).toHaveAttribute(
      'data-motion-preset',
      'tablet'
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
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveTextContent(
      'Test: Kangur Mini'
    );
    expect(screen.getByTestId('kangur-ai-tutor-context-switch')).toHaveTextContent(
      'Pytanie 1/10'
    );
  });

  it('restores the context-switch notice after remount using the persisted session key', () => {
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

  it('sends selected text as explicit tutor context metadata', async () => {
    render(<KangurAiTutorWidget />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Wpisz pytanie' }), {
      target: { value: 'Pomóż mi to zrozumieć.' },
    });
    const sendButton = screen.getByRole('button', { name: 'Wyślij' });
    expect(sendButton).toHaveClass(
      'kangur-cta-pill',
      'primary-cta',
      'focus-visible:ring-amber-300/70'
    );

    fireEvent.click(sendButton);

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

  it('shows a proactive tutor nudge and routes it through the quick-action send flow', async () => {
    render(<KangurAiTutorWidget />);

    expect(screen.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveAttribute(
      'data-nudge-mode',
      'gentle'
    );
    expect(screen.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveTextContent(
      'Sugerowany pierwszy krok'
    );
    expect(screen.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveTextContent(
      'Ten fragment'
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_proactive_nudge_shown',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        nudgeMode: 'gentle',
        actionId: 'selected-text',
      })
    );

    fireEvent.click(screen.getByTestId('kangur-ai-tutor-proactive-nudge-button'));

    await waitFor(() =>
      expect(sendMessageMock).toHaveBeenCalledWith(
        'Wytłumacz ten zaznaczony fragment prostymi słowami.',
        expect.objectContaining({
          promptMode: 'selected_text',
          selectedText: '2 + 2',
          focusKind: 'selection',
          interactionIntent: 'explain',
        })
      )
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_quick_action_clicked',
      expect.objectContaining({
        source: 'proactive_nudge',
        action: 'selected-text',
        promptMode: 'selected_text',
      })
    );
  });

  it('hides proactive tutor nudges when parent settings turn them off', () => {
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
        hintDepth: 'guided',
        proactiveNudges: 'off',
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

    render(<KangurAiTutorWidget />);

    expect(screen.queryByTestId('kangur-ai-tutor-proactive-nudge')).not.toBeInTheDocument();
  });

  it('switches to review-oriented actions after revealing a test answer', async () => {
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

  it('uses question-oriented actions on the game surface', async () => {
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
        surface: 'game',
        contentId: 'game',
        title: 'Pytanie do rozwiazania',
        currentQuestion: 'Ile to 8 + 5?',
        questionProgressLabel: 'Pytanie 2/10',
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

    expect(screen.getByRole('button', { name: 'Podpowiedz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jak myslec?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Popros o wskazowke do pytania')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Podpowiedz' }));

    await waitFor(() =>
      expect(sendMessageMock).toHaveBeenCalledWith(
        'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
        expect.objectContaining({
          promptMode: 'hint',
          interactionIntent: 'hint',
        })
      )
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_quick_action_clicked',
      expect.objectContaining({
        surface: 'game',
        title: 'Pytanie do rozwiazania',
        action: 'hint',
        promptMode: 'hint',
      })
    );
  });

  it('adapts question quick actions after a previous hint ladder response', async () => {
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
        surface: 'game',
        contentId: 'game',
        title: 'Pytanie do rozwiazania',
        currentQuestion: 'Ile to 8 + 5?',
        questionProgressLabel: 'Pytanie 2/10',
      },
      isOpen: true,
      messages: [
        {
          role: 'assistant',
          content: 'Najpierw rozbij liczbe 5 na mniejsze kroki.',
          coachingFrame: {
            mode: 'hint_ladder',
            label: 'Jeden trop',
            description: 'Daj tylko jeden maly krok.',
          },
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

    expect(screen.getByRole('button', { name: 'Jak myslec dalej?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inny trop' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Jak myslec dalej?' }));

    await waitFor(() =>
      expect(sendMessageMock).toHaveBeenCalledWith(
        'Pomóż mi sprawdzić tok myślenia krok po kroku, bez podawania odpowiedzi.',
        expect.objectContaining({
          promptMode: 'explain',
          interactionIntent: 'explain',
        })
      )
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_quick_action_clicked',
      expect.objectContaining({
        surface: 'game',
        title: 'Pytanie do rozwiazania',
        action: 'how-think',
        promptMode: 'explain',
      })
    );
  });

  it('uses summary-specific actions after finishing a test', () => {
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
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
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
    expect(screen.getByText('Limit wyczerpany')).toHaveClass('text-amber-700');
    expect(screen.getByText('Limit dzisiaj: 5/5').parentElement?.parentElement).toHaveClass(
      'border-amber-100',
      'bg-amber-50/80'
    );
    expect(screen.queryByRole('button', { name: 'Ten fragment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zapytaj o to' })).not.toBeInTheDocument();
    expect(screen.queryByText('Zrodla')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Podpowiedz' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Wpisz pytanie' })).toHaveClass(
      'focus:border-amber-300',
      'focus:ring-amber-200/70'
    );
    expect(screen.getByRole('textbox', { name: 'Wpisz pytanie' })).toBeDisabled();
  });

  it('tracks quota exhaustion once when the daily tutor limit is fully consumed', () => {
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
        dailyMessageLimit: 5,
      },
      tutorName: 'Pomocnik',
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
      usageSummary: {
        dateKey: '2026-03-07',
        messageCount: 5,
        dailyMessageLimit: 5,
        remainingMessages: 0,
      },
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

    const { rerender } = render(<KangurAiTutorWidget />);

    rerender(<KangurAiTutorWidget />);

    const quotaEvents = trackKangurClientEventMock.mock.calls.filter(
      ([name]) => name === 'kangur_ai_tutor_quota_exhausted'
    );
    expect(quotaEvents).toHaveLength(1);
    expect(quotaEvents[0]?.[1]).toEqual(
      expect.objectContaining({
        surface: 'lesson',
        contentId: 'lesson-1',
        dateKey: '2026-03-07',
        messageCount: 5,
        dailyMessageLimit: 5,
        remainingMessages: 0,
      })
    );
  });
});
