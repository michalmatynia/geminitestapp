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
    <div data-testid='mock-english-adverbs-game'>
      <button type='button' onClick={onFinish}>
        Finish adverbs game
      </button>
    </div>
  ),
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-english-adverbs-game'>
      <button type='button' onClick={onFinish}>
        Finish adverbs game
      </button>
    </div>
  ),
}));

import EnglishAdverbsLesson from '@/features/kangur/ui/components/EnglishAdverbsLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('EnglishAdverbsLesson', () => {
  it('keeps adjective-to-adverb examples inside the visual support area', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishAdverbsLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-hub-section-form'));

    await waitFor(() => {
      expect(screen.getByText('careful → carefully')).toBeInTheDocument();
    });

    expect(
      screen.getByText('careful → carefully').closest('.kangur-lesson-visual-supporting')
    ).toBeTruthy();
    expect(screen.queryByText('careful → carefully')?.closest('.kangur-lesson-inset')).toBeNull();
  });

  it('opens the adverb action studio game section and returns to the lesson hub', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishAdverbsLesson />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('lesson-hub-section-game_action_studio')).toBeInTheDocument();
    expect(screen.getByText('Action Studio')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_action_studio'));

    await waitFor(() => {
      expect(screen.getByTestId('english-adverbs-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-english-adverbs-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish adverbs game' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_action_studio')).toBeInTheDocument();
    });
  });
});
