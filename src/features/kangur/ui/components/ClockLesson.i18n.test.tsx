/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

vi.mock('@/features/kangur/ui/components/ClockTrainingGame', () => ({
  __esModule: true,
  default: ({ section }: { section?: string }) => (
    <div data-testid='mock-clock-training-game'>{section ?? 'mixed'}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNarrator', () => ({
  KangurLessonNarrator: () => <div data-testid='kangur-lesson-narrator' />,
}));

import { createDefaultKangurProgressState } from '@/features/kangur/shared/contracts/kangur';

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: vi.fn(),
    createLessonCompletionReward: vi.fn(() => ({
      xp: 32,
      scorePercent: 100,
      progressUpdates: {},
    })),
    loadProgress: vi.fn(() => createDefaultKangurProgressState()),
  };
});

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import ClockLesson from '@/features/kangur/ui/components/ClockLesson';

const renderLesson = (options: { locale?: string; messages?: typeof enMessages } = {}) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      <ClockLesson />
    </NextIntlClientProvider>
  );

describe('ClockLesson i18n', () => {
  it('renders English hub labels', () => {
    renderLesson();

    expect(screen.getByTestId('lesson-hub-section-hours')).toHaveTextContent('Hours');
    expect(screen.getByTestId('lesson-hub-section-minutes')).toHaveTextContent('Minutes');
    expect(screen.getByTestId('lesson-hub-section-combined')).toHaveTextContent(
      'Combining the hands'
    );
    expect(screen.getByTestId('lesson-hub-section-game_hours')).toHaveTextContent(
      'Practice: Hours'
    );
    expect(screen.getByTestId('lesson-hub-section-game_minutes')).toHaveTextContent(
      'Practice: Minutes'
    );
    expect(screen.getByTestId('lesson-hub-section-game_combined')).toHaveTextContent(
      'Practice: Full time'
    );
  });

  it('renders English hours and minutes lesson copy', async () => {
    renderLesson();

    fireEvent.click(screen.getByTestId('lesson-hub-section-hours'));

    await waitFor(() => {
      expect(screen.getByText('What does the short hand show?')).toBeInTheDocument();
    });
    expect(
      screen.getByText('The short hand jumps from hour to hour.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Back to topics/i }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-minutes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-hub-section-minutes'));

    await waitFor(() => {
      expect(screen.getByText('What does the long hand show?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    await waitFor(() => {
      expect(screen.getByText('Minute map by fives')).toBeInTheDocument();
    });
    expect(screen.getByText(/We jump by 5 minutes/i)).toBeInTheDocument();
  });

  it('renders English practice stage copy', async () => {
    renderLesson();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Practice: Hours/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Back to topics/i })).toBeInTheDocument();
    expect(screen.getByTestId('mock-clock-training-game')).toHaveTextContent('hours');
  });

  it('renders German hub labels and lesson copy', async () => {
    renderLesson({ locale: 'de', messages: deMessages });

    expect(screen.getByTestId('lesson-hub-section-hours')).toHaveTextContent('Stunden');
    expect(screen.getByTestId('lesson-hub-section-minutes')).toHaveTextContent('Minuten');
    expect(screen.getByTestId('lesson-hub-section-combined')).toHaveTextContent(
      'Beide Zeiger zusammen'
    );
    expect(screen.getByTestId('lesson-hub-section-game_hours')).toHaveTextContent(
      'Übung: Stunden'
    );
    expect(screen.queryByText('Hours')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-hours'));

    await waitFor(() => {
      expect(screen.getByText('Was zeigt der kurze Zeiger?')).toBeInTheDocument();
    });
    expect(
      screen.getByText('Der kurze Zeiger springt von Stunde zu Stunde.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Zurück zu den Themen/i }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-minutes')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-hub-section-minutes'));

    await waitFor(() => {
      expect(screen.getByText('Was zeigt der lange Zeiger?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    await waitFor(() => {
      expect(screen.getByText('Minutenkarte in Fünferschritten')).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Wir springen in 5-Minuten-Schritten/i)
    ).toBeInTheDocument();
  });

  it('renders German practice stage copy', async () => {
    renderLesson({ locale: 'de', messages: deMessages });

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_hours'));

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /Übung: Stunden/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Zurück zu den Themen/i })).toBeInTheDocument();
    expect(screen.getByTestId('mock-clock-training-game')).toHaveTextContent('hours');
  });
});
