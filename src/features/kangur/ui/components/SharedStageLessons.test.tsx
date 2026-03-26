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

vi.mock('@/features/kangur/ui/components/GeometryBasicsWorkshopGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-geometry-basics-workshop-game'>
      <button type='button' onClick={onFinish}>
        Finish geometry basics game
      </button>
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-english-subject-verb-agreement-game'>
      <button type='button' onClick={onFinish}>
        Finish agreement game
      </button>
    </div>
  ),
}));

import EnglishSubjectVerbAgreementLesson from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementLesson';
import GeometryBasicsLesson from '@/features/kangur/ui/components/GeometryBasicsLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('shared stage lessons', () => {
  it('opens the geometry basics stage game through the shared runtime and returns to the hub', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <GeometryBasicsLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-hub-section-game'));

    await waitFor(() => {
      expect(screen.getByTestId('geometry-basics-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-geometry-basics-workshop-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish geometry basics game' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game')).toBeInTheDocument();
    });
  });

  it('opens the agreement stage game through the shared runtime and returns to the hub', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <EnglishSubjectVerbAgreementLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_agreement'));

    await waitFor(() => {
      expect(screen.getByTestId('english-agreement-game-shell')).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-english-subject-verb-agreement-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish agreement game' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_agreement')).toBeInTheDocument();
    });
  });
});
