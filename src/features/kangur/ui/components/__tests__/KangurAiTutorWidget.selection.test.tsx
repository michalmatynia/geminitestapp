/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/shared/contracts/kangur-ai-tutor-content';

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
  SVGProps,
} from 'react';

const {
  settingsStoreMock,
  useKangurAiTutorMock,
  useKangurLoginModalMock,
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
  activateSelectionGlowMock,
  clearSelectionMock,
  clearSelectionGlowMock,
  trackKangurClientEventMock,
  useKangurPageContentEntryMock,
} = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  useKangurAiTutorMock: vi.fn(),
  useKangurLoginModalMock: vi.fn(),
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
  activateSelectionGlowMock: vi.fn().mockReturnValue(false),
  clearSelectionMock: vi.fn(),
  clearSelectionGlowMock: vi.fn(),
  trackKangurClientEventMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
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

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const Icon = (props: SVGProps<SVGSVGElement>) => <svg aria-hidden='true' {...props} />;
  return {
    ...actual,
    BrainCircuit: Icon,
    Send: Icon,
    X: Icon,
  };
});

vi.mock('next/image', () => ({
  default: ({
    alt,
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => (
    <img alt={alt} {...props} />
  ),
}));

vi.mock('../KangurAiTutorMoodAvatar', () => ({
  KangurAiTutorMoodAvatar: ({
    avatarImageUrl,
    className,
    fallbackIconClassName,
    imgClassName,
    label,
    svgClassName,
    svgContent,
    'data-testid': dataTestId,
  }: {
    avatarImageUrl?: string | null;
    className?: string;
    fallbackIconClassName?: string;
    imgClassName?: string;
    label: string;
    svgClassName?: string;
    svgContent?: string | null;
    'data-testid'?: string;
  }) => (
    <div aria-label={label} className={className} data-testid={dataTestId} role='img'>
      {avatarImageUrl ? (
        <img alt={label} className={imgClassName} src={avatarImageUrl} />
      ) : svgContent ? (
        <div className={svgClassName} dangerouslySetInnerHTML={{ __html: svgContent }} />
      ) : (
        <svg aria-hidden='true' className={fallbackIconClassName} />
      )}
    </div>
  ),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useKangurAiTutor: useKangurAiTutorMock,
  useOptionalKangurAiTutor: useKangurAiTutorMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => DEFAULT_KANGUR_AI_TUTOR_CONTENT,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: useOptionalKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: useKangurLoginModalMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTextHighlight', () => ({
  useKangurTextHighlight: useKangurTextHighlightMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
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

import { KangurAiTutorWidget } from '../KangurAiTutorWidget';

const mockWindowSelection = (node: Node, text: string) =>
  vi.spyOn(window, 'getSelection').mockReturnValue({
    anchorNode: node,
    focusNode: node,
    getRangeAt: () =>
      ({
        commonAncestorContainer: node,
      }) as Range,
    isCollapsed: false,
    rangeCount: 1,
    toString: () => text,
  } as unknown as Selection);

describe('KangurAiTutorWidget - Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoadingAuth: false,
      user: {
        id: 'user-1',
        canManageLearners: true,
      },
    });
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
    });
    useKangurLoginModalMock.mockReturnValue({
      authMode: 'sign-in',
      isOpen: false,
      openLoginModal: vi.fn(),
    });
    useReducedMotionMock.mockReturnValue(false);
    useKangurPageContentEntryMock.mockReturnValue({ entry: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a separate selection action near highlighted page text and opens from it', async () => {
    vi.useFakeTimers();
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
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
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
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(setHighlightedTextMock).toHaveBeenCalledWith('2 + 2');
    expect(activateSelectionGlowMock).toHaveBeenCalledTimes(1);
    expect(clearSelectionMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('kangur-ai-tutor-selection-action')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-ai-tutor-selection-glow')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toHaveAttribute(
      'data-selection-emphasis',
      'glow'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toHaveStyle({
      width: '160px',
      height: '46px',
    });
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeInTheDocument();
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
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveTextContent(
      'Wyjaśniam ten fragment.'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveTextContent(
      'Wyjaśniam ten fragment'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveAttribute(
      'data-entry-direction',
      'left'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveAttribute(
      'data-entry-animation',
      'fade'
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
      tutorMoodId: 'neutral',
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
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

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'guided'
    );
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-callout')).toHaveTextContent(
      'Wyjaśniam ten fragment'
    );
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
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
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
      await vi.runAllTimersAsync();
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

  
  });
