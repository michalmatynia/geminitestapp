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
  useKangurAuthSessionState: () => ({
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

vi.mock('@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime', () => ({
  __esModule: true,
  KangurLaunchableGameInstanceRuntime: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-english-articles-drag-game'>
      <button type='button' onClick={onFinish}>
        Finish articles drag game
      </button>
    </div>
  ),
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-english-articles-drag-game'>
      <button type='button' onClick={onFinish}>
        Finish articles drag game
      </button>
    </div>
  ),
}));

import EnglishArticlesLesson from '@/features/kangur/ui/components/EnglishArticlesLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('EnglishArticlesLesson', () => {
  it('keeps article examples inside the visual support area instead of a separate inset grid', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishArticlesLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-hub-section-a_an'));

    await waitFor(() => {
      expect(screen.getByText('a unit circle')).toBeInTheDocument();
    });

    expect(screen.getByText('a unit circle').closest('.kangur-lesson-visual-supporting')).toBeTruthy();
    expect(screen.queryByText('a unit circle')?.closest('.kangur-lesson-inset')).toBeNull();
  });

  it('opens the new drag-and-drop game section and returns to the lesson hub', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishArticlesLesson />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('lesson-hub-section-game_articles_drag')).toBeInTheDocument();
    expect(screen.getByText('Article Builder')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_articles_drag'));

    await waitFor(() => {
      expect(screen.getByTestId('english-articles-drag-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-english-articles-drag-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish articles drag game' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_articles_drag')).toBeInTheDocument();
    });
  });
});
