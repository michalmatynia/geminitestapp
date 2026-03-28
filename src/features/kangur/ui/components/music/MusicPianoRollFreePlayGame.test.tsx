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
  let freePlayTestIds: typeof import('@/features/kangur/ui/components/music/MusicPianoRollFreePlayGame').MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS;
  let pianoRollModule: typeof import('@/features/kangur/ui/components/music/KangurMusicPianoRoll');
  let MusicPianoRollFreePlayGame: typeof import('@/features/kangur/ui/components/music/MusicPianoRollFreePlayGame').default;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    useKangurCoarsePointerMock.mockReturnValue(false);
    useKangurMobileBreakpointMock.mockReturnValue(false);
    pianoRollModule = await import('@/features/kangur/ui/components/music/KangurMusicPianoRoll');
    const freePlayModule = await import(
      '@/features/kangur/ui/components/music/MusicPianoRollFreePlayGame'
    );
    MusicPianoRollFreePlayGame = freePlayModule.default;
    freePlayTestIds = freePlayModule.MUSIC_PIANO_ROLL_FREE_PLAY_TEST_IDS;
  });

  it('renders a free-play piano roll stage and lets the learner leave', () => {
    const onFinish = vi.fn();

    render(<MusicPianoRollFreePlayGame onFinish={onFinish} />);

    expect(screen.getByTestId(freePlayTestIds.root)).toBeInTheDocument();
    expect(screen.getByTestId(freePlayTestIds.pianoRoll.shell)).toBeInTheDocument();
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.keyPrefix}-do`)
    ).toHaveClass(
      pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.keyClassName
    );
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-transport-freeplay`)
    ).toHaveTextContent('Swobodna gra');
    expect(screen.getByTestId(freePlayTestIds.modeStatus)).toHaveTextContent('Tryb: piano');
    expect(screen.getByTestId(freePlayTestIds.audioStatus)).toHaveTextContent('Audio: gotowe');

    fireEvent.click(screen.getByTestId(freePlayTestIds.finishButton));

    expect(stopMock).toHaveBeenCalled();
    expect(stopAllSustainedNotesMock).toHaveBeenCalledWith({ immediate: true });
    expect(onFinish).toHaveBeenCalled();
  });

  it('keeps ADSR settings in parent state for the synth piano roll', () => {
    render(<MusicPianoRollFreePlayGame onFinish={vi.fn()} />);

    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-keyboard-mode-synth`)
    );
    expect(screen.getByTestId(freePlayTestIds.pianoRoll.shell)).toHaveClass(
      pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.engineClassName
    );
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-envelope-button`)
    ).toHaveClass(pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName);
    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-envelope-button`)
    );

    const releaseInput = screen.getByTestId(
      `${freePlayTestIds.pianoRoll.stepPrefix}-synth-envelope-release`
    ) as HTMLInputElement;
    expect(releaseInput.value).toBe('90');

    fireEvent.change(releaseInput, { target: { value: '640' } });

    expect(releaseInput.value).toBe('640');
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-envelope-release-value`)
    ).toHaveTextContent('640 ms');
  });

  it('opens synth OSC settings panel and shows OSC 1 controls', () => {
    render(<MusicPianoRollFreePlayGame onFinish={vi.fn()} />);

    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-keyboard-mode-synth`)
    );
    expect(screen.getByTestId(freePlayTestIds.pianoRoll.shell)).toHaveClass(
      pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.engineClassName
    );
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc-settings-button`)
    ).toHaveClass(pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName);
    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc-settings-button`)
    );

    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc-panel`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc1-panel`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc-tab-osc1`)
    ).toHaveClass(pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName);
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc1-waveform-sine`)
    ).toHaveClass(pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName);

    const volumeInput = screen.getByTestId(
      `${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc1-volume`
    ) as HTMLInputElement;
    expect(volumeInput.value).toBe('100');

    fireEvent.change(volumeInput, { target: { value: '60' } });

    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc1-volume-value`)
    ).toHaveTextContent('60%');
  });

  it('switches to OSC 2 tab and changes detune', () => {
    render(<MusicPianoRollFreePlayGame onFinish={vi.fn()} />);

    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-keyboard-mode-synth`)
    );
    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc-settings-button`)
    );
    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc-tab-osc2`)
    );

    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc2-panel`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc-tab-osc2`)
    ).toHaveClass(pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName);
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc2-waveform-sine`)
    ).toHaveClass(pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName);

    const detuneInput = screen.getByTestId(
      `${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc2-detune`
    ) as HTMLInputElement;
    expect(detuneInput.value).toBe('0');
    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc2-detune-value`)
    ).toHaveTextContent('Auto');

    fireEvent.change(detuneInput, { target: { value: '12' } });

    expect(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc2-detune-value`)
    ).toHaveTextContent('+12c');
  });

  it('disabling OSC 2 hides waveform, blend, and detune controls', () => {
    render(<MusicPianoRollFreePlayGame onFinish={vi.fn()} />);

    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-keyboard-mode-synth`)
    );
    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc-settings-button`)
    );
    fireEvent.click(
      screen.getByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc-tab-osc2`)
    );

    const enabledCheckbox = screen.getByTestId(
      `${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc2-enabled`
    ) as HTMLInputElement;
    expect(enabledCheckbox.checked).toBe(true);

    fireEvent.click(enabledCheckbox);

    expect(
      screen.queryByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc2-blend`)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId(`${freePlayTestIds.pianoRoll.stepPrefix}-synth-osc2-detune`)
    ).not.toBeInTheDocument();
  });
});
