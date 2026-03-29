/**
 * @vitest-environment jsdom
 */

import { useContext, useEffect, type JSX } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render, screen, waitFor } from '@/__tests__/test-utils';
import { DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS } from '@/features/kangur/ai-tutor/settings';

import {
  KangurAiTutorDeferredProvider,
  useKangurAiTutor,
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
  return <div data-testid='runtime-enabled'>{String(tutor.enabled)}</div>;
}

describe('KangurAiTutorDeferredProvider', () => {
  beforeEach(() => {
    setRuntimeRegistrationMock.mockReset();
    requestSelectionExplainMock.mockReset();
    recordFollowUpCompletionMock.mockReset();
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
});
