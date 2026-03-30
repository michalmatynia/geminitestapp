/**
 * @vitest-environment jsdom
 */
'use client';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { localeState } = vi.hoisted(() => ({
  localeState: {
    value: 'en',
  },
}));

import { KangurQuestionsManagerRuntimeProvider } from '@/features/kangur/admin/context/KangurQuestionsManagerRuntimeContext';
vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
}));

vi.mock('@/features/kangur/ui/components/KangurTestQuestionRenderer', () => ({
  KangurTestQuestionRenderer: ({
    selectedLabel,
    showAnswer,
  }: {
    selectedLabel: string | null;
    showAnswer: boolean;
  }) => (
    <div
      data-testid='question-preview'
      data-selected-label={selectedLabel ?? ''}
      data-show-answer={showAnswer ? 'true' : 'false'}
    />
  ),
}));

import { KangurTestQuestionEditor } from '@/features/kangur/admin/KangurTestQuestionEditor';
import type { QuestionFormData } from '@/features/kangur/test-suites/questions';
import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';

function buildFormData(overrides: Partial<QuestionFormData> = {}): QuestionFormData {
  return {
    prompt: 'Which option is correct?',
    choices: [
      { label: 'A', text: 'First answer', svgContent: '' },
      { label: 'B', text: 'Second answer', svgContent: '' },
    ],
    correctChoiceLabel: 'A',
    pointValue: 3,
    explanation: '',
    illustration: {
      type: 'panels',
      layout: 'row',
      panels: [
        { id: 'panel-a', label: 'A', svgContent: '', description: '' },
        { id: 'panel-b', label: 'B', svgContent: '', description: '' },
      ],
    },
    stemDocument: null,
    explanationDocument: null,
    hintDocument: null,
    presentation: { layout: 'classic', choiceStyle: 'list' },
    editorial: { source: 'manual', reviewStatus: 'ready', workflowStatus: 'draft', auditFlags: [] },
    ...overrides,
  };
}

function StatefulQuestionEditorHarness({
  initialValue,
  onChange,
  suiteTitle,
}: {
  initialValue: QuestionFormData;
  onChange?: (nextValue: QuestionFormData) => void;
  suiteTitle?: string;
}): React.JSX.Element {
  const [formData, setFormData] = React.useState(initialValue);

  return (
    <KangurTestQuestionEditor
      formData={formData}
      onChange={(nextValue): void => {
        setFormData(nextValue);
        onChange?.(nextValue);
      }}
      suiteTitle={suiteTitle}
    />
  );
}

const runtimeSuite: KangurTestSuite = {
  id: 'suite-1',
  title: 'Runtime suite',
  description: 'Runtime suite description',
  year: 2026,
  gradeLevel: 'III-IV',
  category: 'math',
  enabled: true,
  publicationStatus: 'draft',
  sortOrder: 1000,
};

describe('KangurTestQuestionEditor', () => {
  it('auto-relables choices through the editor context', () => {
    localeState.value = 'en';
    const handleChange = vi.fn();

    render(
      <StatefulQuestionEditorHarness
        initialValue={buildFormData({
          choices: [
            { label: 'Z', text: 'First answer', svgContent: '' },
            { label: 'Y', text: 'Second answer', svgContent: '' },
          ],
          correctChoiceLabel: 'Y',
        })}
        onChange={handleChange}
        suiteTitle='Sample suite'
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /auto-label/i }));

    const latestValue = handleChange.mock.calls.at(-1)?.[0] as QuestionFormData;
    expect(latestValue.choices.map((choice) => choice.label)).toEqual(['A', 'B']);
    expect(latestValue.correctChoiceLabel).toBe('B');
  });

  it('syncs panel labels from choice labels through the illustration runtime context', () => {
    localeState.value = 'en';
    render(<StatefulQuestionEditorHarness initialValue={buildFormData()} suiteTitle='Sample suite' />);

    fireEvent.change(screen.getAllByLabelText('Choice label')[0], {
      target: { value: 'Z' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sync labels to choices/i }));

    const panelLabelInputs = screen.getAllByLabelText('Panel label');
    expect(panelLabelInputs[0]?.value).toBe('Z');
  });

  it('shows legacy review metadata when present', () => {
    localeState.value = 'en';
    render(
      <StatefulQuestionEditorHarness
        initialValue={buildFormData({
          presentation: { layout: 'classic', choiceStyle: 'grid' },
          editorial: {
            source: 'legacy-import',
            reviewStatus: 'needs-review',
            workflowStatus: 'draft',
            auditFlags: ['legacy_choice_descriptions'],
          },
        })}
      />
    );

    expect(screen.getAllByText('Needs review').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Choice grid').length).toBeGreaterThan(0);
    expect(screen.getByText('Publishing state')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ready to publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument();
    expect(screen.getByText('legacy choice descriptions')).toBeInTheDocument();
    expect(screen.getByText('Question review')).toBeInTheDocument();
    expect(screen.getByText('Review before publish')).toBeInTheDocument();
    expect(
      screen.getByText('Add an explanation so learners can review the reasoning after answering.')
    ).toBeInTheDocument();
  });

  it('shows structural blockers when the draft is not save-ready', () => {
    localeState.value = 'en';
    render(
      <StatefulQuestionEditorHarness
        initialValue={buildFormData({
          prompt: '',
          explanation: '',
          choices: [{ label: 'A', text: '', svgContent: '' }],
          correctChoiceLabel: 'B',
        })}
      />
    );

    expect(screen.getAllByText('Needs fixes').length).toBeGreaterThan(0);
    const requiredSection = screen.getByText('Required before save').parentElement;
    const reviewSection = screen.getByText('Review before publish').parentElement;

    expect(requiredSection).not.toBeNull();
    expect(reviewSection).not.toBeNull();
    expect(requiredSection?.textContent).toContain('Add the learner-facing question prompt.');
    expect(requiredSection?.textContent).toContain('Every answer choice needs visible text.');
    expect(reviewSection?.textContent).toContain(
      'Add an explanation so learners can review the reasoning after answering.'
    );
  });

  it('falls back to the questions manager runtime suite title when no override is provided', () => {
    localeState.value = 'en';
    render(
      <KangurQuestionsManagerRuntimeProvider suite={runtimeSuite} onClose={vi.fn()}>
        <StatefulQuestionEditorHarness initialValue={buildFormData()} suiteTitle={undefined} />
      </KangurQuestionsManagerRuntimeProvider>
    );

    expect(screen.getByText('Runtime suite')).toBeInTheDocument();
  });

  it('shows published workflow state when the question is already published', () => {
    localeState.value = 'en';
    render(
      <StatefulQuestionEditorHarness
        initialValue={buildFormData({
          editorial: {
            source: 'manual',
            reviewStatus: 'ready',
            workflowStatus: 'published',
            auditFlags: [],
            publishedAt: '2026-03-09T10:00:00.000Z',
          },
        })}
      />
    );

    expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
    expect(screen.getByText(/Last published:/i)).toBeInTheDocument();
  });

  it('switches the preview into correct-answer review mode', () => {
    localeState.value = 'en';
    render(<StatefulQuestionEditorHarness initialValue={buildFormData()} />);

    fireEvent.click(screen.getByText('Correct answer', { selector: 'button' }));

    const preview = screen.getByTestId('question-preview');
    expect(preview).toHaveAttribute('data-show-answer', 'true');
    expect(preview).toHaveAttribute('data-selected-label', 'A');
    expect(screen.getByText('Correct answer review')).toBeInTheDocument();
  });

  it('switches the preview into wrong-answer review mode', () => {
    localeState.value = 'en';
    render(<StatefulQuestionEditorHarness initialValue={buildFormData()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Wrong answer' }));

    const preview = screen.getByTestId('question-preview');
    expect(preview).toHaveAttribute('data-show-answer', 'true');
    expect(preview).toHaveAttribute('data-selected-label', 'B');
    expect(screen.getByText('Wrong answer review')).toBeInTheDocument();
  });

  it('supports compact preview framing', () => {
    localeState.value = 'en';
    render(<StatefulQuestionEditorHarness initialValue={buildFormData()} />);

    const frame = screen.getByTestId('question-preview-frame');
    expect(frame).toHaveClass('max-w-xl');

    fireEvent.click(screen.getByRole('button', { name: 'Compact' }));

    expect(frame).toHaveClass('max-w-[360px]');
    expect(frame).not.toHaveClass('max-w-xl');
  });

  it('offers a quick repair to add an explanation starter', () => {
    localeState.value = 'en';
    render(<StatefulQuestionEditorHarness initialValue={buildFormData({ explanation: '' })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add explanation starter' }));

    expect(
      screen.getByDisplayValue('The correct answer is A: First answer. Add the worked reasoning here.')
    ).toBeInTheDocument();
  });

  it('offers a quick repair to switch split layouts back to classic without an illustration', () => {
    localeState.value = 'en';
    render(
      <StatefulQuestionEditorHarness
        initialValue={buildFormData({
          illustration: { type: 'none' },
          presentation: { layout: 'split-illustration-left', choiceStyle: 'list' },
        })}
      />
    );

    expect(
      screen.getByText('Split layouts need an illustration before they can be saved.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to classic layout' }));

    expect(
      screen.queryByText('Split layouts need an illustration before they can be saved.')
    ).not.toBeInTheDocument();
  });

  it('offers a quick repair to add starter notes for SVG-backed choices', () => {
    localeState.value = 'en';
    render(
      <StatefulQuestionEditorHarness
        initialValue={buildFormData({
          choices: [
            {
              label: 'A',
              text: 'First answer',
              description: '',
              svgContent:
                '<svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg"><circle cx="5" cy="5" r="4" /></svg>',
            },
            { label: 'B', text: 'Second answer', svgContent: '' },
          ],
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add starter notes for SVG choices' }));

    expect(screen.getByDisplayValue('Describe what is shown in option A.')).toBeInTheDocument();
  });

  it('applies the grid answer-card preset', () => {
    localeState.value = 'en';
    render(<StatefulQuestionEditorHarness initialValue={buildFormData()} />);

    fireEvent.click(screen.getByRole('button', { name: /^Grid answer cards/i }));

    expect(screen.getAllByText('Choice grid').length).toBeGreaterThan(0);
  });

  it('applies the split illustration preset and seeds illustration panels', () => {
    localeState.value = 'en';
    render(
      <StatefulQuestionEditorHarness
        initialValue={buildFormData({
          illustration: { type: 'none' },
          presentation: { layout: 'classic', choiceStyle: 'list' },
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^Illustration left/i }));

    expect(screen.getAllByText('Choice grid').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Split layouts need an illustration before they can be saved.')
    ).toBeInTheDocument();
    const panelLabelInputs = screen.getAllByLabelText('Panel label');
    expect(panelLabelInputs[0]?.value).toBe('A');
    expect(panelLabelInputs[1]?.value).toBe('B');
  });

  it('renders the editor shell in Ukrainian', () => {
    localeState.value = 'uk-UA';

    render(
      <StatefulQuestionEditorHarness
        initialValue={buildFormData({
          explanation: '',
          presentation: { layout: 'classic', choiceStyle: 'grid' },
          editorial: {
            source: 'legacy-import',
            reviewStatus: 'needs-review',
            workflowStatus: 'published',
            auditFlags: ['legacy_choice_descriptions'],
            publishedAt: '2026-03-09T10:00:00.000Z',
          },
        })}
      />
    );

    expect(screen.getByText('Робоча зона запитання')).toBeInTheDocument();
    expect(screen.getByText('Перевірка запитання')).toBeInTheDocument();
    expect(screen.getByText('Стан публікації')).toBeInTheDocument();
    expect(screen.getByText('Остання публікація:', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Додайте пояснення/)).toBeInTheDocument();
    expect(screen.getAllByText('Сітка варіантів').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Правильна відповідь' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Компактний' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Додати варіант' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Синхронізувати позначки з варіантами' })).toBeInTheDocument();
  });
});
