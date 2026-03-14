/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsStoreMock, mutateAsyncMock, toastMock } = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn(),
  },
  mutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({
    data: undefined,
    entry: null,
    error: null,
    isError: false,
    isFetched: true,
    isFetching: false,
    isLoading: false,
    isPending: false,
    isSuccess: true,
    refetch: vi.fn(),
    status: 'success',
  }),
}));

import { KANGUR_TEST_QUESTIONS_SETTING_KEY } from '../test-questions';
import { KANGUR_TEST_SUITES_SETTING_KEY } from '../test-suites';
import { KangurQuestionsManagerPanel } from './KangurQuestionsManagerPanel';
import { KangurQuestionsManagerRuntimeProvider } from './context/KangurQuestionsManagerRuntimeContext';
import {
  readQuestionEditorDraft,
  writeQuestionEditorDraft,
} from './question-editor-drafts';

const suite = {
  id: 'suite-1',
  title: 'Kangur 2024',
  description: 'Zestaw próbny',
  year: 2024,
  gradeLevel: 'III-IV',
  category: 'matematyczny',
  enabled: true,
  publicationStatus: 'draft',
  sortOrder: 1000,
} as const;

describe('KangurQuestionsManagerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              auditFlags: [],
            },
          },
          'question-review': {
            id: 'question-review',
            suiteId: 'suite-1',
            sortOrder: 2000,
            prompt: 'Pytanie do review',
            choices: [
              { label: 'A', text: 'A', description: 'Wizualna wskazówka' },
              { label: 'B', text: 'B' },
            ],
            correctChoiceLabel: 'A',
            pointValue: 4,
            explanation: 'Sprawdź wizual',
            illustration: { type: 'none' },
            editorial: {
              source: 'legacy-import',
              reviewStatus: 'needs-review',
              workflowStatus: 'draft',
              auditFlags: ['legacy_choice_descriptions'],
            },
          },
          'question-fix': {
            id: 'question-fix',
            suiteId: 'suite-1',
            sortOrder: 3000,
            prompt: 'Pytanie do naprawy',
            choices: [
              { label: 'A', text: '14' },
              { label: 'B', text: '12' },
            ],
            correctChoiceLabel: 'A',
            pointValue: 5,
            explanation: 'Wyjaśnienie jest niespojne',
            illustration: {
              type: 'single',
              svgContent:
                '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="28" height="28" fill="none" stroke="#111827"/></svg>',
            },
            presentation: {
              layout: 'split-illustration-right',
              choiceStyle: 'grid',
            },
            editorial: {
              source: 'legacy-import',
              reviewStatus: 'needs-fix',
              workflowStatus: 'draft',
              auditFlags: ['explanation_answer_mismatch'],
            },
          },
        });
      }
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([suite]);
      }
      return null;
    });
  });

  it('shows question health counts and filters the list by review state', () => {
    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    expect(screen.getByText('Ready 1')).toBeInTheDocument();
    expect(screen.getByText('Rich UI 2')).toBeInTheDocument();
    expect(screen.getByText('Needs review 1')).toBeInTheDocument();
    expect(screen.getByText('Needs fix 1')).toBeInTheDocument();
    expect(screen.getByText('SVG 1')).toBeInTheDocument();
    expect(screen.getByText('Draft 2')).toBeInTheDocument();
    expect(screen.getByText('Published 1')).toBeInTheDocument();
    expect(screen.getByText('Gotowe pytanie')).toBeInTheDocument();
    expect(screen.getByText('Pytanie do review')).toBeInTheDocument();
    expect(screen.getByText('Pytanie do naprawy')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Needs fix' }));

    expect(screen.queryByText('Gotowe pytanie')).not.toBeInTheDocument();
    expect(screen.queryByText('Pytanie do review')).not.toBeInTheDocument();
    expect(screen.getByText('Pytanie do naprawy')).toBeInTheDocument();
    expect(
      screen.getByText('Reorder questions in the Manual order / All view.')
    ).toBeInTheDocument();
    expect(screen.getByText('Order 3')).toBeInTheDocument();
  });

  it('renders the question workspace chrome and triage controls', () => {
    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    expect(screen.getByText('Suite question workspace')).toBeInTheDocument();
    expect(screen.getByText('Filter and triage')).toBeInTheDocument();
    expect(screen.getByText('Sort')).toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to suites/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add question' })).toBeInTheDocument();
  });

  it('searches across audit flags and other question content', () => {
    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search questions' }), {
      target: { value: 'mismatch' },
    });

    expect(screen.queryByText('Gotowe pytanie')).not.toBeInTheDocument();
    expect(screen.queryByText('Pytanie do review')).not.toBeInTheDocument();
    expect(screen.getByText('Pytanie do naprawy')).toBeInTheDocument();
  });

  it('filters questions by workflow state', () => {
    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Published' }));

    expect(screen.getByText('Gotowe pytanie')).toBeInTheDocument();
    expect(screen.queryByText('Pytanie do review')).not.toBeInTheDocument();
    expect(screen.queryByText('Pytanie do naprawy')).not.toBeInTheDocument();
  });

  it('orders the review queue by authoring priority', () => {
    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Review queue' }));

    const fixQuestion = screen.getByText('Pytanie do naprawy');
    const reviewQuestion = screen.getByText('Pytanie do review');
    const readyQuestion = screen.getByText('Gotowe pytanie');

    expect(screen.getByText('Reorder questions in the Manual order / All view.')).toBeInTheDocument();
    expect(screen.getByText('Queue 1')).toBeInTheDocument();
    expect(fixQuestion.compareDocumentPosition(reviewQuestion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(reviewQuestion.compareDocumentPosition(readyQuestion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('disables saving when the edited question still has blockers', () => {
    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Needs fix' }));
    fireEvent.click(screen.getByTitle('Edit question'));

    expect(screen.getByText('Question review')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Question' })).toBeDisabled();
    expect(
      screen.getByText('Legacy import contains inconsistent answer or explanation data.')
    ).toBeInTheDocument();
  });

  it('supports an initial review-launch context from the suite library', () => {
    render(
      <KangurQuestionsManagerRuntimeProvider
        suite={suite}
        onClose={vi.fn()}
        initialView={{
          listFilter: 'needs-fix',
          sortMode: 'review-queue',
          autoOpenQuestionId: 'question-fix',
        }}
      >
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    expect(screen.getByText('Question review')).toBeInTheDocument();
    expect(screen.getByText('Queue 1')).toBeInTheDocument();
    expect(screen.queryByText('Gotowe pytanie')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Question' })).toBeDisabled();
  });

  it('publishes ready questions for the current suite directly from the question manager', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie do publikacji',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'ready',
              auditFlags: [],
            },
          },
        });
      }
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([suite]);
      }
      return null;
    });

    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Publish ready questions' }));

    await waitFor(() => {
      expect(
        mutateAsyncMock.mock.calls.some(([input]) => input?.key === KANGUR_TEST_QUESTIONS_SETTING_KEY)
      ).toBe(true);
    });
    const questionCall = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_QUESTIONS_SETTING_KEY
    );
    expect(JSON.parse(String(questionCall?.[0]?.value))['question-ready'].editorial.workflowStatus).toBe(
      'published'
    );
    expect(toastMock).toHaveBeenCalledWith(
      'Published 1 ready question in Kangur 2024.',
      { variant: 'success' }
    );
  });

  it('can publish and go live in one step when the current suite is fully clean after publish', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie do publikacji',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'ready',
              auditFlags: [],
            },
          },
        });
      }
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([{ ...suite, publicationStatus: 'draft' }]);
      }
      return null;
    });

    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    expect(screen.getByText('Go live after publish')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go live for learners' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Publish and go live' }));

    await waitFor(() => {
      expect(
        mutateAsyncMock.mock.calls.some(([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY)
      ).toBe(true);
    });

    const questionCall = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_QUESTIONS_SETTING_KEY
    );
    const suiteCall = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY
    );

    expect(JSON.parse(String(questionCall?.[0]?.value))['question-ready'].editorial.workflowStatus).toBe(
      'published'
    );
    expect(JSON.parse(String(suiteCall?.[0]?.value))[0].publicationStatus).toBe('live');
    expect(toastMock).toHaveBeenCalledWith(
      'Published 1 ready question and marked Kangur 2024 live for learners (1 suite updated).',
      { variant: 'success' }
    );
  });

  it('can mark the current suite live directly from the question manager', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              auditFlags: [],
            },
          },
        });
      }
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([{ ...suite, publicationStatus: 'draft' }]);
      }
      return null;
    });

    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    expect(screen.getByText('This suite is fully published and ready to go live for learners.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go live for learners' }));

    await waitFor(() => {
      expect(
        mutateAsyncMock.mock.calls.some(([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY)
      ).toBe(true);
    });
    const suiteCall = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY
    );
    expect(JSON.parse(String(suiteCall?.[0]?.value))[0].publicationStatus).toBe('live');
    expect(toastMock).toHaveBeenCalledWith(
      'Suite Kangur 2024 is now live for learners (1 suite updated).',
      { variant: 'success' }
    );
  });

  it('can take the current live suite offline directly from the question manager', async () => {
    const liveSuite = {
      ...suite,
      publicationStatus: 'live' as const,
      publishedAt: '2026-03-09T12:00:00.000Z',
    };
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              auditFlags: [],
            },
          },
        });
      }
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([liveSuite]);
      }
      return null;
    });

    render(
      <KangurQuestionsManagerRuntimeProvider suite={liveSuite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    expect(
      screen.getByText(
        'This suite is live for learners. Draft edits, deletions, or unpublished duplicates will take it offline until the published set is complete again.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Take suite offline' }));

    await waitFor(() => {
      expect(
        mutateAsyncMock.mock.calls.some(([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY)
      ).toBe(true);
    });
    const suiteCall = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY
    );
    expect(JSON.parse(String(suiteCall?.[0]?.value))[0].publicationStatus).toBe('draft');
    expect(toastMock).toHaveBeenCalledWith(
      'Suite Kangur 2024 is now offline for learners (1 suite updated).',
      { variant: 'success' }
    );
  });

  it('offers local draft recovery for an edited question', () => {
    const recoveredQuestion = {
      id: 'question-ready',
      suiteId: 'suite-1',
      sortOrder: 1000,
      prompt: 'Recovered prompt from local draft',
      choices: [
        { label: 'A', text: '1' },
        { label: 'B', text: '2' },
      ],
      correctChoiceLabel: 'B',
      pointValue: 3,
      explanation: 'Recovered explanation',
      illustration: { type: 'none' as const },
      presentation: { layout: 'classic' as const, choiceStyle: 'list' as const },
      editorial: {
        source: 'manual' as const,
        reviewStatus: 'ready' as const,
        workflowStatus: 'draft' as const,
        auditFlags: [],
      },
    };
    writeQuestionEditorDraft({
      suiteId: 'suite-1',
      questionId: 'question-ready',
      isNewQuestion: false,
      question: recoveredQuestion,
      formData: {
        prompt: recoveredQuestion.prompt,
        choices: recoveredQuestion.choices,
        correctChoiceLabel: recoveredQuestion.correctChoiceLabel,
        pointValue: recoveredQuestion.pointValue,
        explanation: recoveredQuestion.explanation,
        illustration: recoveredQuestion.illustration,
        stemDocument: null,
        explanationDocument: null,
        hintDocument: null,
        presentation: recoveredQuestion.presentation,
        editorial: recoveredQuestion.editorial,
      },
      savedAt: '2026-03-09T10:00:00.000Z',
    });

    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.click(screen.getAllByTitle('Edit question')[0]!);

    expect(screen.getByText('Recovered local draft')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /restore draft/i }));

    expect(screen.getByDisplayValue('Recovered prompt from local draft')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Recovered explanation')).toBeInTheDocument();
  });

  it('asks for confirmation before closing a dirty question draft and clears the stored draft on discard', async () => {
    vi.useFakeTimers();
    try {
      render(
        <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
          <KangurQuestionsManagerPanel />
        </KangurQuestionsManagerRuntimeProvider>
      );

      fireEvent.click(screen.getAllByTitle('Edit question')[0]!);
      fireEvent.change(
        screen.getByPlaceholderText(/Enter the question text/i),
        {
          target: { value: 'Changed draft prompt' },
        }
      );

      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(readQuestionEditorDraft('suite-1', 'question-ready')).not.toBeNull();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByText('Discard question changes?')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

      expect(screen.queryByText('Question review')).not.toBeInTheDocument();
      expect(readQuestionEditorDraft('suite-1', 'question-ready')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('takes a live suite offline when a new draft question is added', async () => {
    const liveSuite = {
      ...suite,
      publicationStatus: 'live' as const,
      publishedAt: '2026-03-09T12:00:00.000Z',
    };
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              auditFlags: [],
            },
          },
        });
      }
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([liveSuite]);
      }
      return null;
    });

    render(
      <KangurQuestionsManagerRuntimeProvider suite={liveSuite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add question' }));
    fireEvent.change(screen.getByPlaceholderText(/Enter the question text/i), {
      target: { value: 'Nowe pytanie robocze' },
    });
    fireEvent.change(screen.getByPlaceholderText('Choice A text'), {
      target: { value: '3' },
    });
    fireEvent.change(screen.getByPlaceholderText('Choice B text'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByPlaceholderText('Choice C text'), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByPlaceholderText('Choice D text'), {
      target: { value: '6' },
    });
    fireEvent.change(screen.getByPlaceholderText('Choice E text'), {
      target: { value: '7' },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Step-by-step explanation of why the correct answer is correct/i),
      {
        target: { value: 'To jest wersja robocza.' },
      }
    );
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Add Question' })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add Question' }));

    await waitFor(() => {
      expect(
        mutateAsyncMock.mock.calls.some(([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY)
      ).toBe(true);
    });
    const suiteCall = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY
    );
    expect(JSON.parse(String(suiteCall?.[0]?.value))[0].publicationStatus).toBe('draft');
    expect(toastMock).toHaveBeenCalledWith(
      'Question saved. The live suite was taken offline because its published question set changed.',
      { variant: 'warning' }
    );
  });

  it('takes a live suite offline when duplicating a published question', async () => {
    const liveSuite = {
      ...suite,
      publicationStatus: 'live' as const,
      publishedAt: '2026-03-09T12:00:00.000Z',
    };
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              auditFlags: [],
            },
          },
        });
      }
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([liveSuite]);
      }
      return null;
    });

    render(
      <KangurQuestionsManagerRuntimeProvider suite={liveSuite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.click(screen.getByTitle('Duplicate question'));

    await waitFor(() => {
      expect(
        mutateAsyncMock.mock.calls.some(([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY)
      ).toBe(true);
    });
    const suiteCall = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY
    );
    expect(JSON.parse(String(suiteCall?.[0]?.value))[0].publicationStatus).toBe('draft');
    expect(toastMock).toHaveBeenCalledWith(
      'Question duplicated. The live suite was taken offline because its published question set changed.',
      { variant: 'warning' }
    );
  });

  it('takes a live suite offline when a published question is downgraded to draft', async () => {
    const liveSuite = {
      ...suite,
      publicationStatus: 'live' as const,
      publishedAt: '2026-03-09T12:00:00.000Z',
    };
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              publishedAt: '2026-03-09T12:00:00.000Z',
              auditFlags: [],
            },
          },
        });
      }
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([liveSuite]);
      }
      return null;
    });

    render(
      <KangurQuestionsManagerRuntimeProvider suite={liveSuite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.click(screen.getByTitle('Edit question'));
    fireEvent.click(screen.getByRole('button', { name: 'Draft' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Question' }));

    await waitFor(() => {
      expect(
        mutateAsyncMock.mock.calls.some(([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY)
      ).toBe(true);
    });
    const suiteCall = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_SUITES_SETTING_KEY
    );
    expect(JSON.parse(String(suiteCall?.[0]?.value))[0].publicationStatus).toBe('draft');
    expect(toastMock).toHaveBeenCalledWith(
      'Question saved. The live suite was taken offline because its published question set changed.',
      { variant: 'warning' }
    );
  });

  it('moves a published question back to draft when learner-facing content changes', async () => {
    settingsStoreMock.get.mockImplementation((key: string) => {
      if (key === KANGUR_TEST_QUESTIONS_SETTING_KEY) {
        return JSON.stringify({
          'question-ready': {
            id: 'question-ready',
            suiteId: 'suite-1',
            sortOrder: 1000,
            prompt: 'Gotowe pytanie',
            choices: [
              { label: 'A', text: '3' },
              { label: 'B', text: '4' },
            ],
            correctChoiceLabel: 'B',
            pointValue: 3,
            explanation: 'Bo 2+2=4',
            illustration: { type: 'none' },
            editorial: {
              source: 'manual',
              reviewStatus: 'ready',
              workflowStatus: 'published',
              publishedAt: '2026-03-09T12:00:00.000Z',
              auditFlags: [],
            },
          },
        });
      }
      if (key === KANGUR_TEST_SUITES_SETTING_KEY) {
        return JSON.stringify([suite]);
      }
      return null;
    });

    render(
      <KangurQuestionsManagerRuntimeProvider suite={suite} onClose={vi.fn()}>
        <KangurQuestionsManagerPanel />
      </KangurQuestionsManagerRuntimeProvider>
    );

    fireEvent.click(screen.getByTitle('Edit question'));
    fireEvent.change(screen.getByPlaceholderText(/Enter the question text/i), {
      target: { value: 'Gotowe pytanie po zmianie' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Question' }));

    await waitFor(() => {
      expect(
        mutateAsyncMock.mock.calls.some(([input]) => input?.key === KANGUR_TEST_QUESTIONS_SETTING_KEY)
      ).toBe(true);
    });

    const questionCall = mutateAsyncMock.mock.calls.find(
      ([input]) => input?.key === KANGUR_TEST_QUESTIONS_SETTING_KEY
    );
    expect(JSON.parse(String(questionCall?.[0]?.value))['question-ready'].editorial.workflowStatus).toBe(
      'draft'
    );
    expect(JSON.parse(String(questionCall?.[0]?.value))['question-ready'].editorial.publishedAt).toBeUndefined();
    expect(toastMock).toHaveBeenCalledWith(
      'Question updated. Learner-facing changes moved this published question back to draft.',
      { variant: 'warning' }
    );
  });
});
