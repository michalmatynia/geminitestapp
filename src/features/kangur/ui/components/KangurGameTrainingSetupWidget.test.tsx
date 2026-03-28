/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRecommendedTrainingSetupMock, useKangurGameRuntimeMock } = vi.hoisted(() => ({
  getRecommendedTrainingSetupMock: vi.fn(),
  useKangurGameRuntimeMock: vi.fn(),
}));

const { localeState } = vi.hoisted(() => ({
  localeState: {
    value: 'pl' as 'de' | 'en' | 'pl' | 'uk',
  },
}));

const { translationState } = vi.hoisted(() => ({
  translationState: {
    missing: false,
  },
}));

const trainingSetupTranslations = {
  'KangurGamePage.screens.training.description': {
    de: 'Konfiguriere das gemischte Training und wahl den Fragenbereich.',
    en: 'Configure mixed training and choose the question range.',
    pl: 'Skonfiguruj trening mieszany i dobierz zakres pytan.',
  },
  'KangurGamePage.screens.training.label': {
    de: 'Training einrichten',
    en: 'Training setup',
    pl: 'Konfiguracja treningu',
  },
  'KangurGamePage.screens.training.wordmarkLabel': {
    de: 'Training',
    en: 'Training',
    pl: 'Trening',
  },
} as const;

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      translationState.missing
        ? key
        : trainingSetupTranslations[`${namespace}.${key}`]?.[localeState.value] ?? key,
}));

vi.mock('@/features/kangur/ui/context/KangurGameRuntimeContext', () => ({
  useKangurGameRuntime: useKangurGameRuntimeMock,
}));

vi.mock('@/features/kangur/ui/services/game-setup-recommendations', () => ({
  getRecommendedTrainingSetup: getRecommendedTrainingSetupMock,
}));

vi.mock('@/features/kangur/ui/components/KangurGameSetupShell', () => ({
  renderKangurGameSetupShell: ({
    children,
    description,
    testId,
    title,
    visualTitle,
  }: {
    children: React.ReactNode;
    description: React.ReactNode;
    testId: string;
    title: string;
    visualTitle?: React.ReactNode;
  }) => (
    <section data-testid={testId}>
      <h1>{title}</h1>
      <div data-testid='mock-training-shell-description'>{description}</div>
      {visualTitle}
      {children}
    </section>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurTrainingSetupPanel', () => ({
  KangurTrainingSetupPanel: () => <div data-testid='mock-training-setup-panel'>mock-training-setup-panel</div>,
}));

vi.mock('@/features/kangur/ui/components/KangurPracticeAssignmentBanner', () => ({
  default: () => <div data-testid='mock-practice-assignment-banner'>mock-practice-assignment-banner</div>,
}));

import { KangurGameTrainingSetupWidget } from '@/features/kangur/ui/components/KangurGameTrainingSetupWidget';

describe('KangurGameTrainingSetupWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeState.value = 'pl';
    translationState.missing = false;
    getRecommendedTrainingSetupMock.mockReturnValue({
      description: 'Lagodny start z dwiema kategoriami pomoze zlapac rytm.',
      label: 'Start',
      selection: {
        categories: ['addition', 'subtraction'],
        count: 5,
        difficulty: 'easy',
      },
      title: 'Polecany trening na start',
    });
    useKangurGameRuntimeMock.mockReturnValue({
      activePracticeAssignment: null,
      basePath: '/kangur',
      handleHome: vi.fn(),
      handleStartTraining: vi.fn(),
      progress: {},
      screen: 'training',
    });
  });

  it('renders the English training wordmark as SVG text while keeping the setup title localized', () => {
    localeState.value = 'en';

    render(<KangurGameTrainingSetupWidget />);

    const art = screen.getByTestId('kangur-training-heading-art');
    const text = art.querySelector('text');

    expect(screen.getByRole('heading', { name: 'Training setup' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-training-shell-description')).toHaveTextContent(
      'Configure mixed training and choose the question range.'
    );
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Training');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('renders the German training wordmark as SVG text while keeping the setup title localized', () => {
    localeState.value = 'de';

    render(<KangurGameTrainingSetupWidget />);

    const art = screen.getByTestId('kangur-training-heading-art');
    const text = art.querySelector('text');

    expect(screen.getByRole('heading', { name: 'Training einrichten' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-training-shell-description')).toHaveTextContent(
      'Konfiguriere das gemischte Training und wahl den Fragenbereich.'
    );
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Training');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('falls back to Ukrainian training copy when translations are unavailable', () => {
    localeState.value = 'uk';
    translationState.missing = true;

    render(<KangurGameTrainingSetupWidget />);

    const art = screen.getByTestId('kangur-training-heading-art');
    const text = art.querySelector('text');

    expect(screen.getByRole('heading', { name: 'Налаштування тренування' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-training-shell-description')).toHaveTextContent(
      'Налаштуйте змішане тренування й виберіть діапазон запитань.'
    );
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Тренування');
    expect(text).toHaveAttribute('font-size', '68');
    expect(text).not.toHaveAttribute('textLength');
    expect(text).not.toHaveAttribute('lengthAdjust');
  });

  it('falls back to English training copy instead of Polish when translations are unavailable', () => {
    localeState.value = 'en';
    translationState.missing = true;

    render(<KangurGameTrainingSetupWidget />);

    const art = screen.getByTestId('kangur-training-heading-art');
    const text = art.querySelector('text');

    expect(screen.getByRole('heading', { name: 'Mixed training' })).toBeInTheDocument();
    expect(screen.getByTestId('mock-training-shell-description')).toHaveTextContent(
      'Choose the level, categories, and number of questions for one session.'
    );
    expect(text).not.toBeNull();
    expect(text).toHaveTextContent('Training');
  });
});
