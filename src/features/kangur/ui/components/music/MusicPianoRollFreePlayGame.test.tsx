/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === 'summary') {
      return `A ${values?.attackMs} ms · D ${values?.decayMs} ms · S ${values?.sustainPercent}% · R ${values?.releaseMs} ms`;
    }
    if (key === 'buttonAriaLabel') {
      return `ADSR: ${String(values?.summary ?? '')}`;
    }
    return (
      {
        attack: 'Attack',
        button: 'ADSR',
        close: 'Close',
        closeAriaLabel: 'Close ADSR settings',
        decay: 'Decay',
        description: 'Adjust the synth attack, decay, sustain level, and release.',
        release: 'Release',
        reset: 'Reset',
        sustain: 'Sustain',
        title: 'Synth ADSR',
      } satisfies Record<string, string>
    )[key] ?? key;
  },
}));

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

vi.mock('@/features/kangur/ui/components/music/useKangurMusicSynth', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/features/kangur/ui/components/music/useKangurMusicSynth')
  >();
  return {
    ...actual,
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
  };
});

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

  it('keeps ADSR settings in parent state for the synth piano roll', () => {
    render(<MusicPianoRollFreePlayGame onFinish={vi.fn()} />);

    fireEvent.click(screen.getByTestId('music-piano-roll-freeplay-step-keyboard-mode-synth'));
    fireEvent.click(screen.getByTestId('music-piano-roll-freeplay-step-synth-envelope-button'));

    const releaseInput = screen.getByTestId(
      'music-piano-roll-freeplay-step-synth-envelope-release'
    ) as HTMLInputElement;
    expect(releaseInput.value).toBe('90');

    fireEvent.change(releaseInput, { target: { value: '640' } });

    expect(releaseInput.value).toBe('640');
    expect(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-envelope-release-value')
    ).toHaveTextContent('640 ms');
  });

  it('opens synth OSC settings panel and shows OSC 1 controls', () => {
    render(<MusicPianoRollFreePlayGame onFinish={vi.fn()} />);

    fireEvent.click(screen.getByTestId('music-piano-roll-freeplay-step-keyboard-mode-synth'));
    fireEvent.click(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-osc-settings-button')
    );

    expect(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-osc-panel')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-osc1-panel')
    ).toBeInTheDocument();

    const volumeInput = screen.getByTestId(
      'music-piano-roll-freeplay-step-synth-osc1-volume'
    ) as HTMLInputElement;
    expect(volumeInput.value).toBe('100');

    fireEvent.change(volumeInput, { target: { value: '60' } });

    expect(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-osc1-volume-value')
    ).toHaveTextContent('60%');
  });

  it('switches to OSC 2 tab and changes detune', () => {
    render(<MusicPianoRollFreePlayGame onFinish={vi.fn()} />);

    fireEvent.click(screen.getByTestId('music-piano-roll-freeplay-step-keyboard-mode-synth'));
    fireEvent.click(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-osc-settings-button')
    );
    fireEvent.click(screen.getByTestId('music-piano-roll-freeplay-step-synth-osc-tab-osc2'));

    expect(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-osc2-panel')
    ).toBeInTheDocument();

    const detuneInput = screen.getByTestId(
      'music-piano-roll-freeplay-step-synth-osc2-detune'
    ) as HTMLInputElement;
    expect(detuneInput.value).toBe('0');
    expect(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-osc2-detune-value')
    ).toHaveTextContent('Auto');

    fireEvent.change(detuneInput, { target: { value: '12' } });

    expect(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-osc2-detune-value')
    ).toHaveTextContent('+12c');
  });

  it('disabling OSC 2 hides waveform, blend, and detune controls', () => {
    render(<MusicPianoRollFreePlayGame onFinish={vi.fn()} />);

    fireEvent.click(screen.getByTestId('music-piano-roll-freeplay-step-keyboard-mode-synth'));
    fireEvent.click(
      screen.getByTestId('music-piano-roll-freeplay-step-synth-osc-settings-button')
    );
    fireEvent.click(screen.getByTestId('music-piano-roll-freeplay-step-synth-osc-tab-osc2'));

    const enabledCheckbox = screen.getByTestId(
      'music-piano-roll-freeplay-step-synth-osc2-enabled'
    ) as HTMLInputElement;
    expect(enabledCheckbox.checked).toBe(true);

    fireEvent.click(enabledCheckbox);

    expect(
      screen.queryByTestId('music-piano-roll-freeplay-step-synth-osc2-blend')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('music-piano-roll-freeplay-step-synth-osc2-detune')
    ).not.toBeInTheDocument();
  });
});
