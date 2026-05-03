/**
 * @vitest-environment jsdom
 */

import React, { createContext, useLayoutEffect, useRef } from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT as importedDefaultKangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import { persistTutorVisibilityHidden as importedPersistTutorVisibilityHidden } from '@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget.storage';

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
  SVGProps,
} from 'react';

const kangurAiTutorWidgetTestHoisted = vi.hoisted(() => ({
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
  withKangurClientError: globalThis.__kangurClientErrorMocks().withKangurClientError,
  withKangurClientErrorSync: globalThis.__kangurClientErrorMocks().withKangurClientErrorSync,
  trackKangurClientEventMock: globalThis.__kangurClientErrorMocks().trackKangurClientEventMock,
}));

vi.mock('framer-motion', () => ({
  useReducedMotion: kangurAiTutorWidgetTestHoisted.useReducedMotionMock,
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
  }) => <img alt={alt} {...props} />,
}));

type MoodAvatarMockProps = {
  avatarImageUrl?: string | null;
  className?: string;
  fallbackIconClassName?: string;
  imgClassName?: string;
  label: string;
  svgClassName?: string;
  svgContent?: string | null;
  'data-testid'?: string;
};

function MockKangurAiTutorMoodAvatar(props: MoodAvatarMockProps): React.JSX.Element {
  const {
    avatarImageUrl,
    className,
    fallbackIconClassName,
    imgClassName,
    label,
    svgClassName,
    svgContent,
    'data-testid': dataTestId,
  } = props;

  return (
    <div aria-label={label} className={className} data-testid={dataTestId} role='img'>
      {avatarImageUrl ? (
        <img alt={label} className={imgClassName} src={avatarImageUrl} />
      ) : svgContent ? (
        <div className={svgClassName} dangerouslySetInnerHTML={{ __html: svgContent }} />
      ) : (
        <svg aria-hidden='true' className={fallbackIconClassName} />
      )}
    </div>
  );
}

vi.mock('@/features/kangur/ui/components/KangurAiTutorMoodAvatar', () => ({
  KangurAiTutorMoodAvatar: MockKangurAiTutorMoodAvatar,
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => kangurAiTutorWidgetTestHoisted.settingsStoreMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorActivationContext: createContext(null),
  KangurAiTutorRuntimeScope: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKangurAiTutor: kangurAiTutorWidgetTestHoisted.useKangurAiTutorMock,
  useOptionalKangurAiTutor: kangurAiTutorWidgetTestHoisted.useKangurAiTutorMock,
  useKangurAiTutorDeferredActivationBridge: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => importedDefaultKangurAiTutorContent,
  useActivateKangurAiTutorContent: () => {},
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorRuntime.hook', () => ({
  useKangurAiTutorRuntime: () => ({
    value: kangurAiTutorWidgetTestHoisted.useKangurAiTutorMock(),
    sessionRegistryValue: {},
  }),
}));

vi.mock('@/shared/hooks/useAgentPersonaVisuals', () => ({
  useAgentPersonaVisuals: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: kangurAiTutorWidgetTestHoisted.useOptionalKangurAuthMock,
  useOptionalKangurAuthSessionState: () => {
    const auth = kangurAiTutorWidgetTestHoisted.useOptionalKangurAuthMock();
    return auth === null
      ? null
      : {
          canAccessParentAssignments: auth.canAccessParentAssignments,
          hasResolvedAuth: auth.hasResolvedAuth,
          isAuthenticated: auth.isAuthenticated ?? false,
          user: auth.user ?? null,
        };
  },
  useOptionalKangurAuthStatusState: () => {
    const auth = kangurAiTutorWidgetTestHoisted.useOptionalKangurAuthMock();
    return auth === null
      ? null
      : {
          appPublicSettings: auth.appPublicSettings,
          authError: auth.authError,
          isLoadingAuth: auth.isLoadingAuth ?? false,
          isLoadingPublicSettings: auth.isLoadingPublicSettings,
          isLoggingOut: auth.isLoggingOut,
        };
  },
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: kangurAiTutorWidgetTestHoisted.useKangurLoginModalMock,
  useKangurLoginModalState: kangurAiTutorWidgetTestHoisted.useKangurLoginModalMock,
  useKangurLoginModalActions: kangurAiTutorWidgetTestHoisted.useKangurLoginModalMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTextHighlight', () => ({
  useKangurTextHighlight: kangurAiTutorWidgetTestHoisted.useKangurTextHighlightMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: kangurAiTutorWidgetTestHoisted.useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: kangurAiTutorWidgetTestHoisted.useOptionalKangurRoutingMock,
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
    prefetch: _prefetch,
    scroll: _scroll,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    scroll?: boolean;
    prefetch?: boolean;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/observability/client', () => {
  const mocks = globalThis.__kangurClientErrorMocks();
  return {
    trackKangurClientEvent: mocks.trackKangurClientEventMock,
    withKangurClientError: mocks.withKangurClientError,
    withKangurClientErrorSync: mocks.withKangurClientErrorSync,
  };
,
  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),});

export class MockSpeechSynthesisUtterance {
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

export const resetTutorAuthAnchorRects = (): void => {
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

type TutorAnchorsOptions = {
  homeAnchorKinds?: TutorGameAnchorKind[];
  showCreateAccountAnchor?: boolean;
  useCoverageAnchorIds?: boolean;
  showLoginIdentifierAnchor?: boolean;
  showLoginAnchor?: boolean;
  showLoginFormAnchor?: boolean;
};

type KangurAiTutorWidgetComponent =
  typeof import('@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget').KangurAiTutorWidget;

export const buildTutorAnchorsTree = (
  KangurAiTutorWidget: KangurAiTutorWidgetComponent,
  options: TutorAnchorsOptions = {}
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

export const renderWithTutorAnchors = (
  KangurAiTutorWidget: KangurAiTutorWidgetComponent,
  options: TutorAnchorsOptions = {}
) => render(buildTutorAnchorsTree(KangurAiTutorWidget, options));

export const mockWindowSelection = (node: Node, text: string) =>
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

export async function prepareKangurAiTutorWidgetTest(): Promise<KangurAiTutorWidgetComponent> {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
  importedPersistTutorVisibilityHidden(false);
  resetTutorAuthAnchorRects();
  vi.doUnmock('@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget');
  const { KangurAiTutorWidget } = await import(
    '@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget'
  );

  Element.prototype.scrollIntoView = vi.fn();
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: kangurAiTutorWidgetTestHoisted.speechSynthesisMock,
  });
  vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: kangurAiTutorWidgetTestHoisted.audioPlayMock,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: kangurAiTutorWidgetTestHoisted.audioPauseMock,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
    configurable: true,
    value: vi.fn(),
  });

  kangurAiTutorWidgetTestHoisted.speechSynthesisMock.speak.mockImplementation(
    (utterance: MockSpeechSynthesisUtterance) => {
      kangurAiTutorWidgetTestHoisted.speechSynthesisMock.speaking = true;
      utterance.onstart?.();
    }
  );
  kangurAiTutorWidgetTestHoisted.clearSelectionMock.mockImplementation(() => undefined);
  kangurAiTutorWidgetTestHoisted.clearSelectionGlowMock.mockImplementation(() => undefined);
  kangurAiTutorWidgetTestHoisted.openChatMock.mockImplementation(() => undefined);
  kangurAiTutorWidgetTestHoisted.closeChatMock.mockImplementation(() => undefined);
  kangurAiTutorWidgetTestHoisted.settingsStoreMock.get.mockImplementation((key: string) => {
    if (key === 'kangur_narrator_settings_v1') {
      return JSON.stringify({ engine: 'client', voice: 'coral' });
    }
    return undefined;
  });
  kangurAiTutorWidgetTestHoisted.sendMessageMock.mockResolvedValue(undefined);
  kangurAiTutorWidgetTestHoisted.useOptionalKangurAuthMock.mockReturnValue({
    isAuthenticated: true,
    isLoadingAuth: false,
    navigateToLogin: kangurAiTutorWidgetTestHoisted.navigateToLoginMock,
  });
  kangurAiTutorWidgetTestHoisted.useKangurLoginModalMock.mockReturnValue({
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
  kangurAiTutorWidgetTestHoisted.useOptionalKangurRoutingMock.mockReturnValue({
    basePath: '/kangur',
    embedded: false,
    pageKey: 'Lessons',
    requestedPath: '/kangur/lessons',
  });
  kangurAiTutorWidgetTestHoisted.useReducedMotionMock.mockReturnValue(false);
  kangurAiTutorWidgetTestHoisted.useKangurAiTutorMock.mockReturnValue({
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
    openChat: kangurAiTutorWidgetTestHoisted.openChatMock,
    closeChat: kangurAiTutorWidgetTestHoisted.closeChatMock,
    sendMessage: kangurAiTutorWidgetTestHoisted.sendMessageMock,
    setHighlightedText: kangurAiTutorWidgetTestHoisted.setHighlightedTextMock,
  });
  kangurAiTutorWidgetTestHoisted.useKangurTextHighlightMock.mockReturnValue({
    activateSelectionGlow: kangurAiTutorWidgetTestHoisted.activateSelectionGlowMock,
    clearSelectionGlow: kangurAiTutorWidgetTestHoisted.clearSelectionGlowMock,
    selectionGlowSupported: false,
    selectionLineRects: [new DOMRect(120, 180, 140, 26)],
    selectedText: '2 + 2',
    selectionRect: new DOMRect(120, 180, 140, 26),
    selectionContainerRect: new DOMRect(80, 150, 520, 240),
    clearSelection: kangurAiTutorWidgetTestHoisted.clearSelectionMock,
  });
  kangurAiTutorWidgetTestHoisted.useKangurPageContentEntryMock.mockImplementation(
    (entryId: string | null | undefined) => ({
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
    })
  );

  return KangurAiTutorWidget;
}

export const DEFAULT_KANGUR_AI_TUTOR_CONTENT = importedDefaultKangurAiTutorContent;
export const settingsStoreMock = kangurAiTutorWidgetTestHoisted.settingsStoreMock;
export const useKangurAiTutorMock = kangurAiTutorWidgetTestHoisted.useKangurAiTutorMock;
export const useKangurLoginModalMock = kangurAiTutorWidgetTestHoisted.useKangurLoginModalMock;
export const useOptionalKangurAuthMock = kangurAiTutorWidgetTestHoisted.useOptionalKangurAuthMock;
export const useKangurTextHighlightMock = kangurAiTutorWidgetTestHoisted.useKangurTextHighlightMock;
export const useOptionalKangurRoutingMock =
  kangurAiTutorWidgetTestHoisted.useOptionalKangurRoutingMock;
export const useReducedMotionMock = kangurAiTutorWidgetTestHoisted.useReducedMotionMock;
export const sendMessageMock = kangurAiTutorWidgetTestHoisted.sendMessageMock;
export const openChatMock = kangurAiTutorWidgetTestHoisted.openChatMock;
export const closeChatMock = kangurAiTutorWidgetTestHoisted.closeChatMock;
export const recordFollowUpCompletionMock =
  kangurAiTutorWidgetTestHoisted.recordFollowUpCompletionMock;
export const navigateToLoginMock = kangurAiTutorWidgetTestHoisted.navigateToLoginMock;
export const setHighlightedTextMock = kangurAiTutorWidgetTestHoisted.setHighlightedTextMock;
export const activateSelectionGlowMock =
  kangurAiTutorWidgetTestHoisted.activateSelectionGlowMock;
export const clearSelectionMock = kangurAiTutorWidgetTestHoisted.clearSelectionMock;
export const clearSelectionGlowMock = kangurAiTutorWidgetTestHoisted.clearSelectionGlowMock;
export const trackKangurClientEventMock =
  kangurAiTutorWidgetTestHoisted.trackKangurClientEventMock;
export const useKangurPageContentEntryMock =
  kangurAiTutorWidgetTestHoisted.useKangurPageContentEntryMock;
