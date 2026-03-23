/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

let isMobileViewportMock = false;

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => isMobileViewportMock,
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

vi.mock('@/features/kangur/ui/components/music/MusicMelodyRepeatGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-music-melody-repeat-game'>
      <button type='button' onClick={onFinish}>
        Finish music training
      </button>
    </div>
  ),
}));

import MusicDiatonicScaleLesson from '@/features/kangur/ui/components/MusicDiatonicScaleLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

describe('MusicDiatonicScaleLesson', () => {
  const scrollToMock = vi.fn();
  const requestAnimationFrameMock = vi.fn<(callback: FrameRequestCallback) => number>();
  const cancelAnimationFrameMock = vi.fn();

  beforeEach(() => {
    isMobileViewportMock = false;
    scrollToMock.mockReset();
    requestAnimationFrameMock.mockImplementation((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    cancelAnimationFrameMock.mockReset();

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: scrollToMock,
      writable: true,
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrameMock,
      writable: true,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrameMock,
      writable: true,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 120,
      writable: true,
    });
    Object.defineProperty(HTMLDivElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          bottom: 520,
          height: 200,
          left: 0,
          right: 320,
          top: 320,
          width: 320,
          x: 0,
          y: 320,
        }) as DOMRect,
      writable: true,
    });
  });

  afterEach(() => {
    delete (HTMLDivElement.prototype as Partial<HTMLDivElement>).getBoundingClientRect;
  });

  it('renders the new melody-repeat hub section and opens the game stage', async () => {
    isMobileViewportMock = true;

    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <MusicDiatonicScaleLesson />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId('lesson-hub-section-game_repeat')).toBeInTheDocument();
    expect(screen.getByText('Powtorz melodie')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_repeat'));

    await waitFor(() => {
      expect(screen.getByTestId('music-diatonic-scale-game-shell')).toBeInTheDocument();
    });

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 340,
      left: 0,
      behavior: 'smooth',
    });
    expect(screen.getByTestId('mock-music-melody-repeat-game')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish music training' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_repeat')).toBeInTheDocument();
    });
  });

  it('shows the reusable piano-roll preview inside the note section', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <MusicDiatonicScaleLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-hub-section-notes'));

    await waitFor(() => {
      expect(screen.getByText('Poznaj dzwieki skali')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    await waitFor(() => {
      expect(screen.getByText('Kolory pomagaja zapamietac melodie')).toBeInTheDocument();
      expect(screen.getByTestId('music-diatonic-scale-preview-roll')).toBeInTheDocument();
    });

    expect(screen.getByTestId('kangur-music-piano-step-measure-3')).toHaveTextContent('Takt 3');
    expect(screen.getByTestId('kangur-music-piano-step-7')).toHaveAttribute('data-span', '3');
  });
});
