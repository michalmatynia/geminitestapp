/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import TrainingSetup from '../TrainingSetup';

const { localeMock } = vi.hoisted(() => ({
  localeMock: vi.fn(() => 'pl'),
}));

const { translationMessages } = vi.hoisted(() => ({
  translationMessages: {
    pl: {
      KangurTrainingSetup: {
        categories: {
          addition: 'Dodawanie',
          subtraction: 'Odejmowanie',
          multiplication: 'Mnozenie',
          division: 'Dzielenie',
          decimals: 'Ulamki',
          powers: 'Potegi',
          roots: 'Pierwiastki',
        },
        difficulty: {
          easy: 'Latwy',
          medium: 'Sredni',
          hard: 'Trudny',
        },
        difficultySummary: {
          easy: 'latwy',
          medium: 'sredni',
          hard: 'trudny',
        },
        difficultyMeta: '{seconds}s · zakres 1-{range}',
        summaryLabel: 'Wybrano {categories} kategorii, {count} pytan, poziom {difficulty}.',
        toggleAll: {
          selectAll: 'Zaznacz wszystkie',
          clear: 'Odznacz wszystkie',
        },
      },
    },
    en: {
      KangurTrainingSetup: {
        categories: {
          addition: 'Addition',
          subtraction: 'Subtraction',
          multiplication: 'Multiplication',
          division: 'Division',
          decimals: 'Fractions',
          powers: 'Powers',
          roots: 'Roots',
        },
        difficulty: {
          easy: 'Easy',
          medium: 'Medium',
          hard: 'Hard',
        },
        difficultySummary: {
          easy: 'easy',
          medium: 'medium',
          hard: 'hard',
        },
        difficultyMeta: '{seconds}s · range 1-{range}',
        summaryLabel: '{categories} categories selected, {count} questions, {difficulty} level.',
        toggleAll: {
          selectAll: 'Select all',
          clear: 'Clear all',
        },
      },
    },
  },
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useLocale: () => localeMock(),
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const locale = localeMock() || 'pl';
      const dictionary =
        translationMessages[locale as keyof typeof translationMessages] ?? translationMessages.pl;
      const namespaceParts = (namespace ?? '').split('.').filter(Boolean);
      const keyParts = key.split('.').filter(Boolean);
      const resolved = [...namespaceParts, ...keyParts].reduce<unknown>((current, part) => {
        if (!current || typeof current !== 'object') {
          return undefined;
        }

        return (current as Record<string, unknown>)[part];
      }, dictionary);

      if (typeof resolved !== 'string') {
        return key;
      }

      return Object.entries(values ?? {}).reduce(
        (message, [valueKey, value]) => message.replaceAll(`{${valueKey}}`, String(value)),
        resolved
      );
    },
}));

vi.mock('framer-motion', () => {
  const createMotionTag = (tag: keyof React.JSX.IntrinsicElements) =>
    function MotionTag({
      animate: _animate,
      children,
      exit: _exit,
      initial: _initial,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      animate?: unknown;
      children?: React.ReactNode;
      exit?: unknown;
      initial?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) {
      return React.createElement(tag, props, children);
    };

  return {
    motion: {
      button: createMotionTag('button'),
      div: createMotionTag('div'),
    },
  };
});

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

describe('TrainingSetup', () => {
  it('surfaces pressed state for category and question-count selections', () => {
    localeMock.mockReturnValue('pl');
    render(<TrainingSetup onStart={vi.fn()} />);

    const heading = screen.getByTestId('training-setup-heading');
    const shell = screen.getByTestId('training-setup-shell');
    const categoryGroup = screen.getByTestId('training-setup-category-group');
    const countGroup = screen.getByTestId('training-setup-count-group');
    expect(heading).toHaveClass('flex', 'flex-row', 'items-start', 'text-left');
    expect(shell).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-panel-padding-xl',
      'kangur-glass-surface-solid',
      'kangur-panel-shell'
    );
    expect(categoryGroup).toHaveClass('kangur-segmented-control', 'rounded-[28px]', 'border');
    expect(countGroup).toHaveClass('kangur-segmented-control', 'rounded-[28px]', 'border');
    expect(within(heading).getByRole('heading', { name: 'Dobierz trening' })).toHaveClass(
      'text-xl',
      'sm:text-2xl',
      '[color:var(--kangur-accent-indigo-start,#a855f7)]'
    );
    expect(screen.queryByRole('heading', { name: 'Wybierz poziom trudności' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Poziom trudności' })).toBeInTheDocument();

    const additionButton = screen.getByRole('button', { name: 'Dodawanie' });
    const tenQuestionsButton = screen.getByRole('button', { name: '10 pytań' });
    const twentyQuestionsButton = screen.getByRole('button', { name: '20 pytań' });
    expect(additionButton).toHaveAttribute('aria-pressed', 'true');
    expect(additionButton).toHaveClass(
      'kangur-segmented-control-item',
      'kangur-segmented-control-item-active',
      'rounded-[18px]'
    );
    expect(tenQuestionsButton).toHaveAttribute('aria-pressed', 'true');
    expect(tenQuestionsButton).toHaveClass(
      'kangur-segmented-control-item',
      'kangur-segmented-control-item-active',
      'rounded-[18px]'
    );
    expect(twentyQuestionsButton).toHaveAttribute('aria-pressed', 'false');
    expect(twentyQuestionsButton).toHaveClass('kangur-segmented-control-item', 'rounded-[18px]');
    expect(twentyQuestionsButton).not.toHaveClass('kangur-segmented-control-item-active');
    expect(screen.getByRole('button', { name: /Start/i })).toHaveClass('kangur-cta-pill', 'primary-cta');
    expect(screen.getByRole('button', { name: /Odznacz wszystkie|Zaznacz wszystkie/i })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );
    expect(additionButton).toHaveClass('touch-manipulation', 'select-none');
    expect(tenQuestionsButton).toHaveClass('touch-manipulation', 'select-none');
    expect(screen.getByRole('button', { name: /Start/i })).toHaveClass(
      'min-h-11',
      'px-4',
      'touch-manipulation'
    );

    fireEvent.click(additionButton);
    fireEvent.click(twentyQuestionsButton);

    expect(additionButton).toHaveAttribute('aria-pressed', 'false');
    expect(additionButton).not.toHaveClass('kangur-segmented-control-item-active');
    expect(twentyQuestionsButton).toHaveAttribute('aria-pressed', 'true');
    expect(twentyQuestionsButton).toHaveClass('kangur-segmented-control-item-active');
  });

  it('applies the suggested training preset and shows the recommendation card', () => {
    localeMock.mockReturnValue('pl');
    render(
      <TrainingSetup
        onStart={vi.fn()}
        suggestedSelection={{
          categories: ['division'],
          count: 15,
          difficulty: 'hard',
        }}
        suggestionDescription='To najmocniej podbije dzisiejszy postęp.'
        suggestionLabel='Mocna passa'
        suggestionTitle='Polecany trening: Dzielenie'
      />
    );

    expect(screen.getByTestId('training-setup-suggestion-card')).toBeInTheDocument();
    expect(screen.getByTestId('training-setup-suggestion-label')).toHaveTextContent('Mocna passa');
    expect(screen.getByTestId('training-setup-suggestion-title')).toHaveTextContent(
      'Polecany trening: Dzielenie'
    );
    expect(screen.getByTestId('training-setup-suggestion-description')).toHaveTextContent(
      'To najmocniej podbije dzisiejszy postęp.'
    );
    expect(screen.getByRole('button', { name: 'Dzielenie' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Dodawanie' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: '15 pytań' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('group', { name: 'Poziom trudności' })).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-option-hard')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the training chrome in English on the English route', () => {
    localeMock.mockReturnValue('en');
    render(<TrainingSetup onStart={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Build your training' })).toBeInTheDocument();
    expect(
      screen.getByText('Choose the level, categories, and number of questions for one session.')
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Question categories' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Question count' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '10 questions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start! 🚀' })).toBeInTheDocument();
  });
});
