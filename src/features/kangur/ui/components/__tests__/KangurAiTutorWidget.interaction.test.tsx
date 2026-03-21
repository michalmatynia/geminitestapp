/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@/__tests__/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { persistTutorVisibilityHidden } from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import {
  MockSpeechSynthesisUtterance,
  resetTutorAuthAnchorRects,
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
  const trackKangurClientEventMock = globalThis.__kangurClientErrorMocks().trackKangurClientEventMock;
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
  useKangurAiTutor: mocks.useKangurAiTutorMock,
  useOptionalKangurAiTutor: mocks.useKangurAiTutorMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContentContext', () => ({
  useKangurAiTutorContent: () => DEFAULT_KANGUR_AI_TUTOR_CONTENT,
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

describe('KangurAiTutorWidget - Interaction', () => {
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
      tutorSettings: {
        enabled: true,
        uiMode: 'anchored',
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: true,
        allowSelectedTextSupport: true,
      },
      tutorName: 'Pomocnik',
      tutorMoodId: 'neutral',
      isOpen: true,
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
    
    mocks.useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
    });
    
    mocks.useKangurTextHighlightMock.mockReturnValue({
      selectedText: null,
      selectionRect: null,
      clearSelection: mocks.clearSelectionMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the tutor modal text without reading control button labels', async () => {
    mocks.useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorSettings: { enabled: true, uiMode: 'anchored' },
      tutorName: 'Pomocnik',
      tutorMoodId: 'encouraging',
      isOpen: true,
      messages: [
        {
          role: 'assistant',
          content: 'Policz najpierw pierwszą parę.',
          coachingFrame: { label: 'Jeden trop', description: 'Mały krok.' },
          sources: [
            { text: 'Dodawanie łączy liczby.', metadata: { title: 'Podstawy' }, collectionId: 'lessons', score: 0.95 },
          ],
        },
      ],
      isLoading: false,
      openChat: mocks.openChatMock,
      closeChat: mocks.closeChatMock,
      sendMessage: mocks.sendMessageMock,
      setHighlightedText: mocks.setHighlightedTextMock,
    });
    
    render(<KangurAiTutorWidget />);
    fireEvent.click(await screen.findByRole('button', { name: 'Czytaj' }));
    
    await waitFor(() => expect(mocks.speechSynthesisMock.speak).toHaveBeenCalledTimes(1));
    const utterance = mocks.speechSynthesisMock.speak.mock.calls[0]?.[0] as MockSpeechSynthesisUtterance;
    expect(utterance.text).toContain('Policz najpierw pierwszą parę.');
    expect(utterance.text).toContain('Mały krok.');
    expect(utterance.text).toContain('Podstawy');
    expect(utterance.text).not.toContain('Czytaj');
  });

  it('tracks learner feedback on assistant replies and locks the controls after submission', () => {
    mocks.useKangurAiTutorMock.mockReturnValue({
      enabled: true,
      tutorName: 'Pomocnik',
      isOpen: true,
      messages: [
        {
          role: 'assistant',
          content: 'Spróbuj najpierw policzyć dziesiątkę.',
          coachingFrame: { mode: 'hint_ladder', label: 'Jeden trop', description: 'Daj tylko jeden mały krok.' },
        },
      ],
      openChat: mocks.openChatMock,
      closeChat: mocks.closeChatMock,
      sendMessage: mocks.sendMessageMock,
      setHighlightedText: mocks.setHighlightedTextMock,
    });
    
    render(<KangurAiTutorWidget />);
    fireEvent.click(screen.getByTestId('kangur-ai-tutor-feedback-helpful-0'));
    
    expect(mocks.trackKangurClientEventMock).toHaveBeenCalledWith(
      'kangur_ai_tutor_feedback_submitted',
      expect.objectContaining({
        feedback: 'helpful',
        messageIndex: 0,
      })
    );
  });
});
