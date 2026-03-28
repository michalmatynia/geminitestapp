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

vi.mock('@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime', () => ({
  __esModule: true,
  default: ({
    gameId,
    instanceId,
    onFinish,
  }: {
    gameId: string;
    instanceId: string;
    onFinish: () => void;
  }): React.JSX.Element => (
    <div data-testid='mock-music-diatonic-scale-instance-runtime'>
      <span data-testid='mock-music-diatonic-scale-game-id'>{gameId}</span>
      <span data-testid='mock-music-diatonic-scale-instance-id'>{instanceId}</span>
      <button type='button' onClick={onFinish}>
        Finish music runtime
      </button>
    </div>
  ),
}));

import MusicDiatonicScaleLesson, {
  MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS,
  MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS,
  MUSIC_DIATONIC_SCALE_LAUNCHABLE_INSTANCE_IDS,
} from '@/features/kangur/ui/components/MusicDiatonicScaleLesson';
import { KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS } from '@/features/kangur/ui/components/music/KangurMusicPianoRoll';
import {
  MUSIC_DIATONIC_SCALE_PREVIEW_TEST_IDS,
  MUSIC_DIATONIC_SCALE_SECTION_IDS,
} from '@/features/kangur/ui/components/music-diatonic-scale-lesson-content';
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

  it('renders the new melody-repeat hub section and opens the game shell', async () => {
    isMobileViewportMock = true;

    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <MusicDiatonicScaleLesson />
      </KangurLessonNavigationProvider>
    );

    expect(
      screen.getByTestId(`lesson-hub-section-${MUSIC_DIATONIC_SCALE_SECTION_IDS.repeatGame}`)
    ).toBeInTheDocument();
    expect(screen.getByText('Powtorz melodie')).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId(`lesson-hub-section-${MUSIC_DIATONIC_SCALE_SECTION_IDS.repeatGame}`)
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.repeat.shell.shellTestId)
      ).toBeInTheDocument();
    });

    expect(scrollToMock).toHaveBeenCalledWith({
      top: 340,
      left: 0,
      behavior: 'smooth',
    });
    expect(screen.getByTestId('mock-music-diatonic-scale-game-id')).toHaveTextContent(
      MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS.repeat
    );
    expect(screen.getByTestId('mock-music-diatonic-scale-instance-id')).toHaveTextContent(
      MUSIC_DIATONIC_SCALE_LAUNCHABLE_INSTANCE_IDS.repeat
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish music runtime' }));

    await waitFor(() => {
      expect(
        screen.getByTestId(`lesson-hub-section-${MUSIC_DIATONIC_SCALE_SECTION_IDS.repeatGame}`)
      ).toBeInTheDocument();
    });
  });

  it('renders the freeplay hub section and opens the freeplay game shell', async () => {
    isMobileViewportMock = true;

    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <MusicDiatonicScaleLesson />
      </KangurLessonNavigationProvider>
    );

    expect(
      screen.getByTestId(`lesson-hub-section-${MUSIC_DIATONIC_SCALE_SECTION_IDS.freePlayGame}`)
    ).toBeInTheDocument();
    expect(screen.getByText('Swobodna gra')).toBeInTheDocument();

    fireEvent.click(
      screen.getByTestId(`lesson-hub-section-${MUSIC_DIATONIC_SCALE_SECTION_IDS.freePlayGame}`)
    );

    await waitFor(() => {
      expect(
        screen.getByTestId(MUSIC_DIATONIC_SCALE_GAME_SECTION_CONFIGS.freePlay.shell.shellTestId)
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId('mock-music-diatonic-scale-game-id')).toHaveTextContent(
      MUSIC_DIATONIC_SCALE_LAUNCHABLE_GAME_IDS.freePlay
    );
    expect(screen.getByTestId('mock-music-diatonic-scale-instance-id')).toHaveTextContent(
      MUSIC_DIATONIC_SCALE_LAUNCHABLE_INSTANCE_IDS.freePlay
    );

    fireEvent.click(screen.getByRole('button', { name: 'Finish music runtime' }));

    await waitFor(() => {
      expect(
        screen.getByTestId(`lesson-hub-section-${MUSIC_DIATONIC_SCALE_SECTION_IDS.freePlayGame}`)
      ).toBeInTheDocument();
    });
  });

  it('shows the reusable piano-roll preview inside the note section', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <MusicDiatonicScaleLesson />
      </KangurLessonNavigationProvider>
    );

    fireEvent.click(screen.getByTestId(`lesson-hub-section-${MUSIC_DIATONIC_SCALE_SECTION_IDS.notes}`));

    await waitFor(() => {
      expect(screen.getByText('Poznaj dzwieki skali')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    await waitFor(() => {
      expect(screen.getByText('Kolory pomagaja zapamietac melodie')).toBeInTheDocument();
      expect(screen.getByTestId(MUSIC_DIATONIC_SCALE_PREVIEW_TEST_IDS.shell)).toBeInTheDocument();
    });

    expect(screen.getByTestId(MUSIC_DIATONIC_SCALE_PREVIEW_TEST_IDS.shell)).toHaveClass(
      KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.engineClassName
    );
    expect(
      screen.getByTestId(`${MUSIC_DIATONIC_SCALE_PREVIEW_TEST_IDS.keyPrefix}-do`)
    ).toHaveClass(
      KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.keyClassName
    );
    expect(
      screen.getByTestId(`${MUSIC_DIATONIC_SCALE_PREVIEW_TEST_IDS.stepPrefix}-measure-3`)
    ).toHaveTextContent(
      'Takt 3'
    );
    expect(
      screen.getByTestId(`${MUSIC_DIATONIC_SCALE_PREVIEW_TEST_IDS.stepPrefix}-7`)
    ).toHaveAttribute('data-span', '3');
  });
});
