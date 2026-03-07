/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurQuestionsManagerRuntimeProvider } from '@/features/kangur/admin/context/KangurQuestionsManagerRuntimeContext';
vi.mock('@/features/kangur/ui/components/KangurTestQuestionRenderer', () => ({
  KangurTestQuestionRenderer: () => <div data-testid='question-preview' />,
}));

import { KangurTestQuestionEditor } from '@/features/kangur/admin/KangurTestQuestionEditor';
import type { QuestionFormData } from '@/features/kangur/test-questions';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';

function buildFormData(overrides: Partial<QuestionFormData> = {}): QuestionFormData {
  return {
    prompt: 'Which option is correct?',
    choices: [
      { label: 'A', text: 'First answer' },
      { label: 'B', text: 'Second answer' },
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
  sortOrder: 1000,
};

describe('KangurTestQuestionEditor', () => {
  it('auto-relables choices through the editor context', () => {
    const handleChange = vi.fn();

    render(
      <StatefulQuestionEditorHarness
        initialValue={buildFormData({
          choices: [
            { label: 'Z', text: 'First answer' },
            { label: 'Y', text: 'Second answer' },
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
    render(<StatefulQuestionEditorHarness initialValue={buildFormData()} suiteTitle='Sample suite' />);

    fireEvent.change(screen.getAllByLabelText('Choice label')[0], {
      target: { value: 'Z' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sync labels to choices/i }));

    const panelLabelInputs = screen.getAllByLabelText('Panel label') as HTMLInputElement[];
    expect(panelLabelInputs[0]?.value).toBe('Z');
  });

  it('falls back to the questions manager runtime suite title when no override is provided', () => {
    render(
      <KangurQuestionsManagerRuntimeProvider suite={runtimeSuite} onClose={vi.fn()}>
        <StatefulQuestionEditorHarness initialValue={buildFormData()} suiteTitle={undefined} />
      </KangurQuestionsManagerRuntimeProvider>
    );

    expect(screen.getByText('Runtime suite')).toBeInTheDocument();
  });
});
