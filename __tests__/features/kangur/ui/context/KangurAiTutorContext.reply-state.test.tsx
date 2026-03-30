/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  Harness,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  KangurAiTutorProvider,
  SelectedTextHarness,
  apiPostMock,
  createApiError,
  logKangurClientErrorMock,
  resetKangurAiTutorContextTestState,
  settingsStoreMock,
  trackKangurClientEventMock,
  useAgentPersonasMock,
} from './KangurAiTutorContext.test-support';

describe('KangurAiTutorContext reply state', () => {
  beforeEach(() => {
    resetKangurAiTutorContextTestState();
  });

  afterEach(() => {
    cleanup();
  });

  it('tracks failed tutor sends and logs the client error', async () => {
    apiPostMock.mockRejectedValue(
      createApiError('Daily AI Tutor message limit reached for this learner. Try again tomorrow.', 429)
    );

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() =>
      expect(trackKangurClientEventMock).toHaveBeenCalledWith(
        'kangur_ai_tutor_message_failed',
        expect.objectContaining({
          surface: 'lesson',
          contentId: 'lesson-1',
          promptMode: 'hint',
        })
      )
    );
    expect(logKangurClientErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: 'KangurAiTutorContext',
        action: 'sendMessage',
        surface: 'lesson',
        contentId: 'lesson-1',
        promptMode: 'hint',
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId('messages')).toHaveTextContent(
        'Pomóż mi z tym zadaniem. | Daily AI Tutor message limit reached for this learner. Try again tomorrow.'
      )
    );
  });

  it('switches to the thinking mood while a tutor response is loading', async () => {
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
              id: 'happy',
              label: 'Happy',
              svgContent:
                '<svg viewBox="0 0 100 100"><circle cx="36" cy="40" r="8" fill="#ffffff" /><circle cx="64" cy="40" r="8" fill="#ffffff" /><path d="M24 58 Q50 82 76 58" fill="none" stroke="#ffffff" stroke-width="8" /></svg>',
            },
          ],
        },
      ],
    });
    let resolveChat:
      | ((value: {
          message: string;
          suggestedMoodId?: 'happy';
          sources: [];
          followUpActions: [];
        }) => void)
      | null = null;
    apiPostMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChat = resolve;
        })
    );

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <Harness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(screen.getByTestId('tutor-mood')).toHaveTextContent('thinking'));

    resolveChat?.({
      message: 'Spróbuj policzyć od lewej.',
      suggestedMoodId: 'happy',
      sources: [],
      followUpActions: [],
    });

    await waitFor(() => expect(screen.getByTestId('tutor-mood')).toHaveTextContent('happy'));
  });

  it('drops selected-text metadata and hidden sources when parent guardrails disable them', async () => {
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
            showSources: false,
            allowSelectedTextSupport: false,
            dailyMessageLimit: 10,
          },
        });
      }
      return undefined;
    });

    apiPostMock.mockResolvedValue({
      message: 'Najpierw sprawdź działanie.',
      sources: [
        {
          documentId: 'doc-1',
          collectionId: 'math-docs',
          score: 0.88,
          text: 'Dodawanie polega na łączeniu dwóch liczb.',
        },
      ],
    });

    render(
      <KangurAiTutorProvider
        learnerId='learner-1'
        sessionContext={{
          surface: 'lesson',
          contentId: 'lesson-1',
          title: 'Dodawanie',
        }}
      >
        <SelectedTextHarness />
      </KangurAiTutorProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Send selected text' }));

    await waitFor(() => expect(apiPostMock).toHaveBeenCalledTimes(1));

    expect(apiPostMock).toHaveBeenCalledWith('/api/kangur/ai-tutor/chat', {
      messages: [{ role: 'user', content: 'Wyjaśnij zaznaczony fragment.' }],
      context: {
        surface: 'lesson',
        contentId: 'lesson-1',
        title: 'Dodawanie',
        promptMode: 'chat',
      },
    });
    expect(trackKangurClientEventMock).toHaveBeenNthCalledWith(
      1,
      'kangur_ai_tutor_message_sent',
      expect.objectContaining({
        promptMode: 'chat',
        hasSelectedText: false,
      })
    );
    await waitFor(() =>
      expect(screen.getByTestId('selected-text-messages')).toHaveTextContent(
        'Wyjaśnij zaznaczony fragment. | Najpierw sprawdź działanie.'
      )
    );
  });
});
