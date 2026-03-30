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
  useKangurLessonPanelCtaSync: () => vi.fn(),
}));

vi.mock('@/features/kangur/ui/learner-activity/hooks', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/kangur/ui/learner-activity/hooks')>();
  return {
    ...actual,
    useKangurLessonSubsectionProgress: () => ({
      markSectionOpened: vi.fn(),
      markSectionViewedCount: vi.fn(),
      recordPanelTime: vi.fn(),
      sectionProgress: {},
    }),
    useLessonTimeTracking: () => ({
      recordComplete: vi.fn(async () => undefined),
      recordPanelTime: vi.fn(),
    }),
  };
});

vi.mock('@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime', () => ({
  __esModule: true,
  KangurLaunchableGameInstanceRuntime: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-english-comparatives-game'>
      <button type='button' onClick={onFinish}>
        Finish compare and crown game
      </button>
    </div>
  ),
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-english-comparatives-game'>
      <button type='button' onClick={onFinish}>
        Finish compare and crown game
      </button>
    </div>
  ),
}));

import EnglishComparativesSuperlativesLesson from '@/features/kangur/ui/components/EnglishComparativesSuperlativesLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('EnglishComparativesSuperlativesLesson', () => {
  it('keeps the form-building guide inside the visual support area', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishComparativesSuperlativesLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-hub-section-form'));

    await waitFor(() => {
      expect(screen.getByText('short words: tall → taller → the tallest')).toBeInTheDocument();
    });

    expect(
      screen
        .getByText('short words: tall → taller → the tallest')
        .closest('.kangur-lesson-visual-supporting')
    ).toBeTruthy();
  });

  it('opens the compare and crown game section and returns to the lesson hub', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishComparativesSuperlativesLesson />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('lesson-hub-section-game_compare_and_crown')).toBeInTheDocument();
    expect(screen.getByText('Compare & Crown')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_compare_and_crown'));

    await waitFor(() => {
      expect(screen.getByTestId('english-comparatives-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-english-comparatives-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish compare and crown game' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_compare_and_crown')).toBeInTheDocument();
    });
  });
});
