/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID } from '@/features/kangur/games/music-piano-roll-contract';

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

const addXpMock = vi.fn();
const createLessonPracticeRewardMock = vi.fn(() => ({
  xp: 18,
  breakdown: [{ label: 'Muzyczna runda', xp: 18 }],
  progressUpdates: {},
}));
const loadProgressMock = vi.fn(() => ({}));
const persistKangurSessionScoreMock = vi.fn();

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: (...args: unknown[]) => addXpMock(...args),
    createLessonPracticeReward: (...args: unknown[]) => createLessonPracticeRewardMock(...args),
    loadProgress: (...args: unknown[]) => loadProgressMock(...args),
  };
});

vi.mock('@/features/kangur/ui/services/session-score', () => ({
  persistKangurSessionScore: (...args: unknown[]) => persistKangurSessionScoreMock(...args),
}));

vi.mock('@/features/kangur/ui/components/music/MusicMelodyRepeatGame.data', () => ({
  MUSIC_MELODY_REPEAT_ROUNDS: [
    {
      accent: 'sky',
      id: 'test_round',
      notes: ['do', 're'],
    },
  ],
}));

class MockOscillatorNode {
  readonly detune = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.detune.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.detune.value = value;
    }),
    value: 0,
  };

  readonly frequency = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    value: 0,
  };

  onended: (() => void) | null = null;
  type: OscillatorType = 'triangle';
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn(() => {
    this.onended?.();
  });
}

class MockGainNode {
  readonly gain = {
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
    }),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
    }),
    value: 0.0001,
  };

  connect = vi.fn();
  disconnect = vi.fn();
}

class MockBiquadFilterNode {
  readonly Q = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.Q.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.Q.value = value;
    }),
    value: 0,
  };

  readonly frequency = {
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn((value: number) => {
      this.frequency.value = value;
    }),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.frequency.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.frequency.value = value;
    }),
    value: 0,
  };

  type: BiquadFilterType = 'lowpass';
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockDynamicsCompressorNode {
  readonly attack = {
    value: 0,
  };

  readonly knee = {
    value: 0,
  };

  readonly ratio = {
    value: 0,
  };

  readonly release = {
    value: 0,
  };

  readonly threshold = {
    value: 0,
  };

  connect = vi.fn();
  disconnect = vi.fn();
}

class MockWaveShaperNode {
  curve: Float32Array | null = null;
  oversample: OverSampleType = 'none';
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockConvolverNode {
  buffer: AudioBuffer | null = null;
  normalize = false;
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockStereoPannerNode {
  readonly pan = {
    cancelScheduledValues: vi.fn(),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.pan.value = value;
    }),
    setValueAtTime: vi.fn((value: number) => {
      this.pan.value = value;
    }),
    value: 0,
  };

  connect = vi.fn();
  disconnect = vi.fn();
}

class MockAudioBuffer {
  readonly channels: Float32Array[];

  constructor(numberOfChannels: number, length: number) {
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  getChannelData(channel: number): Float32Array {
    return this.channels[channel] ?? new Float32Array(0);
  }
}

class MockAudioContext {
  currentTime = 0;
  destination = {};
  sampleRate = 44_100;
  state: AudioContextState = 'running';
  createBuffer = vi.fn(
    (numberOfChannels: number, length: number) =>
      new MockAudioBuffer(numberOfChannels, length) as unknown as AudioBuffer
  );
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  createBiquadFilter = vi.fn(() => new MockBiquadFilterNode() as unknown as BiquadFilterNode);
  createConvolver = vi.fn(() => new MockConvolverNode() as unknown as ConvolverNode);
  createDynamicsCompressor = vi.fn(
    () => new MockDynamicsCompressorNode() as unknown as DynamicsCompressorNode
  );
  createGain = vi.fn(() => new MockGainNode() as unknown as GainNode);
  createOscillator = vi.fn(() => new MockOscillatorNode() as unknown as OscillatorNode);
  createStereoPanner = vi.fn(
    () => new MockStereoPannerNode() as unknown as StereoPannerNode
  );
  createWaveShaper = vi.fn(() => new MockWaveShaperNode() as unknown as WaveShaperNode);
  resume = vi.fn(async () => {
    this.state = 'running';
  });
}

describe('MusicMelodyRepeatGame', () => {
  let melodyRepeatTestIds: typeof import('@/features/kangur/ui/components/music/MusicMelodyRepeatGame').MUSIC_MELODY_REPEAT_TEST_IDS;
  let MusicMelodyRepeatGame: typeof import('@/features/kangur/ui/components/music/MusicMelodyRepeatGame').default;

  const mockKeyRect = (element: HTMLElement, top = 0, height = 160): void => {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          bottom: top + height,
          height,
          left: 0,
          right: 96,
          top,
          width: 96,
          x: 0,
          y: top,
        }) as DOMRect,
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.resetModules();
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: MockAudioContext,
      writable: true,
    });
    Object.defineProperty(HTMLButtonElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
    Object.defineProperty(HTMLButtonElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (HTMLButtonElement.prototype as Partial<HTMLButtonElement>).setPointerCapture;
    delete (HTMLButtonElement.prototype as Partial<HTMLButtonElement>).releasePointerCapture;
  });

  it('plays the melody, lets the learner repeat it, and persists a perfect result', async () => {
    const pianoRollModule = await import(
      '@/features/kangur/ui/components/music/KangurMusicPianoRoll'
    );
    const melodyRepeatModule = await import(
      '@/features/kangur/ui/components/music/MusicMelodyRepeatGame'
    );
    MusicMelodyRepeatGame = melodyRepeatModule.default;
    melodyRepeatTestIds = melodyRepeatModule.MUSIC_MELODY_REPEAT_TEST_IDS;
    render(<MusicMelodyRepeatGame onFinish={() => undefined} />);

    expect(screen.getByTestId(melodyRepeatTestIds.root)).toHaveClass('w-full');
    expect(screen.queryByText('Kolorowy piano roll')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Kolory na gorze pokazuja kolejne dzwieki melodii. Gdy przyjdzie Twoja kolej, dotykaj tych samych kolorow na klawiaturze.'
      )
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-top-rail')).toHaveClass(
      'flex',
      'items-center',
      'overflow-hidden'
    );
    expect(screen.getByTestId('music-melody-repeat-status-rail')).toHaveClass('ml-auto');
    expect(screen.getByTestId('music-melody-repeat-status-phase')).toHaveAttribute(
      'aria-label',
      'Start'
    );
    expect(screen.getByTestId('music-melody-repeat-status-notes')).toHaveAttribute(
      'aria-label',
      'Nuty: 0/2'
    );
    expect(screen.getByTestId('music-melody-repeat-status-mode')).toHaveAttribute(
      'aria-label',
      'Tryb: piano'
    );
    expect(screen.getByTestId('music-melody-repeat-status-phase-icon')).toHaveTextContent('▶');
    expect(screen.getByTestId('music-melody-repeat-status-notes-icon')).toHaveTextContent('🎵');
    expect(screen.getByTestId('music-melody-repeat-status-mode-icon')).toHaveTextContent('🎹');
    expect(screen.getByTestId(melodyRepeatTestIds.pianoRoll.shell)).toHaveClass(
      '!border-0',
      '!bg-transparent',
      '!px-1.5',
      '!py-2.5',
      '!shadow-none'
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.keyPrefix}-do`)
    ).toHaveClass(
      pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.keyClassName
    );
    expect(screen.getByTestId(melodyRepeatTestIds.root).firstElementChild).toHaveClass(
      'px-2',
      'sm:px-3'
    );
    expect(screen.getByTestId('music-melody-repeat-outcome-shell')).toHaveAttribute(
      'data-outcome',
      'idle'
    );
    expect(screen.queryByTestId('music-melody-repeat-outcome-banner')).not.toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-actions')).toHaveClass(
      'flex',
      'w-full',
      'px-1',
      'pt-1'
    );
    expect(screen.getByTestId('music-melody-repeat-actions')).toHaveClass('justify-center');
    expect(screen.getByTestId('music-melody-repeat-actions-group')).toHaveClass(
      'inline-grid',
      'grid-cols-[auto_auto_auto]',
      'items-center',
      'max-[340px]:grid-cols-[auto]',
      'max-[340px]:gap-y-2'
    );
    expect(screen.getByTestId('music-melody-repeat-actions-left-slot')).toHaveClass(
      'max-[340px]:hidden'
    );
    expect(screen.getByTestId('music-melody-repeat-actions-left-slot')).toBeEmptyDOMElement();
    expect(screen.getByTestId('music-melody-repeat-actions-right-slot')).toHaveClass(
      'max-[340px]:justify-center',
      'max-[340px]:pl-0'
    );
    expect(screen.getByTestId('music-melody-repeat-actions-right-slot')).toBeEmptyDOMElement();
    expect(screen.getByTestId('music-melody-repeat-actions')).not.toHaveClass(
      'rounded-[24px]',
      'border',
      'bg-white/60'
    );
    expect(screen.getByTestId('music-melody-repeat-listen-button-shell')).toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-listen-button')).not.toHaveClass(
      'ring-offset-white/75'
    );
    expect(screen.getByTestId('music-melody-repeat-listen-button')).toHaveClass(
      'cursor-pointer',
      'relative',
      'z-10',
      'flex',
      'h-14',
      'w-14',
      'rounded-[22px]'
    );
    expect(screen.queryByTestId('music-melody-repeat-listen-glow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('music-melody-repeat-listen-ring')).not.toBeInTheDocument();
    expect(screen.queryByTestId('music-melody-repeat-listen-disc')).not.toBeInTheDocument();
    expect(screen.queryByTestId('music-melody-repeat-listen-badge')).not.toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-listen-icon')).toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-listen-icon')).toHaveAttribute(
      'fill',
      'currentColor'
    );
    expect(screen.getByTestId('music-melody-repeat-listen-icon')).toHaveClass(
      'translate-x-[2px]',
      'size-8'
    );
    expect(screen.queryByTestId('music-melody-repeat-feedback')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Posluchaj melodii' }));
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(screen.queryByTestId('music-melody-repeat-listen-glow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('music-melody-repeat-listen-ring')).not.toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'Twoja kolej. Zacznij od dzwieku do.'
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-0`)
    ).toHaveAttribute(
      'data-state',
      'expected'
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.keyPrefix}-do`));
    });
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-0`)
    ).toHaveAttribute(
      'data-state',
      'played'
    );
    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'Dobrze! Teraz dotknij dzwieku re.'
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.keyPrefix}-re`));
    });

    expect(screen.getByTestId('music-melody-repeat-status-outcome')).toHaveAttribute(
      'aria-label',
      'Poprawnie'
    );
    expect(screen.getByTestId('music-melody-repeat-outcome-shell')).toHaveAttribute(
      'data-outcome',
      'success'
    );
    expect(screen.getByTestId('music-melody-repeat-outcome-banner')).toHaveAttribute(
      'aria-label',
      'Melodia poprawna'
    );
    expect(screen.getByTestId('music-melody-repeat-outcome-banner-icon')).toHaveTextContent('✅');
    expect(screen.getByTestId('music-melody-repeat-outcome-banner')).toHaveTextContent('Brawo!');
    expect(screen.getByTestId('music-melody-repeat-status-outcome-icon')).toHaveTextContent('✅');
    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'Brawo! Cala melodia zabrzmiala poprawnie.'
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByTestId('music-melody-repeat-summary-shell')).toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-summary-title')).toHaveTextContent(
      'Za pierwszym razem: 1/1'
    );
    expect(loadProgressMock).toHaveBeenCalledWith({ ownerKey: null });
    expect(addXpMock).toHaveBeenCalledWith(18, {}, { ownerKey: null });
    expect(persistKangurSessionScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 1,
        operation: KANGUR_MUSIC_DIATONIC_SCALE_COMPONENT_ID,
        score: 1,
        totalQuestions: 1,
        xpEarned: 18,
      })
    );
  });

  it('keeps the learner on the same expected note after a wrong key press', async () => {
    const melodyRepeatModule = await import(
      '@/features/kangur/ui/components/music/MusicMelodyRepeatGame'
    );
    MusicMelodyRepeatGame = melodyRepeatModule.default;
    melodyRepeatTestIds = melodyRepeatModule.MUSIC_MELODY_REPEAT_TEST_IDS;
    render(<MusicMelodyRepeatGame onFinish={() => undefined} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Posluchaj melodii' }));
      await vi.advanceTimersByTimeAsync(1_200);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.keyPrefix}-fa`));
    });

    expect(screen.getByTestId('music-melody-repeat-status-outcome')).toHaveAttribute(
      'aria-label',
      'Sprobuj jeszcze raz'
    );
    expect(screen.getByTestId('music-melody-repeat-outcome-shell')).toHaveAttribute(
      'data-outcome',
      'error'
    );
    expect(screen.getByTestId('music-melody-repeat-outcome-banner')).toHaveAttribute(
      'aria-label',
      'Melodia do powtorzenia'
    );
    expect(screen.getByTestId('music-melody-repeat-outcome-banner-icon')).toHaveTextContent('❌');
    expect(screen.getByTestId('music-melody-repeat-outcome-banner')).toHaveTextContent(
      'Jeszcze raz'
    );
    expect(screen.getByTestId('music-melody-repeat-status-outcome-icon')).toHaveTextContent('❌');
    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'Ups. Posluchaj jeszcze raz i powtorz melodie od poczatku.'
    );
    expect(screen.getByTestId('music-melody-repeat-status-phase')).toHaveAttribute(
      'aria-label',
      'Start'
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.keyPrefix}-fa`)
    ).toHaveAttribute('aria-pressed', 'true');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_800);
    });

    expect(screen.queryByTestId('music-melody-repeat-summary-shell')).not.toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-outcome-shell')).toHaveAttribute(
      'data-outcome',
      'idle'
    );
    expect(screen.queryByTestId('music-melody-repeat-outcome-banner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('music-melody-repeat-status-outcome')).not.toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'Twoja kolej. Zacznij od dzwieku do.'
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-0`)
    ).toHaveAttribute(
      'data-state',
      'expected'
    );
  });

  it('keeps the play button centered and restarts playback immediately from the beginning', async () => {
    MusicMelodyRepeatGame = (
      await import('@/features/kangur/ui/components/music/MusicMelodyRepeatGame')
    ).default;
    render(<MusicMelodyRepeatGame onFinish={() => undefined} />);

    expect(screen.getByTestId('music-melody-repeat-listen-button')).toHaveClass('cursor-pointer');
    expect(screen.queryByTestId('music-melody-repeat-listen-glow')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Posluchaj melodii' }));
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(screen.queryByTestId('music-melody-repeat-listen-glow')).not.toBeInTheDocument();
    const replayButton = screen.getByRole('button', { name: 'Zagraj od poczatku' });
    expect(screen.getByTestId('music-melody-repeat-actions-group')).toHaveClass(
      'inline-grid',
      'grid-cols-[auto_auto_auto]'
    );
    expect(screen.getByTestId('music-melody-repeat-actions-left-slot').firstElementChild).toHaveClass(
      'pointer-events-none',
      'invisible'
    );
    expect(screen.getByTestId('music-melody-repeat-actions-right-slot')).toContainElement(
      replayButton
    );

    fireEvent.click(replayButton);

    expect(screen.getByTestId('music-melody-repeat-status-phase')).toHaveAttribute(
      'aria-label',
      'Sluchaj'
    );
    expect(screen.getByTestId('music-melody-repeat-listen-button')).toHaveClass('cursor-pointer');
    expect(screen.queryByTestId('music-melody-repeat-listen-glow')).not.toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'Sluchaj i patrz, ktore kolory zapalaja sie po kolei.'
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(screen.getByTestId('music-melody-repeat-status-phase')).toHaveAttribute(
      'aria-label',
      'Twoja kolej'
    );
  });

  it('supports synth-mode repetition without breaking melody scoring', async () => {
    const pianoRollModule = await import(
      '@/features/kangur/ui/components/music/KangurMusicPianoRoll'
    );
    const melodyRepeatModule = await import(
      '@/features/kangur/ui/components/music/MusicMelodyRepeatGame'
    );
    MusicMelodyRepeatGame = melodyRepeatModule.default;
    melodyRepeatTestIds = melodyRepeatModule.MUSIC_MELODY_REPEAT_TEST_IDS;
    render(<MusicMelodyRepeatGame onFinish={() => undefined} />);

    fireEvent.click(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-keyboard-mode-synth`)
    );
    expect(screen.getByTestId(melodyRepeatTestIds.pianoRoll.shell)).toHaveClass(
      pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.engineClassName
    );
    fireEvent.click(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-synth-glide-mode-semitone`)
    );
    fireEvent.click(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-synth-waveform-triangle`)
    );

    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-keyboard-mode-synth`)
    ).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-keyboard-mode-synth`)
    ).toHaveClass(
      pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-synth-glide-mode-semitone`)
    ).toHaveClass(
      pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-synth-envelope-button`)
    ).toHaveClass(
      pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-synth-waveform-sine`)
    ).toHaveAttribute(
      'aria-label',
      'Brzmienie: Sine'
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-synth-waveform-sine`)
    ).toHaveTextContent('');
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-synth-waveform-triangle`)
    ).toHaveClass(
      pianoRollModule.KANGUR_MUSIC_PIANO_ROLL_MOTION_HOOKS.synthControlButtonClassName
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-synth-waveform-icon-triangle`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-keyboard-mode-icon-synth`)
    ).toHaveTextContent('✨');
    expect(screen.getByTestId('music-melody-repeat-status-mode')).toHaveAttribute(
      'aria-label',
      'Tryb: synth'
    );
    expect(screen.getByTestId('music-melody-repeat-status-mode-icon')).toHaveTextContent('✨');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Posluchaj melodii' }));
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-transport-mode`)
    ).toHaveAttribute(
      'aria-label',
      'Tryb: synth'
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-transport-mode-icon`)
    ).toHaveTextContent('✨');
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-transport-waveform`)
    ).toHaveAttribute(
      'aria-label',
      'Brzmienie: Triangle'
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-transport-waveform-cue`)
    ).toHaveTextContent('👂');
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-transport-waveform-icon`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-transport-glide-mode`)
    ).toHaveAttribute(
      'aria-label',
      'Ruch: Stopnie'
    );
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-transport-glide-mode-icon`)
    ).toHaveTextContent('↕');
    expect(
      screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.stepPrefix}-transport-glide-mode-detail`)
    ).toHaveTextContent('#');

    const doKey = screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.keyPrefix}-do`);
    const reKey = screen.getByTestId(`${melodyRepeatTestIds.pianoRoll.keyPrefix}-re`);
    mockKeyRect(doKey);
    mockKeyRect(reKey);

    await act(async () => {
      fireEvent.pointerDown(doKey, {
        clientY: 132,
        pointerId: 21,
        pointerType: 'touch',
      });
      fireEvent.pointerMove(doKey, {
        clientY: 28,
        pointerId: 21,
        pointerType: 'touch',
      });
      fireEvent.pointerUp(doKey, {
        clientY: 28,
        pointerId: 21,
        pointerType: 'touch',
      });
    });

    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'Dobrze! Teraz dotknij dzwieku re.'
    );

    await act(async () => {
      fireEvent.pointerDown(reKey, {
        clientY: 40,
        pointerId: 23,
        pointerType: 'touch',
      });
      fireEvent.pointerUp(reKey, {
        clientY: 40,
        pointerId: 23,
        pointerType: 'touch',
      });
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByTestId('music-melody-repeat-summary-shell')).toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-summary-title')).toHaveTextContent(
      'Za pierwszym razem: 1/1'
    );
  });
});
