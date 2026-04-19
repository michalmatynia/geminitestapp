/**
 * @vitest-environment jsdom
 */

import { useContext, useEffect, type JSX } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@/__tests__/test-utils';
import { DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS } from '@/features/kangur/ai-tutor/settings';

import {
  KangurAiTutorDeferredProvider,
  KangurAiTutorRuntimeScope,
  useKangurAiTutor,
  useOptionalKangurAiTutorController,
  useKangurAiTutorDeferredActivationBridge,
} from './KangurAiTutorContext';
import { KangurAiTutorSessionRegistryContext } from './KangurAiTutorRuntime.session';

import type {
  KangurAiTutorContextValue,
  KangurAiTutorSessionRegistryContextValue,
} from './KangurAiTutorRuntime.types';
import type { KangurAiTutorSessionRegistration } from './kangur-ai-tutor-runtime.helpers';

const setRuntimeRegistrationMock = vi.fn();
const requestSelectionExplainMock = vi.fn();
const recordFollowUpCompletionMock = vi.fn();

const runtimeValue: KangurAiTutorContextValue = {
  enabled: true,
  appSettings: DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS,
  tutorSettings: null,
  tutorPersona: null,
  tutorName: 'Tutor Kangur',
  tutorMoodId: 'neutral',
  tutorBehaviorMoodId: 'neutral',
  tutorBehaviorMoodLabel: 'Neutralny',
  tutorBehaviorMoodDescription: 'Spokojny ton.',
  tutorAvatarSvg: null,
  tutorAvatarImageUrl: null,
  sessionContext: {
    surface: 'test',
    contentId: 'suite-2024',
    title: 'Kangur 2024',
  },
  learnerMemory: null,
  isOpen: false,
  messages: [],
  isLoading: false,
  isUsageLoading: false,
  highlightedText: null,
  usageSummary: null,
  openChat: vi.fn(),
  closeChat: vi.fn(),
  sendMessage: vi.fn(),
  recordFollowUpCompletion: recordFollowUpCompletionMock,
  setHighlightedText: vi.fn(),
  requestSelectionExplain: requestSelectionExplainMock,
  selectionExplainRequest: null,
};

const runtimeSessionRegistryValue: KangurAiTutorSessionRegistryContextValue = {
  setRegistration: setRuntimeRegistrationMock,
};

const deferredRegistration: KangurAiTutorSessionRegistration = {
  token: Symbol('kangur-ai-tutor-session'),
  learnerId: 'learner-1',
  sessionContext: {
    surface: 'test',
    contentId: 'suite-2024',
    title: 'Kangur 2024',
    questionId: 'question-1',
  },
  sessionKey: 'learner-1:test:suite-2024',
};

function ActivationBridgeProbe(): JSX.Element | null {
  useKangurAiTutorDeferredActivationBridge({
    runtimeValue,
    sessionRegistryValue: runtimeSessionRegistryValue,
  });
  return null;
}

function SessionRegistrationProbe(): JSX.Element | null {
  const registry = useContext(KangurAiTutorSessionRegistryContext);

  useEffect(() => {
    registry?.setRegistration(deferredRegistration);
  }, [registry]);

  return null;
}

function RuntimeValueProbe(): JSX.Element {
  const tutor = useKangurAiTutor();
  return (
    <>
      <div data-testid='runtime-enabled'>{String(tutor.enabled)}</div>
      <div data-testid='runtime-loading'>{String(tutor.isLoading)}</div>
      <div data-testid='runtime-message-count'>{String(tutor.messages.length)}</div>
      <div data-testid='runtime-session-context'>
        {tutor.sessionContext?.contentId ?? 'none'}
      </div>
    </>
  );
}

function ControllerProbe(): JSX.Element {
  const tutorController = useOptionalKangurAiTutorController();

  return (
    <>
      <div data-testid='controller-enabled'>{String(tutorController?.enabled ?? false)}</div>
      <button
        onClick={() => tutorController?.openChat()}
        type='button'
      >
        open controller chat
      </button>
    </>
  );
}

function FullRuntimeScopeProbe({
  value = runtimeValue,
}: {
  value?: KangurAiTutorContextValue;
}): JSX.Element {
  return (
    <KangurAiTutorRuntimeScope value={value}>
      <RuntimeValueProbe />
    </KangurAiTutorRuntimeScope>
  );
}

describe('KangurAiTutorDeferredProvider', () => {
  beforeEach(() => {
    setRuntimeRegistrationMock.mockReset();
    requestSelectionExplainMock.mockReset();
    recordFollowUpCompletionMock.mockReset();
    runtimeValue.openChat.mockClear();
  });

  it('replays deferred session registrations into the activated tutor runtime', async () => {
    render(
      <KangurAiTutorDeferredProvider>
        <SessionRegistrationProbe />
        <ActivationBridgeProbe />
        <RuntimeValueProbe />
      </KangurAiTutorDeferredProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('runtime-enabled')).toHaveTextContent('true');
    });

    await waitFor(() => {
      expect(setRuntimeRegistrationMock).toHaveBeenLastCalledWith(
        deferredRegistration
      );
    });
  });

  it('keeps only the lightweight controller state in the deferred shell context', async () => {
    const runtimeValueWithHeavyState: KangurAiTutorContextValue = {
      ...runtimeValue,
      isLoading: true,
      messages: [
        {
          role: 'assistant',
          content: 'Heavy runtime message',
        },
      ],
      sessionContext: {
        surface: 'test',
        contentId: 'suite-heavy',
        title: 'Heavy tutor session',
      },
      usageSummary: {
        dateKey: '2026-04-19',
        remainingMessages: 7,
        dailyMessageLimit: 10,
        messageCount: 3,
      },
    };

    function HeavyActivationBridgeProbe(): JSX.Element | null {
      useKangurAiTutorDeferredActivationBridge({
        runtimeValue: runtimeValueWithHeavyState,
        sessionRegistryValue: runtimeSessionRegistryValue,
      });
      return null;
    }

    render(
      <KangurAiTutorDeferredProvider>
        <HeavyActivationBridgeProbe />
        <RuntimeValueProbe />
      </KangurAiTutorDeferredProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('runtime-enabled')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('runtime-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('runtime-message-count')).toHaveTextContent('0');
    expect(screen.getByTestId('runtime-session-context')).toHaveTextContent('none');
  });

  it('allows the widget subtree to override the shell with the full runtime value', async () => {
    const runtimeValueWithHeavyState: KangurAiTutorContextValue = {
      ...runtimeValue,
      messages: [
        {
          role: 'assistant',
          content: 'Heavy runtime message',
        },
      ],
      sessionContext: {
        surface: 'test',
        contentId: 'suite-heavy',
        title: 'Heavy tutor session',
      },
    };

    function HeavyActivationBridgeProbe(): JSX.Element | null {
      useKangurAiTutorDeferredActivationBridge({
        runtimeValue: runtimeValueWithHeavyState,
        sessionRegistryValue: runtimeSessionRegistryValue,
      });
      return null;
    }

    render(
      <KangurAiTutorDeferredProvider>
        <HeavyActivationBridgeProbe />
        <FullRuntimeScopeProbe value={runtimeValueWithHeavyState} />
      </KangurAiTutorDeferredProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('runtime-enabled')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('runtime-message-count')).toHaveTextContent('1');
    expect(screen.getByTestId('runtime-session-context')).toHaveTextContent('suite-heavy');
  });

  it('exposes the lightweight tutor controller in the deferred shell', async () => {
    render(
      <KangurAiTutorDeferredProvider>
        <ActivationBridgeProbe />
        <ControllerProbe />
      </KangurAiTutorDeferredProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('controller-enabled')).toHaveTextContent('true');
    });

    screen.getByRole('button', { name: 'open controller chat' }).click();

    expect(runtimeValue.openChat).toHaveBeenCalledTimes(1);
  });
});
