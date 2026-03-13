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
}: {
  kind: TutorGameAnchorKind;
  label: string;
  testId: string;
}): ReactNode => {
  const ref = useRef<HTMLDivElement | null>(null);
  useKangurTutorAnchor({
    id: `kangur-game-${kind}`,
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
      />
    ) : null}
    {options.homeAnchorKinds?.includes('home_quest') ? (
      <TutorGameAnchor
        kind='home_quest'
        label='Misja dla ucznia'
        testId='kangur-game-home-quest-anchor'
      />
    ) : null}
    {options.homeAnchorKinds?.includes('priority_assignments') ? (
      <TutorGameAnchor
        kind='priority_assignments'
        label='Priorytetowe zadania'
        testId='kangur-game-home-priority-assignments-anchor'
      />
    ) : null}
    {options.homeAnchorKinds?.includes('leaderboard') ? (
      <TutorGameAnchor
        kind='leaderboard'
        label='Ranking'
        testId='kangur-game-home-leaderboard-anchor'
      />
    ) : null}
    {options.homeAnchorKinds?.includes('progress') ? (
      <TutorGameAnchor
        kind='progress'
        label='Postęp gracza'
        testId='kangur-game-home-progress-anchor'
      />
    ) : null}
    <KangurAiTutorWidget />
  </KangurTutorAnchorProvider>
);

const renderWithTutorAnchors = (
  options: {
    homeAnchorKinds?: TutorGameAnchorKind[];
    showCreateAccountAnchor?: boolean;
    showLoginIdentifierAnchor?: boolean;
    showLoginAnchor?: boolean;
    showLoginFormAnchor?: boolean;
  } = {}
) => render(buildTutorAnchorsTree(options));

describe('KangurAiTutorWidget - Onboarding', () => {
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('walks through the full Game home onboarding and persists completion', async () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });
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
        allowGames: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'game',
        contentId: 'game:home',
        title: 'Ekran startowy',
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
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
    });
    renderWithTutorAnchors({
      homeAnchorKinds: [
        'home_actions',
        'home_quest',
        'priority_assignments',
        'leaderboard',
        'progress',
      ],
    });
    expect(await screen.findByTestId('kangur-ai-tutor-home-onboarding')).toBeInTheDocument();
    expect(screen.getByText('Krok 1 z 5')).toBeVisible();
    expect(screen.getByText('Tutaj wybierasz, jak chcesz zacząć.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Rozumiem' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Zakończ' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    expect(await screen.findByText('Krok 2 z 5')).toBeVisible();
    expect(screen.getByText('Tutaj pojawia się Twoja aktualna misja.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    expect(await screen.findByText('Krok 3 z 5')).toBeVisible();
    expect(screen.getByText('Tutaj znajdziesz zadania od rodzica.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    expect(await screen.findByText('Krok 4 z 5')).toBeVisible();
    expect(screen.getByText('Tutaj widzisz ranking.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    expect(await screen.findByText('Krok 5 z 5')).toBeVisible();
    expect(screen.getByText('Tutaj śledzisz swój postęp.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    await waitFor(() => {
      expect(screen.queryByTestId('kangur-ai-tutor-home-onboarding')).not.toBeInTheDocument();
    });
    expect(
      JSON.parse(window.localStorage.getItem('kangur-ai-tutor-home-onboarding-v1') ?? '{}')
    ).toEqual(
      expect.objectContaining({
        status: 'completed',
        version: 1,
      })
    );
  }, 45_000);

  it('ends the Game home onboarding early and docks the tutor back to the launcher', async () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });
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
        allowGames: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'game',
        contentId: 'game:home',
        title: 'Ekran startowy',
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
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
    });
    renderWithTutorAnchors({
      homeAnchorKinds: [
        'home_actions',
        'home_quest',
        'priority_assignments',
        'leaderboard',
        'progress',
      ],
    });
    expect(await screen.findByTestId('kangur-ai-tutor-home-onboarding')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zakończ' }));
    await waitFor(() => {
      expect(screen.queryByTestId('kangur-ai-tutor-home-onboarding')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-avatar-placement',
      'floating'
    );
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute(
      'data-anchor-kind',
      'dock'
    );
    expect(closeChatMock).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(window.localStorage.getItem('kangur-ai-tutor-home-onboarding-v1') ?? '{}')
    ).toEqual(
      expect.objectContaining({
        status: 'dismissed',
        version: 1,
      })
    );
  });

  it('does not auto-open the Game home onboarding once it was dismissed locally', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
    });
    window.localStorage.setItem(
      'kangur-ai-tutor-home-onboarding-v1',
      JSON.stringify({
        status: 'dismissed',
        version: 1,
        updatedAt: '2026-03-10T10:00:00.000Z',
      })
    );
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
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'game',
        contentId: 'game:home',
        title: 'Ekran startowy',
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
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
    });
    renderWithTutorAnchors({
      homeAnchorKinds: ['home_actions', 'home_quest', 'leaderboard', 'progress'],
    });
    expect(screen.queryByTestId('kangur-ai-tutor-home-onboarding')).not.toBeInTheDocument();
  });

  it('shows the Game home onboarding on every eligible entry when admin repeat mode is enabled', async () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
    });
    window.localStorage.setItem(
      'kangur-ai-tutor-home-onboarding-v1',
      JSON.stringify({
        status: 'dismissed',
        version: 1,
        updatedAt: '2026-03-10T10:00:00.000Z',
      })
    );
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      appSettings: {
        agentPersonaId: null,
        motionPresetId: null,
        dailyMessageLimit: null,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'every_visit',
      },
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
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'game',
        contentId: 'game:home',
        title: 'Ekran startowy',
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
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
    });
    renderWithTutorAnchors({
      homeAnchorKinds: ['home_actions', 'home_quest', 'leaderboard', 'progress'],
    });
    expect(await screen.findByTestId('kangur-ai-tutor-home-onboarding')).toBeInTheDocument();
    expect(screen.getByText('Krok 1 z 4')).toBeVisible();
  });

  it('does not auto-open the Game home onboarding when admin mode is manual only', () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
    });
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      appSettings: {
        agentPersonaId: null,
        motionPresetId: null,
        dailyMessageLimit: null,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'off',
      },
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
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'game',
        contentId: 'game:home',
        title: 'Ekran startowy',
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
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
    });
    renderWithTutorAnchors({
      homeAnchorKinds: ['home_actions', 'home_quest', 'leaderboard', 'progress'],
    });
    expect(screen.queryByTestId('kangur-ai-tutor-home-onboarding')).not.toBeInTheDocument();
  });

  it('lets the learner restart the Game home onboarding manually from the tutor panel', async () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });
    useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      selectionContainerRect: null,
      clearSelection: clearSelectionMock,
    });
    useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      appSettings: {
        agentPersonaId: null,
        motionPresetId: null,
        dailyMessageLimit: null,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'off',
      },
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
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'game',
        contentId: 'game:home',
        title: 'Ekran startowy',
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
    });
    renderWithTutorAnchors({
      homeAnchorKinds: ['home_actions', 'home_quest', 'leaderboard', 'progress'],
    });
    fireEvent.click(screen.getByTestId('kangur-ai-tutor-home-onboarding-replay'));
    expect(await screen.findByTestId('kangur-ai-tutor-home-onboarding')).toBeInTheDocument();
    expect(screen.getByText('Krok 1 z 4')).toBeVisible();
    expect(
      JSON.parse(window.localStorage.getItem('kangur-ai-tutor-home-onboarding-v1') ?? '{}')
    ).toEqual(
      expect.objectContaining({
        status: 'shown',
        version: 1,
      })
    );
  });

  it('reopens the authenticated home onboarding prompt from the docked Game avatar and restarts the guided page tour', async () => {
    useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });
    window.localStorage.setItem(
      'kangur-ai-tutor-home-onboarding-v1',
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
    let tutorState = {
      enabled: true,
      appSettings: {
        agentPersonaId: null,
        motionPresetId: null,
        dailyMessageLimit: null,
        guestIntroMode: 'first_visit',
        homeOnboardingMode: 'off',
      },
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
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
        dailyMessageLimit: null,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      tutorBehaviorMoodId: 'neutral',
      tutorBehaviorMoodLabel: 'Neutralny',
      tutorBehaviorMoodDescription: 'Tutor czeka na kolejne pytanie.',
      tutorAvatarSvg:
        '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="34" fill="#ffffff" /></svg>',
      tutorAvatarImageUrl: null,
      sessionContext: {
        surface: 'game',
        contentId: 'game:home',
        title: 'Ekran startowy',
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
      recordFollowUpCompletion: recordFollowUpCompletionMock,
      setHighlightedText: setHighlightedTextMock,
    };
    useKangurAiTutorMock.mockImplementation(() => tutorState);
    openChatMock.mockImplementation(() => {
      tutorState = {
        ...tutorState,
        isOpen: true,
      };
    });
    closeChatMock.mockImplementation(() => {
      tutorState = {
        ...tutorState,
        isOpen: false,
      };
    });
    const renderOptions = {
      homeAnchorKinds: ['home_actions', 'home_quest', 'leaderboard', 'progress'] as const,
    };
    const { rerender } = renderWithTutorAnchors(renderOptions);
    fireEvent.click(screen.getByTestId('kangur-ai-tutor-avatar'));
    rerender(buildTutorAnchorsTree(renderOptions));
    expect(screen.queryByTestId('kangur-ai-tutor-launcher-prompt')).not.toBeInTheDocument();
    expect(openChatMock).not.toHaveBeenCalled();
    const onboardingPrompt = screen.getByTestId('kangur-ai-tutor-guest-intro');
    expect(onboardingPrompt).toBeInTheDocument();
    expect(
      screen.getByText(
        'Czy chcesz, żebym pokazała główne przyciski oraz elementy wyniku i postępu?'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        'Mogę przeprowadzić Cię po najważniejszych akcjach na stronie głównej oraz po miejscach, w których zobaczysz ranking, punkty i tempo nauki.'
      )
    ).toBeVisible();
    expect(screen.queryByTestId('kangur-ai-tutor-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tak' }));
    rerender(buildTutorAnchorsTree(renderOptions));

    expect(screen.queryByTestId('kangur-ai-tutor-guest-intro')).not.toBeInTheDocument();
    expect(await screen.findByTestId('kangur-ai-tutor-home-onboarding')).toBeInTheDocument();
    expect(screen.getByText('Krok 1 z 4')).toBeVisible();
    expect(screen.getByText('Tutaj wybierasz, jak chcesz zacząć.')).toBeVisible();
  });
});
