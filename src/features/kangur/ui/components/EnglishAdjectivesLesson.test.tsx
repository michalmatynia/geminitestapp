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

vi.mock('@/features/kangur/ui/components/EnglishAdjectivesSceneGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-english-adjectives-scene-game'>
      <button type='button' onClick={onFinish}>
        Finish adjectives scene game
      </button>
    </div>
  ),
}));

import EnglishAdjectivesLesson from '@/features/kangur/ui/components/EnglishAdjectivesLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('EnglishAdjectivesLesson', () => {
  it('opens the adjective studio game section and returns to the lesson hub', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishAdjectivesLesson />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('lesson-hub-section-game_adjective_studio')).toBeInTheDocument();
    expect(screen.getByText('Adjective Studio')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_adjective_studio'));

    await waitFor(() => {
      expect(screen.getByTestId('english-adjectives-scene-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-english-adjectives-scene-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish adjectives scene game' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_adjective_studio')).toBeInTheDocument();
    });
  });
});
