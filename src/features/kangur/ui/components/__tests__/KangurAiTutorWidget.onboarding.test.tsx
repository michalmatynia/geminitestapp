/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import type { TutorHomeOnboardingStepKind } from '@/features/kangur/ui/components/KangurAiTutorWidget.types';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { persistTutorVisibilityHidden } from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';

import {
  MockSpeechSynthesisUtterance,
  resetTutorAuthAnchorRects,
  TutorAuthAnchor,
  TutorGameAnchor,
} from './KangurAiTutorWidget.test-utils';

const mocks = vi.hoisted(() => {
  const settingsStoreMock = {
    get: vi.fn<(key: string) => string | undefined>(),
  };
  const useKangurAiTutorMock = vi.fn();
  const useKangurLoginModalMock = vi.fn();
  const useOptionalKangurAuthMock = vi.fn();
  const useKangurTextHighlightMock = vi.fn();
  const useOptionalKangurRoutingMock = vi.fn();
  const useReducedMotionMock = vi.fn();
  const sendMessageMock = vi.fn();
  const openChatMock = vi.fn();
  const closeChatMock = vi.fn();
  const recordFollowUpCompletionMock = vi.fn();
  const navigateToLoginMock = vi.fn();
  const setHighlightedTextMock = vi.fn();
  const activateSelectionGlowMock = vi.fn().mockReturnValue(false);
  const clearSelectionMock = vi.fn();
  const clearSelectionGlowMock = vi.fn();
  const trackKangurClientEventMock = vi.fn();
  const useKangurPageContentEntryMock = vi.fn();
  const speechSynthesisMock = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    paused: false,
    speaking: false,
  };
  const audioPlayMock = vi.fn().mockResolvedValue(undefined);
  const audioPauseMock = vi.fn();

  return {
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
    speechSynthesisMock,
    audioPlayMock,
    audioPauseMock,
  };
});

const { withKangurClientError, withKangurClientErrorSync } = vi.hoisted(() =>
  globalThis.__kangurClientErrorMocks()
);

vi.mock('framer-motion', () => ({
  useReducedMotion: mocks.useReducedMotionMock,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      animate: _a,
      exit: _e,
      initial: _i,
      transition: _t,
      whileHover: _wh,
      whileTap: _wt,
      ...props
    }: any) => <div {...props}>{children}</div>,
    button: ({
      children,
      animate: _a,
      exit: _e,
      initial: _i,
      transition: _t,
      whileHover: _wh,
      whileTap: _wt,
      ...props
    }: any) => <button {...props}>{children}</button>,
  },
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  const Icon = (props: any) => <svg aria-hidden='true' {...props} />;
  return {
    ...actual,
    BrainCircuit: Icon,
    Send: Icon,
    X: Icon,
  };
});

vi.mock('next/image', () => ({
  default: ({ alt, ...props }: any) => <img alt={alt} {...props} />,
}));

vi.mock('../KangurAiTutorMoodAvatar', () => ({
  KangurAiTutorMoodAvatar: ({ label, avatarImageUrl, svgContent, className, 'data-testid': dataTestId }: any) => (
    <div aria-label={label} className={className} data-testid={dataTestId} role='img'>
      {avatarImageUrl ? (
        <img alt={label} src={avatarImageUrl} />
      ) : svgContent ? (
        <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      ) : (
        <svg aria-hidden='true' />
      )}
    </div>
  ),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => mocks.settingsStoreMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorActivationContext: React.createContext(null),
  useKangurAiTutor: mocks.useKangurAiTutorMock,
  useOptionalKangurAiTutor: mocks.useKangurAiTutorMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => DEFAULT_KANGUR_AI_TUTOR_CONTENT,
  useActivateKangurAiTutorContent: () => {},
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorRuntime.hook', () => ({
  useKangurAiTutorRuntime: () => ({
    value: mocks.useKangurAiTutorMock(),
    sessionRegistryValue: {},
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: mocks.useOptionalKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: mocks.useKangurLoginModalMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTextHighlight', () => ({
  useKangurTextHighlight: mocks.useKangurTextHighlightMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: mocks.useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: mocks.useOptionalKangurRoutingMock,
}));

vi.mock('@/shared/hooks/useAgentPersonaVisuals', () => ({
  useAgentPersonaVisuals: () => ({
    data: [],
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  buildKangurRecommendationHref: (basePath: string, action: any) => {
    const pageSlug = action.page === 'Lessons' ? 'lessons' : action.page.toLowerCase();
    const params = action.query ? new URLSearchParams(action.query).toString() : '';
    return `${basePath}/${pageSlug}${params ? `?${params}` : ''}`;
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
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
});

let KangurAiTutorWidget: any;

const renderWithTutorAnchors = (options: {
  homeAnchorKinds?: TutorHomeOnboardingStepKind[];
  showCreateAccountAnchor?: boolean;
  useCoverageAnchorIds?: boolean;
  showLoginIdentifierAnchor?: boolean;
  showLoginAnchor?: boolean;
  showLoginFormAnchor?: boolean;
} = {}) => render(
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

describe('KangurAiTutorWidget - Onboarding', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
    window.sessionStorage.clear();
    persistTutorVisibilityHidden(false);
    resetTutorAuthAnchorRects();
    vi.doUnmock('../KangurAiTutorWidget');
    const mod = await import('../KangurAiTutorWidget');
    KangurAiTutorWidget = mod.KangurAiTutorWidget;
    
    Element.prototype.scrollIntoView = vi.fn();
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: mocks.speechSynthesisMock,
    });
    vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: mocks.audioPlayMock,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: mocks.audioPauseMock,
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: vi.fn(),
    });
    
    mocks.speechSynthesisMock.speak.mockImplementation((utterance: any) => {
      mocks.speechSynthesisMock.speaking = true;
      utterance.onstart?.();
    });
    
    mocks.settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === 'kangur_narrator_settings_v1') {
        return JSON.stringify({ engine: 'client', voice: 'coral' });
      }
      return undefined;
    });
    
    mocks.sendMessageMock.mockResolvedValue(undefined);
    mocks.useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: true,
      isLoadingAuth: false,
      navigateToLogin: mocks.navigateToLoginMock,
    });
    mocks.useKangurLoginModalMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur',
      closeLoginModal: vi.fn(),
      dismissLoginModal: vi.fn(),
      homeHref: '/kangur',
      isOpen: false,
      isRouteDriven: false,
      openLoginModal: vi.fn(),
    });
    
    mocks.useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Lessons',
      requestedPath: '/kangur/lessons',
    });
    
    mocks.useReducedMotionMock.mockReturnValue(false);
    
    mocks.useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      appSettings: {
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
      openChat: mocks.openChatMock,
      closeChat: mocks.closeChatMock,
      sendMessage: mocks.sendMessageMock,
      recordFollowUpCompletion: mocks.recordFollowUpCompletionMock,
      setHighlightedText: mocks.setHighlightedTextMock,
    });
    
    mocks.useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: mocks.clearSelectionMock,
    });
    
    mocks.useKangurPageContentEntryMock.mockReturnValue({ entry: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('walks through the full Game home onboarding and persists completion', async () => {
    mocks.useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });
    
    renderWithTutorAnchors({
      homeAnchorKinds: ['home_actions', 'home_quest', 'priority_assignments', 'leaderboard', 'progress'],
    });
    
    expect(await screen.findByTestId('kangur-ai-tutor-home-onboarding')).toBeInTheDocument();
    expect(screen.getByText('Krok 1 z 5')).toBeVisible();
    
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    expect(await screen.findByText('Krok 2 z 5')).toBeVisible();
    
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    expect(await screen.findByText('Krok 3 z 5')).toBeVisible();
    
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    expect(await screen.findByText('Krok 4 z 5')).toBeVisible();
    
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    expect(await screen.findByText('Krok 5 z 5')).toBeVisible();
    
    fireEvent.click(screen.getByRole('button', { name: 'Rozumiem' }));
    await waitFor(() => {
      expect(screen.queryByTestId('kangur-ai-tutor-home-onboarding')).not.toBeInTheDocument();
    });
    
    expect(JSON.parse(window.localStorage.getItem('kangur-ai-tutor-home-onboarding-v1') ?? '{}'))
      .toEqual(expect.objectContaining({ status: 'completed', version: 1 }));
  });

  it('ends the Game home onboarding early and docks the tutor back to the launcher', async () => {
    mocks.useOptionalKangurRoutingMock.mockReturnValue({
      basePath: '/kangur',
      embedded: false,
      pageKey: 'Game',
      requestedPath: '/kangur/game',
    });
    
    renderWithTutorAnchors({
      homeAnchorKinds: ['home_actions', 'home_quest', 'priority_assignments', 'leaderboard', 'progress'],
    });
    
    expect(await screen.findByTestId('kangur-ai-tutor-home-onboarding')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zakończ' }));
    
    await waitFor(() => {
      expect(screen.queryByTestId('kangur-ai-tutor-home-onboarding')).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('kangur-ai-tutor-avatar')).toHaveAttribute('data-avatar-placement', 'floating');
    expect(mocks.closeChatMock).toHaveBeenCalledTimes(1);
  });

  it('does not auto-show the guest intro prompt for a first anonymous visit', async () => {
    mocks.useOptionalKangurAuthMock.mockReturnValue({
      isAuthenticated: false,
      isLoadingAuth: false,
      navigateToLogin: mocks.navigateToLoginMock,
    });
    
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, shouldShow: true, reason: 'first_visit' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    
    render(<KangurAiTutorWidget />);

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
    expect(screen.queryByTestId('kangur-ai-tutor-guest-intro')).not.toBeInTheDocument();
  });
});
