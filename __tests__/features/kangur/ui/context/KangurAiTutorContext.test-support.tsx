/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

const kangurAiTutorContextTestHoisted = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  apiGetMock: vi.fn(),
  apiPostMock: vi.fn(),
  useAgentPersonasMock: vi.fn(),
  useOptionalKangurAuthMock: vi.fn(),
}));

const {
  trackKangurClientEventMock,
  logKangurClientErrorMock,
  withKangurClientError,
  withKangurClientErrorSync,
} = globalThis.__kangurClientErrorMocks();

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => kangurAiTutorContextTestHoisted.settingsStoreMock,
}));

vi.mock('@/shared/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/api-client')>();
  return {
    ...actual,
    api: {
      get: (...args: Parameters<typeof kangurAiTutorContextTestHoisted.apiGetMock>) =>
        kangurAiTutorContextTestHoisted.apiGetMock(...args),
      post: (...args: Parameters<typeof kangurAiTutorContextTestHoisted.apiPostMock>) =>
        kangurAiTutorContextTestHoisted.apiPostMock(...args),
    },
  };
});

vi.mock('@/shared/hooks/useAgentPersonaVisuals', () => ({
  useAgentPersonaVisuals: (
    ...args: Parameters<typeof kangurAiTutorContextTestHoisted.useAgentPersonasMock>
  ) => kangurAiTutorContextTestHoisted.useAgentPersonasMock(...args),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: (
    ...args: Parameters<typeof kangurAiTutorContextTestHoisted.useOptionalKangurAuthMock>
  ) => kangurAiTutorContextTestHoisted.useOptionalKangurAuthMock(...args),
  useOptionalKangurAuthSessionState: () => {
    const auth = kangurAiTutorContextTestHoisted.useOptionalKangurAuthMock();
    return auth === null ? null : { user: auth.user ?? null };
  },
}));

vi.mock('@/features/kangur/observability/client', () => {
  const {
    trackKangurClientEventMock,
    logKangurClientErrorMock,
    withKangurClientError,
    withKangurClientErrorSync,
  } = globalThis.__kangurClientErrorMocks();
  return {
    trackKangurClientEvent: trackKangurClientEventMock,
    logKangurClientError: logKangurClientErrorMock,
    withKangurClientError,
    withKangurClientErrorSync,
  };
,
  isRecoverableKangurClientFetchError: vi.fn().mockReturnValue(false),});

vi.mock('@/features/kangur/shared/utils/observability/error-system-client', () => ({
  ErrorSystem: {
    captureException: kangurAiTutorContextTestHoisted.captureExceptionMock,
  },
}));

import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY as importedKangurAiTutorAppSettingsKey,
  KANGUR_AI_TUTOR_SETTINGS_KEY as importedKangurAiTutorSettingsKey,
} from '@/features/kangur/ai-tutor/settings';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT as importedDefaultKangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import { ApiError as ImportedApiError } from '@/shared/lib/api-client';
import {
  KangurAiTutorProvider as importedKangurAiTutorProvider,
  KangurAiTutorSessionSync as importedKangurAiTutorSessionSync,
  useKangurAiTutor as importedUseKangurAiTutor,
} from '@/features/kangur/ui/context/KangurAiTutorContext';

export const DEFAULT_KANGUR_AI_TUTOR_CONTENT = importedDefaultKangurAiTutorContent;
export const KANGUR_AI_TUTOR_APP_SETTINGS_KEY = importedKangurAiTutorAppSettingsKey;
export const KANGUR_AI_TUTOR_SETTINGS_KEY = importedKangurAiTutorSettingsKey;
export const KangurAiTutorProvider = importedKangurAiTutorProvider;
export const KangurAiTutorSessionSync = importedKangurAiTutorSessionSync;
export const trackKangurClientEvent = trackKangurClientEventMock;
export const logKangurClientError = logKangurClientErrorMock;
export const withTrackedKangurClientError = withKangurClientError;
export const withTrackedKangurClientErrorSync = withKangurClientErrorSync;
export { trackKangurClientEventMock, logKangurClientErrorMock };

export function createApiError(message: string, status: number): ImportedApiError {
  return new ImportedApiError(message, status);
}

export const captureExceptionMock = kangurAiTutorContextTestHoisted.captureExceptionMock;
export const settingsStoreMock = kangurAiTutorContextTestHoisted.settingsStoreMock;
export const apiGetMock = kangurAiTutorContextTestHoisted.apiGetMock;
export const apiPostMock = kangurAiTutorContextTestHoisted.apiPostMock;
export const useAgentPersonasMock = kangurAiTutorContextTestHoisted.useAgentPersonasMock;
export const useOptionalKangurAuthMock =
  kangurAiTutorContextTestHoisted.useOptionalKangurAuthMock;

export function resetKangurAiTutorContextTestState(): void {
  vi.resetAllMocks();
  window.sessionStorage.clear();

  apiGetMock.mockResolvedValue({
    usage: {
      dateKey: '2026-03-07',
      messageCount: 0,
      dailyMessageLimit: null,
      remainingMessages: null,
    },
  });

  settingsStoreMock.get.mockImplementation((key: string) => {
    if (key === KANGUR_AI_TUTOR_SETTINGS_KEY) {
      return JSON.stringify({
        'learner-1': {
          enabled: true,
          agentPersonaId: 'persona-1',
          motionPresetId: null,
          allowCrossPagePersistence: true,
          allowLessons: true,
          testAccessMode: 'guided',
          showSources: true,
          allowSelectedTextSupport: true,
          dailyMessageLimit: null,
        },
      });
    }
    return undefined;
  });

  useAgentPersonasMock.mockReturnValue({
    data: [
      {
        id: 'persona-1',
        name: 'Mila',
        defaultMoodId: 'neutral',
        moods: [
          {
            id: 'neutral',
            label: 'Neutral',
            svgContent:
              '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="#ffffff" /></svg>',
          },
          {
            id: 'thinking',
            label: 'Thinking',
            svgContent:
              '<svg viewBox="0 0 100 100"><rect x="22" y="22" width="56" height="56" fill="#ffffff" /></svg>',
          },
          {
            id: 'encouraging',
            label: 'Encouraging',
            svgContent:
              '<svg viewBox="0 0 100 100"><path d="M20 60 Q50 20 80 60" fill="none" stroke="#ffffff" stroke-width="8" /></svg>',
          },
        ],
      },
    ],
  });
  useOptionalKangurAuthMock.mockReturnValue(null);
}

export function Harness(): React.JSX.Element {
  const {
    appSettings,
    tutorName,
    tutorMoodId,
    tutorBehaviorMoodId,
    tutorBehaviorMoodLabel,
    tutorBehaviorMoodDescription,
    tutorAvatarSvg,
    tutorAvatarImageUrl,
    messages,
    sendMessage,
    usageSummary,
    isOpen,
    isLoading,
    isUsageLoading,
    openChat,
    recordFollowUpCompletion,
  } = importedUseKangurAiTutor();
  const followUpSummary = messages
    .flatMap((message) =>
      (message.followUpActions ?? []).map((action) => `${action.reason ?? action.id}:${action.label}`)
    )
    .join(' | ');
  const coachingSummary = messages
    .flatMap((message) =>
      message.coachingFrame ? [`${message.coachingFrame.mode}:${message.coachingFrame.label}`] : []
    )
    .join(' | ');
  const websiteHelpTargets = messages
    .flatMap((message) =>
      message.websiteHelpTarget
        ? [
            `${message.websiteHelpTarget.label}:${message.websiteHelpTarget.route ?? 'none'}:${message.websiteHelpTarget.anchorId ?? 'none'}`,
          ]
        : []
    )
    .join(' | ');

  return (
    <div>
      <div data-testid='guest-intro-mode'>{appSettings.guestIntroMode}</div>
      <div data-testid='tutor-name'>{tutorName}</div>
      <div data-testid='tutor-mood'>{tutorMoodId}</div>
      <div data-testid='tutor-behavior-mood'>{tutorBehaviorMoodId}</div>
      <div data-testid='tutor-behavior-mood-label'>{tutorBehaviorMoodLabel}</div>
      <div data-testid='tutor-behavior-mood-description'>{tutorBehaviorMoodDescription}</div>
      <div data-testid='tutor-avatar'>{tutorAvatarSvg ? 'present' : 'missing'}</div>
      <div data-testid='tutor-avatar-image-url'>{tutorAvatarImageUrl ?? 'none'}</div>
      <div data-testid='is-open'>{String(isOpen)}</div>
      <div data-testid='is-loading'>{String(isLoading)}</div>
      <div data-testid='is-usage-loading'>{String(isUsageLoading)}</div>
      <div data-testid='usage-summary'>
        {usageSummary
          ? `${usageSummary.messageCount}/${usageSummary.dailyMessageLimit ?? 'none'}/${usageSummary.remainingMessages ?? 'none'}`
          : 'none'}
      </div>
      <button type='button' onClick={openChat}>
        Open tutor
      </button>
      <button
        type='button'
        onClick={() =>
          recordFollowUpCompletion?.({
            actionId: 'recommendation:strengthen_lesson_mastery',
            actionLabel: 'Otwórz lekcję',
            actionReason: 'Powtórz lekcję: Dodawanie',
            actionPage: 'Lessons',
            targetPath: '/kangur/lessons',
            targetSearch: '?focus=adding',
          })
        }
      >
        Record follow-up completion
      </button>
      <button
        type='button'
        onClick={() =>
          void sendMessage('Pomóż mi z tym zadaniem.', {
            promptMode: 'hint',
            selectedText: '2 + 2',
          })
        }
      >
        Send
      </button>
      <div data-testid='messages'>{messages.map((message) => message.content).join(' | ')}</div>
      <div data-testid='follow-up-actions'>{followUpSummary || 'none'}</div>
      <div data-testid='coaching-summary'>{coachingSummary || 'none'}</div>
      <div data-testid='website-help-targets'>{websiteHelpTargets || 'none'}</div>
    </div>
  );
}

export function SelectedTextHarness(): React.JSX.Element {
  const { messages, sendMessage } = importedUseKangurAiTutor();

  return (
    <div>
      <button
        type='button'
        onClick={() =>
          void sendMessage('Wyjaśnij zaznaczony fragment.', {
            promptMode: 'selected_text',
            selectedText: '2 + 2',
          })
        }
      >
        Send selected text
      </button>
      <div data-testid='selected-text-messages'>
        {messages.map((message) => message.content).join(' | ')}
      </div>
    </div>
  );
}

export function DrawingHarness(): React.JSX.Element {
  const { messages, sendMessage } = importedUseKangurAiTutor();

  return (
    <div>
      <button
        type='button'
        onClick={() =>
          void sendMessage('Wyjaśnij to rysunkiem.', {
            promptMode: 'explain',
            drawingImageData: 'data:image/png;base64,AAA',
          })
        }
      >
        Send drawing
      </button>
      <div data-testid='drawing-messages'>
        {messages.map((message) => message.content).join(' | ')}
      </div>
      <div data-testid='drawing-artifacts'>
        {JSON.stringify(messages.map((message) => message.artifacts ?? []))}
      </div>
    </div>
  );
}

export function SurfaceOverrideHarness(): React.JSX.Element {
  const { messages, sendMessage } = importedUseKangurAiTutor();

  return (
    <div>
      <button
        type='button'
        onClick={() =>
          void sendMessage('Wyjaśnij logowanie.', {
            promptMode: 'explain',
            focusKind: 'login_action',
            focusId: 'kangur-auth-login-action',
            focusLabel: 'Zaloguj się',
            interactionIntent: 'explain',
            surface: 'auth',
          })
        }
      >
        Send with surface override
      </button>
      <div data-testid='surface-override-messages'>
        {messages.map((message) => message.content).join(' | ')}
      </div>
    </div>
  );
}

export function TutorAvailabilityHarness(): React.JSX.Element {
  const { enabled, tutorSettings, sessionContext } = importedUseKangurAiTutor();

  return (
    <div>
      <div data-testid='availability-enabled'>{String(enabled)}</div>
      <div data-testid='settings-enabled'>{String(tutorSettings?.enabled ?? false)}</div>
      <div data-testid='has-session-context'>{String(Boolean(sessionContext))}</div>
    </div>
  );
}
