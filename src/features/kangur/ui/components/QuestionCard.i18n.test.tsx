/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@/__tests__/test-utils';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

import enMessages from '@/i18n/messages/en.json';

import QuestionCard from './QuestionCard';

const renderQuestionCard = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );

describe('QuestionCard i18n', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders English timer and result copy for regular questions', () => {
    renderQuestionCard(
      <QuestionCard
        question={{
          question: '6 + 1',
          choices: [7, 8, 9, 10],
          answer: 7,
        }}
        onAnswer={vi.fn()}
        questionNumber={1}
        total={10}
        timeLimit={30}
      />
    );

    expect(screen.getByText('Question 1 of 10')).toBeInTheDocument();
    expect(screen.getByTestId('question-card-timer-bar')).toHaveAttribute(
      'aria-label',
      'Time remaining'
    );
    expect(screen.getByTestId('question-card-timer-bar')).toHaveAttribute(
      'aria-valuetext',
      '30 seconds left'
    );
    expect(screen.getByRole('group', { name: '6 + 1' })).toHaveAttribute('aria-label', 'Answers');
    expect(screen.getByText('What is the answer?')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('question-card-choice-8'));

    expect(screen.getByRole('status')).toHaveTextContent('❌ The answer is 7');
  });

  it('renders English accessibility copy for clock questions', () => {
    renderQuestionCard(
      <QuestionCard
        question={{
          question: 'CLOCK:3:15',
          choices: ['3:15', '3:30', '4:15', '4:30'],
          answer: '3:15',
        }}
        onAnswer={vi.fn()}
        questionNumber={2}
        total={10}
        timeLimit={20}
      />
    );

    expect(
      screen.getByRole('img', { name: 'The analog clock shows 3:15.' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'What time does the clock show?' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Choose the answer that matches the position of the hands.')
    ).toBeInTheDocument();
  });
});
