/**
 * @vitest-environment jsdom
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

vi.mock('@/features/kangur/ui/hooks/useKangurLessonPanelProgress', async () => {
  const { useLessonHubProgress } =
    await vi.importActual<typeof import('@/features/kangur/ui/hooks/useLessonHubProgress')>(
      '@/features/kangur/ui/hooks/useLessonHubProgress'
    );
  return {
    useKangurLessonPanelProgress: ({
      slideSections,
    }: {
      slideSections: Partial<Record<string, readonly unknown[]>>;
    }) => {
      const { markSectionOpened, markSectionViewedCount, sectionProgress } =
        useLessonHubProgress(slideSections);
      return {
        markSectionOpened,
        markSectionViewedCount,
        recordPanelTime: vi.fn(),
        sectionProgress,
      };
    },
  };
});

vi.mock('@/features/kangur/ui/learner-activity/hooks', () => ({
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
}));

vi.mock('@/features/kangur/ui/components/SubtractingGardenGame', () => ({
  default: () => <div>Mock Subtracting Garden Game</div>,
}));

import { createDefaultKangurProgressState } from '@/features/kangur/shared/contracts/kangur';

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: vi.fn(),
    createLessonCompletionReward: vi.fn(() => ({
      xp: 28,
      scorePercent: 100,
      progressUpdates: {},
    })),
    loadProgress: vi.fn(() => createDefaultKangurProgressState()),
    recordKangurLessonPanelProgress: vi.fn(),
    recordKangurLessonPanelTime: vi.fn(),
  };
});

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    progress: {
      get: vi.fn(async () => createDefaultKangurProgressState()),
      update: vi.fn(async (progress: unknown) => progress),
    },
  }),
}));

import enMessages from '@/i18n/messages/en.json';
import deMessages from '@/i18n/messages/de.json';
import SubtractingLesson from '@/features/kangur/ui/components/SubtractingLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderLesson = (
  ui: ReactNode = <SubtractingLesson />,
  options: { locale?: string; messages?: typeof enMessages } = {}
) =>
  render(
    <NextIntlClientProvider
      locale={options.locale ?? 'en'}
      messages={options.messages ?? enMessages}
    >
      <KangurLessonNavigationProvider onBack={vi.fn()}>{ui}</KangurLessonNavigationProvider>
    </NextIntlClientProvider>
  );

describe('SubtractingLesson i18n', () => {
  it('renders English hub labels', () => {
    renderLesson();

    expect(screen.getByRole('button', { name: /Subtraction basics/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Subtracting across 10/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Two-digit subtraction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remember!/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Subtraction game/i })).toBeInTheDocument();
  });

  it('renders English basics and crossing-10 slide copy', () => {
    const { unmount } = renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Subtraction basics/i }));

    expect(screen.getByText('What does it mean to subtract?')).toBeInTheDocument();
    expect(
      screen.getByText('Subtraction means taking a part away from a group. We ask: how many are left?')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));
    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));

    expect(screen.getByRole('button', { name: /Subtraction in motion/i })).toBeInTheDocument();

    unmount();

    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Subtracting across 10/i }));

    expect(screen.getByText('Subtracting across 10')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Split the subtrahend into two parts: first move down to 10, then subtract the rest.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Subtract 2: 10 − 2 = 8')).toBeInTheDocument();
  });

  it('renders English two-digit and remember slide copy', () => {
    const { unmount } = renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Two-digit subtraction/i }));

    expect(screen.getByText('Subtract tens and ones separately!')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));

    expect(screen.getByRole('button', { name: /Abacus/i })).toBeInTheDocument();

    unmount();

    renderLesson();

    fireEvent.click(screen.getByRole('button', { name: /Remember!/i }));

    expect(screen.getByText('Subtraction rules')).toBeInTheDocument();
    expect(screen.getByText('Move back in steps')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));
    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));
    fireEvent.click(screen.getByTestId('lesson-slide-next-button'));

    expect(screen.getByRole('button', { name: /Check the answer with addition/i })).toBeInTheDocument();
  });

  it('renders German hub labels and representative slide copy', () => {
    const { unmount } = renderLesson(<SubtractingLesson />, {
      locale: 'de',
      messages: deMessages,
    });

    expect(screen.getByRole('button', { name: /Grundlagen der Subtraktion/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Über die 10 subtrahieren/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Zweistellige Subtraktion/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Merke!/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Subtraction basics/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Grundlagen der Subtraktion/i }));

    expect(screen.getByText('Was bedeutet Subtrahieren?')).toBeInTheDocument();
    expect(
      screen.getByText('Subtraktion bedeutet, einen Teil von einer Gruppe wegzunehmen. Wir fragen: Wie viel bleibt übrig?')
    ).toBeInTheDocument();
    expect(screen.queryByText('What does it mean to subtract?')).not.toBeInTheDocument();

    unmount();

    renderLesson(<SubtractingLesson />, {
      locale: 'de',
      messages: deMessages,
    });

    fireEvent.click(screen.getByRole('button', { name: /Über die 10 subtrahieren/i }));

    expect(
      screen.getByText('Teile die Zahl, die du abziehst, in zwei Teile: zuerst gehst du bis zur 10 herunter, dann ziehst du den Rest ab.')
    ).toBeInTheDocument();
    expect(screen.getByText('Subtrahiere 2: 10 − 2 = 8')).toBeInTheDocument();
  });
});
