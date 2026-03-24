/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  playNoteMock,
  startSustainedNoteMock,
  stopAllSustainedNotesMock,
  stopMock,
  stopSustainedNoteMock,
  updateSustainedNoteMock,
  useKangurCoarsePointerMock,
  useKangurMobileBreakpointMock,
} = vi.hoisted(() => ({
  playNoteMock: vi.fn(),
  startSustainedNoteMock: vi.fn(),
  stopAllSustainedNotesMock: vi.fn(),
  stopMock: vi.fn(),
  stopSustainedNoteMock: vi.fn(),
  updateSustainedNoteMock: vi.fn(),
  useKangurCoarsePointerMock: vi.fn(),
  useKangurMobileBreakpointMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => useKangurCoarsePointerMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => useKangurMobileBreakpointMock(),
}));

vi.mock('@/features/kangur/ui/components/music/useKangurMusicSynth', () => ({
  useKangurMusicSynth: () => ({
    isAudioBlocked: false,
    isAudioSupported: true,
    isPlayingSequence: false,
    playNote: playNoteMock,
    playSequence: vi.fn(),
    startSustainedNote: startSustainedNoteMock,
    stop: stopMock,
    stopAllSustainedNotes: stopAllSustainedNotesMock,
    stopSustainedNote: stopSustainedNoteMock,
    updateSustainedNote: updateSustainedNoteMock,
  }),
}));

describe('MusicPianoRollFreePlayGame', () => {
  let MusicPianoRollFreePlayGame: typeof import('@/features/kangur/ui/components/music/MusicPianoRollFreePlayGame').default;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    useKangurCoarsePointerMock.mockReturnValue(false);
    useKangurMobileBreakpointMock.mockReturnValue(false);
    MusicPianoRollFreePlayGame = (
      await import('@/features/kangur/ui/components/music/MusicPianoRollFreePlayGame')
    ).default;
  });

  it('renders a free-play piano roll stage and lets the learner leave', () => {
    const onFinish = vi.fn();

    render(<MusicPianoRollFreePlayGame onFinish={onFinish} />);

    expect(screen.getByTestId('music-piano-roll-freeplay-game')).toBeInTheDocument();
    expect(screen.getByTestId('music-piano-roll-freeplay-shell')).toBeInTheDocument();
    expect(
      screen.getByTestId('music-piano-roll-freeplay-step-transport-freeplay')
    ).toHaveTextContent('Swobodna gra');
    expect(screen.getByTestId('music-piano-roll-freeplay-mode')).toHaveTextContent('Tryb: piano');
    expect(screen.getByTestId('music-piano-roll-freeplay-audio')).toHaveTextContent('Audio: gotowe');

    fireEvent.click(screen.getByTestId('music-piano-roll-freeplay-finish'));

    expect(stopMock).toHaveBeenCalled();
    expect(stopAllSustainedNotesMock).toHaveBeenCalledWith({ immediate: true });
    expect(onFinish).toHaveBeenCalled();
  });
});
