/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    loadProgress: () => loadProgressMock(),
  };
});

vi.mock('@/features/kangur/ui/services/session-score', () => ({
  persistKangurSessionScore: (...args: unknown[]) => persistKangurSessionScoreMock(...args),
}));

vi.mock('@/features/kangur/ui/components/music/MusicMelodyRepeatGame.data', () => ({
  MUSIC_MELODY_REPEAT_ROUNDS: [
    {
      accent: 'sky',
      hint: 'Posluchaj dwoch dzwiekow i zagraj je po kolei.',
      id: 'test_round',
      notes: ['do', 're'],
      title: 'Testowa melodia',
    },
  ],
}));

import MusicMelodyRepeatGame from '@/features/kangur/ui/components/music/MusicMelodyRepeatGame';

class MockOscillatorNode {
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

class MockAudioContext {
  currentTime = 0;
  destination = {};
  state: AudioContextState = 'running';
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  createGain = vi.fn(() => new MockGainNode() as unknown as GainNode);
  createOscillator = vi.fn(() => new MockOscillatorNode() as unknown as OscillatorNode);
  resume = vi.fn(async () => {
    this.state = 'running';
  });
}

describe('MusicMelodyRepeatGame', () => {
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
    render(<MusicMelodyRepeatGame onFinish={() => undefined} />);

    expect(screen.queryByText('Kolorowy piano roll')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Kolory na gorze pokazuja kolejne dzwieki melodii. Gdy przyjdzie Twoja kolej, dotykaj tych samych kolorow na klawiaturze.'
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Testowa melodia')).not.toBeInTheDocument();
    expect(screen.queryByText('Posluchaj dwoch dzwiekow i zagraj je po kolei.')).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Posluchaj melodii' }));
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'Twoja kolej. Zacznij od dzwieku do.'
    );
    expect(screen.getByTestId('music-melody-repeat-step-0')).toHaveAttribute(
      'data-state',
      'expected'
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('music-melody-repeat-key-do'));
    });
    expect(screen.getByTestId('music-melody-repeat-step-0')).toHaveAttribute(
      'data-state',
      'played'
    );
    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'Dobrze! Teraz dotknij dzwieku re.'
    );

    await act(async () => {
      fireEvent.click(screen.getByTestId('music-melody-repeat-key-re'));
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByTestId('music-melody-repeat-summary-shell')).toBeInTheDocument();
    expect(screen.getByTestId('music-melody-repeat-summary-title')).toHaveTextContent(
      'Powtorzone melodie: 1/1'
    );
    expect(addXpMock).toHaveBeenCalledWith(18, {});
    expect(persistKangurSessionScoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        correctAnswers: 1,
        operation: 'music_diatonic_scale',
        score: 1,
        totalQuestions: 1,
        xpEarned: 18,
      })
    );
  });

  it('keeps the learner on the same expected note after a wrong key press', async () => {
    render(<MusicMelodyRepeatGame onFinish={() => undefined} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Posluchaj melodii' }));
      await vi.advanceTimersByTimeAsync(1_200);
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('music-melody-repeat-key-fa'));
    });

    expect(screen.getByTestId('music-melody-repeat-feedback')).toHaveTextContent(
      'To jeszcze nie ten kolor. Teraz dotknij dzwieku do.'
    );
    expect(screen.getByTestId('music-melody-repeat-step-0')).toHaveAttribute(
      'data-state',
      'expected'
    );
    expect(screen.getByTestId('music-melody-repeat-key-fa')).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports synth-mode repetition without breaking melody scoring', async () => {
    render(<MusicMelodyRepeatGame onFinish={() => undefined} />);

    fireEvent.click(screen.getByTestId('music-melody-repeat-step-keyboard-mode-synth'));
    fireEvent.click(screen.getByTestId('music-melody-repeat-step-synth-glide-mode-semitone'));
    fireEvent.click(screen.getByTestId('music-melody-repeat-step-synth-waveform-triangle'));

    expect(screen.getByTestId('music-melody-repeat-step-keyboard-mode-synth')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByText('Tryb: synth')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Posluchaj melodii' }));
      await vi.advanceTimersByTimeAsync(1_200);
    });

    expect(screen.getByTestId('music-melody-repeat-step-transport-mode')).toHaveTextContent(
      'Synth'
    );
    expect(screen.getByTestId('music-melody-repeat-step-transport-waveform')).toHaveTextContent(
      'Brzmienie: Triangle'
    );
    expect(screen.getByTestId('music-melody-repeat-step-transport-glide-mode')).toHaveTextContent(
      'Ruch: Stopnie'
    );

    const doKey = screen.getByTestId('music-melody-repeat-key-do');
    const reKey = screen.getByTestId('music-melody-repeat-key-re');
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
      'Powtorzone melodie: 1/1'
    );
  });
});
