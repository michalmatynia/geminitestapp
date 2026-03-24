/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonPanelProgress', () => ({
  useKangurLessonPanelProgress: () => ({
    markSectionOpened: vi.fn(),
    markSectionViewedCount: vi.fn(),
    recordPanelTime: vi.fn(),
    sectionProgress: {},
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => false,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonPanelCtaSync', () => ({
  useKangurLessonPanelCtaSync: () => undefined,
}));

vi.mock('@/features/kangur/ui/learner-activity/hooks', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/kangur/ui/learner-activity/hooks')>();
  return {
    ...actual,
    useLessonTimeTracking: () => ({
      recordComplete: vi.fn(async () => undefined),
      recordPanelTime: vi.fn(),
    }),
  };
});

vi.mock('@/features/kangur/ui/components/EnglishAdverbsFrequencyRoutineGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-english-adverbs-frequency-game'>
      <button type='button' onClick={onFinish}>
        Finish adverbs frequency game
      </button>
    </div>
  ),
}));

import EnglishAdverbsFrequencyLesson from '@/features/kangur/ui/components/EnglishAdverbsFrequencyLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('EnglishAdverbsFrequencyLesson', () => {
  it('opens the frequency studio game section and returns to the lesson hub', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishAdverbsFrequencyLesson />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('lesson-hub-section-game_frequency_studio')).toBeInTheDocument();
    expect(screen.getByText('Frequency Studio')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_frequency_studio'));

    await waitFor(() => {
      expect(screen.getByTestId('english-adverbs-frequency-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-english-adverbs-frequency-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish adverbs frequency game' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_frequency_studio')).toBeInTheDocument();
    });
  });

  it('keeps the expanded five-slide answer section available in the lesson flow', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishAdverbsFrequencyLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-hub-section-answer'));

    await waitFor(() => {
      expect(screen.getByText('How often do you go to the park?')).toBeInTheDocument();
    });

    expect(screen.getByTestId('lesson-slide-indicator-0')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-slide-indicator-1')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-slide-indicator-2')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-slide-indicator-3')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-slide-indicator-4')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-3'));

    await waitFor(() => {
      expect(screen.getByText('I sometimes go to the park.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-4'));

    await waitFor(() => {
      expect(screen.getByText('I usually go to the library.')).toBeInTheDocument();
    });
    expect(screen.getByText('I usually go to the library.')).toBeInTheDocument();
    expect(screen.getByText('I never go to the swimming pool on school days.')).toBeInTheDocument();
  });
});
