import { render } from '@testing-library/react';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { vi } from 'vitest';

import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import type {
  GuidedTutorAuthKind,
  TutorHomeOnboardingStepKind,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.types';

// ── Shared Mocks ──

export const createTutorMocks = () => {
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
};

// ── Classes ──

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

// ── Anchors setup ──

export const tutorAuthAnchorRects: Record<GuidedTutorAuthKind, DOMRect> = {
  login_action: new DOMRect(360, 220, 340, 260),
  create_account_action: new DOMRect(360, 220, 340, 260),
  login_identifier_field: new DOMRect(360, 220, 340, 260),
  login_form: new DOMRect(360, 220, 340, 260),
};

export const resetTutorAuthAnchorRects = (): void => {
  const rect = new DOMRect(360, 220, 340, 260);
  tutorAuthAnchorRects.login_action = rect;
  tutorAuthAnchorRects.create_account_action = rect;
  tutorAuthAnchorRects.login_identifier_field = rect;
  tutorAuthAnchorRects.login_form = rect;
};

export const tutorGameAnchorRects: Record<TutorHomeOnboardingStepKind, DOMRect> = {
  home_actions: new DOMRect(120, 120, 420, 200),
  home_quest: new DOMRect(120, 420, 420, 180),
  priority_assignments: new DOMRect(120, 700, 420, 180),
  leaderboard: new DOMRect(120, 980, 420, 220),
  progress: new DOMRect(620, 980, 420, 220),
};

// ── Components ──

export const TutorAuthAnchor = ({
  kind,
  label,
  testId,
}: {
  kind: GuidedTutorAuthKind;
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
    metadata: { label },
  });
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.getBoundingClientRect = () => tutorAuthAnchorRects[kind];
    }
  }, [kind]);
  return <div ref={ref} data-testid={testId} />;
};

export const TutorGameAnchor = ({
  kind,
  label,
  testId,
  useCoverageAnchorId = false,
}: {
  kind: TutorHomeOnboardingStepKind;
  label: string;
  testId: string;
  useCoverageAnchorId?: boolean;
}): ReactNode => {
  const ref = useRef<HTMLDivElement | null>(null);
  const coverageAnchorIds: Record<TutorHomeOnboardingStepKind, string> = {
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
    if (ref.current) {
      ref.current.getBoundingClientRect = () => tutorGameAnchorRects[kind];
    }
  }, [kind]);
  return <div ref={ref} data-testid={testId} />;
};
