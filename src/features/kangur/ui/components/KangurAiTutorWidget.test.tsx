/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useLayoutEffect, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
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
  speechSynthesisMock,
  audioPlayMock,
  audioPauseMock,
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
  speechSynthesisMock: {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    paused: false,
    speaking: false,
  },
  audioPlayMock: vi.fn().mockResolvedValue(undefined),
  audioPauseMock: vi.fn(),
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
vi.mock('./KangurAiTutorMoodAvatar', () => ({
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
let KangurAiTutorWidget: typeof import('./KangurAiTutorWidget').KangurAiTutorWidget;
class MockSpeechSynthesisUtterance {
  text: string;
  lang = '';
  rate = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}
type TutorAuthAnchorKind =
  | 'login_action'
  | 'create_account_action'
  | 'login_identifier_field'
  | 'login_form';
type TutorGameAnchorKind =
  | 'home_actions'
  | 'home_quest'
  | 'priority_assignments'
  | 'leaderboard'
  | 'progress';
const DEFAULT_TUTOR_AUTH_ANCHOR_RECT = new DOMRect(360, 220, 340, 260);
const tutorAuthAnchorRects: Record<TutorAuthAnchorKind, DOMRect> = {
  login_action: DEFAULT_TUTOR_AUTH_ANCHOR_RECT,
  create_account_action: DEFAULT_TUTOR_AUTH_ANCHOR_RECT,
  login_identifier_field: DEFAULT_TUTOR_AUTH_ANCHOR_RECT,
  login_form: DEFAULT_TUTOR_AUTH_ANCHOR_RECT,
};
const cloneTutorAuthAnchorRect = (rect: DOMRect): DOMRect =>
  new DOMRect(rect.x, rect.y, rect.width, rect.height);
const getRectOverlapArea = (left: DOMRect, right: DOMRect): number => {
  const overlapLeft = Math.max(left.left, right.left);
  const overlapTop = Math.max(left.top, right.top);
  const overlapRight = Math.min(left.right, right.right);
  const overlapBottom = Math.min(left.bottom, right.bottom);
  const overlapWidth = Math.max(0, overlapRight - overlapLeft);
  const overlapHeight = Math.max(0, overlapBottom - overlapTop);
  return overlapWidth * overlapHeight;
};
const resetTutorAuthAnchorRects = (): void => {
  tutorAuthAnchorRects.login_action = cloneTutorAuthAnchorRect(DEFAULT_TUTOR_AUTH_ANCHOR_RECT);
  tutorAuthAnchorRects.create_account_action = cloneTutorAuthAnchorRect(
    DEFAULT_TUTOR_AUTH_ANCHOR_RECT
  );
  tutorAuthAnchorRects.login_identifier_field = cloneTutorAuthAnchorRect(
    DEFAULT_TUTOR_AUTH_ANCHOR_RECT
  );
  tutorAuthAnchorRects.login_form = cloneTutorAuthAnchorRect(DEFAULT_TUTOR_AUTH_ANCHOR_RECT);
};
const TutorAuthAnchor = ({
  kind,
  label,
  testId,
}: {
  kind: TutorAuthAnchorKind;
  label: string;
  testId: string;
}): ReactNode => {
  const ref = useRef<HTMLDivElement | null>(null);
  useKangurTutorAnchor({
    id: `kangur-auth-${kind}`,
    kind,
    ref,
    surface: 'auth',
    enabled: true,
    priority: 100,
    metadata: {
      label,
    },
  });
  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    ref.current.getBoundingClientRect = () => tutorAuthAnchorRects[kind];
  }, [kind]);
  return <div ref={ref} data-testid={testId} />;
};
const tutorGameAnchorRects: Record<TutorGameAnchorKind, DOMRect> = {
  home_actions: new DOMRect(120, 120, 420, 200),
  home_quest: new DOMRect(120, 420, 420, 180),
  priority_assignments: new DOMRect(120, 700, 420, 180),
  leaderboard: new DOMRect(120, 980, 420, 220),
  progress: new DOMRect(620, 980, 420, 220),
};
const TutorGameAnchor = ({
  kind,
  label,
  testId,
  useCoverageAnchorId = false,
}: {
  kind: TutorGameAnchorKind;
  label: string;
  testId: string;
  useCoverageAnchorId?: boolean;
}): ReactNode => {
  const ref = useRef<HTMLDivElement | null>(null);
  const coverageAnchorIds: Record<TutorGameAnchorKind, string> = {
    home_actions: 'kangur-game-home-actions',
    home_quest: 'kangur-game-home-quest',
    priority_assignments: 'kangur-game-home-assignments',
    leaderboard: 'kangur-game-home-leaderboard',
    progress: 'kangur-game-home-progress',
  };
  useKangurTutorAnchor({
    id: useCoverageAnchorId ? coverageAnchorIds[kind] : `kangur-game-${kind}`,
    kind,
    ref,
    surface: 'game',
    enabled: true,
    priority: 100,
    metadata: {
      contentId: 'game:home',
      label,
    },
  });
  useLayoutEffect(() => {
    if (!ref.current) {
      return;
    }
    ref.current.getBoundingClientRect = () => tutorGameAnchorRects[kind];
  }, [kind]);
  return <div ref={ref} data-testid={testId} />;
};
const buildTutorAnchorsTree = (
  options: {
    homeAnchorKinds?: TutorGameAnchorKind[];
    showCreateAccountAnchor?: boolean;
    useCoverageAnchorIds?: boolean;
    showLoginIdentifierAnchor?: boolean;
    showLoginAnchor?: boolean;
    showLoginFormAnchor?: boolean;
  } = {}
) => (
  <KangurTutorAnchorProvider>
    {options.showLoginAnchor ? (
      <TutorAuthAnchor kind='login_action' label='Zaloguj się' testId='kangur-auth-login-anchor' />
    ) : null}
    {options.showCreateAccountAnchor ? (
      <TutorAuthAnchor
        kind='create_account_action'
        label='Utwórz konto'
        testId='kangur-auth-create-account-anchor'
      />
    ) : null}
    {options.showLoginFormAnchor ? (
      <TutorAuthAnchor
        kind='login_form'
        label='Sekcja logowania'
        testId='kangur-auth-login-form-anchor'
      />
    ) : null}
    {options.showLoginIdentifierAnchor ? (
      <TutorAuthAnchor
        kind='login_identifier_field'
        label='Pole e-maila rodzica albo nicku ucznia'
        testId='kangur-auth-login-identifier-anchor'
      />
    ) : null}
    {options.homeAnchorKinds?.includes('home_actions') ? (
      <TutorGameAnchor
        kind='home_actions'
        label='Start i wybór aktywności'
        testId='kangur-game-home-actions-anchor'
        useCoverageAnchorId={options.useCoverageAnchorIds}
      />
    ) : null}
    {options.homeAnchorKinds?.includes('home_quest') ? (
      <TutorGameAnchor
        kind='home_quest'
        label='Misja dla ucznia'
        testId='kangur-game-home-quest-anchor'
        useCoverageAnchorId={options.useCoverageAnchorIds}
      />
    ) : null}
    {options.homeAnchorKinds?.includes('priority_assignments') ? (
      <TutorGameAnchor
        kind='priority_assignments'
        label='Priorytetowe zadania'
        testId='kangur-game-home-priority-assignments-anchor'
        useCoverageAnchorId={options.useCoverageAnchorIds}
      />
    ) : null}
    {options.homeAnchorKinds?.includes('leaderboard') ? (
      <TutorGameAnchor
        kind='leaderboard'
        label='Ranking'
        testId='kangur-game-home-leaderboard-anchor'
        useCoverageAnchorId={options.useCoverageAnchorIds}
      />
    ) : null}
    {options.homeAnchorKinds?.includes('progress') ? (
      <TutorGameAnchor
        kind='progress'
        label='Postęp gracza'
        testId='kangur-game-home-progress-anchor'
        useCoverageAnchorId={options.useCoverageAnchorIds}
      />
    ) : null}
    <KangurAiTutorWidget />
  </KangurTutorAnchorProvider>
);
const renderWithTutorAnchors = (
  options: {
    homeAnchorKinds?: TutorGameAnchorKind[];
    showCreateAccountAnchor?: boolean;
    useCoverageAnchorIds?: boolean;
    showLoginIdentifierAnchor?: boolean;
    showLoginAnchor?: boolean;
    showLoginFormAnchor?: boolean;
  } = {}
) => render(buildTutorAnchorsTree(options));

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

describe('KangurAiTutorWidget', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.sessionStorage.clear();
    resetTutorAuthAnchorRects();
    vi.doUnmock('./KangurAiTutorWidget');
    ({ KangurAiTutorWidget } = await import('./KangurAiTutorWidget'));
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: speechSynthesisMock,
    });
    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: audioPlayMock,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: audioPauseMock,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: vi.fn(),
    });
    speechSynthesisMock.speak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
      speechSynthesisMock.speaking = true;
      utterance.onstart?.();
    });
    clearSelectionMock.mockImplementation(() => undefined);
    clearSelectionGlowMock.mockImplementation(() => undefined);
    openChatMock.mockImplementation(() => undefined);
    closeChatMock.mockImplementation(() => undefined);
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === 'kangur_narrator_settings_v1') {
        return JSON.stringify({ engine: 'client', voice: 'coral' });
      }
      return undefined;
    });
    sendMessageMock.mockResolvedValue(undefined);
    useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoadingAuth: false,
      navigateToLogin: navigateToLoginMock,
    });
    useKangurLoginModalMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur',
      closeLoginModal: vi.fn(),
      dismissLoginModal: vi.fn(),
      homeHref: '/kangur',
      isOpen: false,
      isRouteDriven: false,
      openLoginModal: vi.fn(),
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
      activateSelectionGlow: activateSelectionGlowMock,
      clearSelectionGlow: clearSelectionGlowMock,
      selectionGlowSupported: false,
      selectionLineRects: [new DOMRect(120, 180, 140, 26)],
      selectedText: '2 + 2',
      selectionRect: new DOMRect(120, 180, 140, 26),
      selectionContainerRect: new DOMRect(80, 150, 520, 240),
      clearSelection: clearSelectionMock,
    });
    useKangurPageContentEntryMock.mockImplementation((entryId: string | null | undefined) => ({
      entry:
        entryId === 'game-home-progress'
          ? {
              fragments: [
                {
                  aliases: ['MISTRZOSTWO 67% 2/4 odznak'],
                  enabled: true,
                  explanation:
                    'Ta ścieżka zbiera odznaki mistrzostwa i pokazuje, ile lekcji zostało do ukończenia.',
                  id: 'badge-track-mastery',
                  nativeGuideIds: [],
                  sortOrder: 0,
                  text: '🏗️ MISTRZOSTWO 67% 2/4 odznak Budowniczy mistrzostwa · 2/3 lekcje',
                  triggerPhrases: [],
                },
              ],
              summary: 'Zobacz poziom, serie, skuteczność i najbliższe odznaki w jednym miejscu.',
              title: 'Postępy ucznia',
            }
          : null,
    }));
  }, 45_000);
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
    expect(
      screen.queryByTestId('kangur-ai-tutor-selection-guided-callout')
    ).not.toBeInTheDocument();
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

  it('keeps anonymous Zapytaj o to on the same guided-selection path even if the guest-intro check resolves mid-transition', async () => {
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
    let resolveGuestIntroPayload: ((value: { ok: true; reason: string; shouldShow: true }) => void) | null =
      null;
    const guestIntroPayloadPromise = new Promise<{ ok: true; reason: string; shouldShow: true }>(
      (resolve) => {
        resolveGuestIntroPayload = resolve;
      }
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockReturnValue(guestIntroPayloadPromise),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<KangurAiTutorWidget />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/guest-intro', {
      cache: 'no-store',
      credentials: 'same-origin',
    });

    fireEvent.mouseDown(screen.getByRole('button', { name: 'Zapytaj o to' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));

    await act(async () => {
      resolveGuestIntroPayload?.({
        ok: true,
        reason: 'first_visit',
        shouldShow: true,
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByTestId('kangur-ai-tutor-guest-intro')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-ai-tutor-guest-intro-backdrop')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'guided'
    );
    expect(screen.getByTestId('kangur-ai-tutor-surface-diagnostics')).toHaveAttribute(
      'data-guest-intro-rendered',
      'false'
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

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

    expect(screen.queryAllByTestId('kangur-ai-tutor-selection-glow')).toHaveLength(0);
    expect(screen.getAllByTestId('kangur-ai-tutor-selection-spotlight')).toHaveLength(1);
    expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toHaveStyle({
      width: '202px',
      height: '76px',
    });

    vi.clearAllTimers();
    vi.useRealTimers();
  });
    
  
        it('keeps the previous conversation hidden after the selected-fragment explanation completes', async () => {
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
      closeChat: closeChatMock,
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
    });    expect(sendMessageMock).toHaveBeenCalled();
    expect(screen.getByTestId('kangur-ai-tutor-selection-guided-answer')).toHaveTextContent(
      'Nowe wyjaśnienie fragmentu.'
    );
    expect(screen.queryByTestId('kangur-ai-tutor-selection-preview')).not.toBeInTheDocument();
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
      closeChat: closeChatMock,
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
      closeChat: closeChatMock,
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
        await vi.runAllTimersAsync();
      });      const guidedAvatarPlacement = screen
        .getByTestId('kangur-ai-tutor-avatar')
        .getAttribute('data-guidance-avatar-placement');
      expect(guidedAvatarPlacement).not.toBe('dock');
      expect(screen.queryByTestId('kangur-ai-tutor-selection-guided-callout')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kangur-ai-tutor-selection-preview')).not.toBeInTheDocument();
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
      closeChat: closeChatMock,
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
        await vi.runAllTimersAsync();
      });      expect(screen.queryByTestId('kangur-ai-tutor-selection-guided-callout')).not.toBeInTheDocument();
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
  it('keeps the selection guidance arrow anchored for highlighted test-question text', () => {
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
      closeChat: closeChatMock,
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

    const view = render(<KangurAiTutorWidget />);
    const guestIntro = await screen.findByTestId('kangur-ai-tutor-guest-intro');
    expect(guestIntro).toHaveAttribute('data-kangur-ai-tutor-root', 'true');

    const detailTextNode = screen
      .getByText('Czy chcesz pomocy z logowaniem albo założeniem konta?')
      .firstChild;
    expect(detailTextNode).not.toBeNull();

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
    renderWithTutorAnchors({ homeAnchorKinds: ['leaderboard' as const] });
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
    expect(screen.getByTestId('kangur-ai-tutor-selected-text-preview')).toHaveTextContent(
      '„2 + 2”'
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
    expect(screen.getByRole('button', { name: 'Ten fragment' })).toBeInTheDocument();
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
    expect(launcher).toHaveClass(
      'kangur-chat-floating-avatar',
      'focus-visible:ring-2'
    );
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
  it('keeps the selection spotlight scoped to the highlighted fragment inside the home progress anchor', async () => {
    vi.useFakeTimers();
    openChatMock.mockImplementation(() => undefined);
    sendMessageMock.mockImplementation(() => Promise.resolve());
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: {
        enabled: true,
        agentPersonaId: null,
        motionPresetId: null,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        allowLessons: true,
        allowGames: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      sessionContext: {
        surface: 'game',
        contentId: 'game:practice:addition',
        title: 'Podsumowanie gry',
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
      selectedText: 'Mistrzostwo 67%',
      selectionLineRects: [new DOMRect(680, 1040, 180, 26)],
      selectionRect: new DOMRect(680, 1040, 180, 26),
      selectionContainerRect: new DOMRect(620, 980, 420, 220),
      clearSelection: clearSelectionMock,
      clearSelectionGlow: clearSelectionGlowMock,
      selectionGlowSupported: false,
    });
    renderWithTutorAnchors({ homeAnchorKinds: ['progress'] });

    fireEvent.click(screen.getByRole('button', { name: 'Zapytaj o to' }));

    expect(screen.queryByTestId('kangur-ai-tutor-selection-glow')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-selection-spotlight')).toHaveStyle({
      width: '200px',
      height: '46px',
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(sendMessageMock).toHaveBeenCalledWith(
      'Wyjaśnij zaznaczony fragment krok po kroku.',
      expect.objectContaining({
        promptMode: 'selected_text',
        selectedText: 'Mistrzostwo 67%',
        focusKind: 'progress',
        focusId: 'kangur-game-progress',
        focusLabel: 'Postęp gracza',
        assignmentId: null,
      })
    );
    vi.clearAllTimers();
    vi.useRealTimers();
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
  it('routes an anonymous login question through guided login motion instead of sending chat', async () => {
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
    };
    useKangurAiTutorMock.mockImplementation(() => tutorState);
    const renderOptions = { showLoginAnchor: true };
    const view = renderWithTutorAnchors(renderOptions);
    closeChatMock.mockImplementation(() => {
      tutorState = {
        ...tutorState,
        isOpen: false,
      };
      if (view.container.isConnected) {
        view.rerender(buildTutorAnchorsTree(renderOptions));
      }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Wpisz pytanie' }), {
      target: { value: 'How do I log in?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(navigateToLoginMock).not.toHaveBeenCalled();
    expect(closeChatMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(await screen.findByTestId('kangur-ai-tutor-guided-login-help')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'guided'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-motion',
      'gentle'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'login_action'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-interaction',
      'suppressed'
    );
    expect(screen.queryByTestId('kangur-ai-tutor-guided-pointer')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-guided-arrowhead')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-guided-login-help')).toHaveAttribute(
      'data-guidance-motion',
      'gentle'
    );
    const loginTexts = screen.getAllByText('U góry kliknij „Zaloguj się”.');
    const visibleLoginText = loginTexts.find((el) => {
      try {
        expect(el).toBeVisible();
        return true;
      } catch {
        return false;
      }
    });
    expect(visibleLoginText).toBeInTheDocument();
  });
  it('routes an anonymous create-account question through guided navigation instead of sending chat', async () => {
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
    };
    useKangurAiTutorMock.mockImplementation(() => tutorState);
    const renderOptions = { showCreateAccountAnchor: true };
    const view = renderWithTutorAnchors(renderOptions);
    closeChatMock.mockImplementation(() => {
      tutorState = {
        ...tutorState,
        isOpen: false,
      };
      if (view.container.isConnected) {
        view.rerender(buildTutorAnchorsTree(renderOptions));
      }
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Wpisz pytanie' }), {
      target: { value: 'I don\'t have an account yet. How do I create one?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij' }));
    expect(navigateToLoginMock).not.toHaveBeenCalled();
    expect(closeChatMock).toHaveBeenCalledTimes(1);
    expect(sendMessageMock).not.toHaveBeenCalled();
    expect(await screen.findByTestId('kangur-ai-tutor-guided-login-help')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'guided'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-motion',
      'gentle'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-target',
      'create_account_action'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-guidance-interaction',
      'suppressed'
    );
    expect(screen.queryByTestId('kangur-ai-tutor-guided-pointer')).not.toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-guided-arrowhead')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-guided-login-help')).toHaveAttribute(
      'data-guidance-motion',
      'gentle'
    );
    const createAccountTexts = screen.getAllByText('U góry kliknij „Utwórz konto”.');
    const visibleCreateAccountText = createAccountTexts.find((el) => {
      try {
        expect(el).toBeVisible();
        return true;
      } catch {
        return false;
      }
    });
    expect(visibleCreateAccountText).toBeInTheDocument();
  });
  it('exposes adaptive quick actions and tracks their usage', async () => {
    render(<KangurAiTutorWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'Podpowiedź' }));
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
  it('promotes a lesson-to-training bridge quick action after a completed tutor lesson follow-up', async () => {
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
      tutorMoodId: 'neutral',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'lesson',
        contentId: 'lesson-adding',
        title: 'Dodawanie',
      },
      learnerMemory: {
        lastRecommendedAction: 'Completed follow-up: Otwórz lekcję: Powtórz lekcję: Dodawanie',
        lastSuccessfulIntervention:
          'The learner completed the tutor follow-up Otwórz lekcję for Powtórz lekcję: Dodawanie on Lessons.',
        lastCoachingMode: 'next_best_action',
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
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Neutralny nastroj.',
    });
    render(<KangurAiTutorWidget />);
    expect(screen.getByRole('button', { name: 'Po lekcji: trening' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-ai-tutor-bridge-chip')).toHaveTextContent('Most: po lekcji');
    expect(screen.getByTestId('kangur-ai-tutor-bridge-chip')).toHaveAttribute(
      'data-bridge-action-id',
      'bridge-to-game'
    );
    expect(screen.getByTestId('kangur-ai-tutor-bridge-chip')).toHaveClass(
      '[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
    );
    expect(screen.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveTextContent(
      'Po lekcji: trening'
    );
    expect(screen.getByTestId('kangur-ai-tutor-mood-description')).toHaveTextContent(
      'Masz już wykonany poprzedni krok. Zapytaj o jeden konkretny trening po tej lekcji.'
    );
    expect(screen.getByPlaceholderText('Zapytaj o trening po tej lekcji')).toBeInTheDocument();
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_proactive_nudge_shown',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        actionId: 'bridge-to-game',
        bridgeActionId: 'bridge-to-game',
        isBridgeAction: true,
      })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Po lekcji: trening' }));
    await waitFor(() =>
      expect(sendMessageMock).toHaveBeenCalledWith(
        'Pomóż mi wybrać jeden konkretny trening po tej lekcji: Dodawanie.',
        expect.objectContaining({
          promptMode: 'chat',
          interactionIntent: 'next_step',
        })
      )
    );
    expect(trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_quick_action_clicked',
      expect.objectContaining({
        surface: 'lesson',
        title: 'Dodawanie',
        action: 'bridge-to-game',
        promptMode: 'chat',
        bridgeActionId: 'bridge-to-game',
        isBridgeAction: true,
      })
    );
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
    expect(screen.getByTestId('kangur-ai-tutor-proactive-nudge')).toHaveTextContent('Ten fragment');
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
    expect(screen.getByRole('button', { name: 'Omów odpowiedź' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Co poprawić?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Poproś o omówienie odpowiedzi')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Omów odpowiedź' }));
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
    expect(screen.getByRole('button', { name: 'Podpowiedź' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jak myśleć?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Poproś o wskazówkę do pytania')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Podpowiedź' }));
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
    expect(screen.getByRole('button', { name: 'Jak myśleć dalej?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inny trop' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Jak myśleć dalej?' }));
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
    expect(screen.getByRole('button', { name: 'Omów wynik' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Co ćwiczyć?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Zapytaj o wynik lub następny krok')).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Ten fragment' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Zapytaj o to' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Podpowiedź' })).toBeDisabled();
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
