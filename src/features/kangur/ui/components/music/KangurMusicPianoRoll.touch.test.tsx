/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => true,
}));

import KangurMusicPianoRoll from '@/features/kangur/ui/components/music/KangurMusicPianoRoll';
import { DIATONIC_PIANO_KEYS } from '@/features/kangur/ui/components/music/music-theory';

describe('KangurMusicPianoRoll touch mode', () => {
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

  it('uses touch-friendly piano keys on coarse pointers', () => {
    const handleKeyPress = vi.fn();

    render(
      <KangurMusicPianoRoll
        keyTestIdPrefix='music-roll-touch-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're', 'mi']}
        onKeyPress={handleKeyPress}
      />
    );

    const fastKey = screen.getByTestId('music-roll-touch-key-do');
    const slowKey = screen.getByTestId('music-roll-touch-key-re');

    expect(screen.getByTestId('kangur-music-piano-step-keyboard-rail').closest('[data-layout]')).toHaveAttribute(
      'data-layout',
      'compact'
    );
    expect(screen.getByTestId('kangur-music-piano-step-keyboard-rail')).toHaveClass('overflow-x-auto');
    expect(screen.getByTestId('kangur-music-piano-step-keyboard-rail').firstElementChild).toHaveClass(
      'flex',
      'min-w-max'
    );
    expect(screen.queryByTestId('kangur-music-piano-step-lane-labels')).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-music-piano-step-measure-1')).not.toBeInTheDocument();
    expect(fastKey).toHaveClass(
      'min-h-[64px]',
      'min-w-[72px]',
      'touch-manipulation',
      'select-none'
    );

    fireEvent.pointerDown(fastKey, { pointerType: 'touch' });
    vi.advanceTimersByTime(45);
    fireEvent.click(fastKey);

    fireEvent.pointerDown(slowKey, { pointerType: 'touch' });
    vi.advanceTimersByTime(260);
    fireEvent.click(slowKey);

    const firstPress = handleKeyPress.mock.calls[0]?.[1];
    const secondPress = handleKeyPress.mock.calls[1]?.[1];

    expect(firstPress).toEqual(
      expect.objectContaining({
        pointerType: 'touch',
        velocity: expect.any(Number),
      })
    );
    expect(secondPress).toEqual(
      expect.objectContaining({
        pointerType: 'touch',
        velocity: expect.any(Number),
      })
    );
    expect(firstPress.velocity).toBeGreaterThan(secondPress.velocity);
  });

  it('uses non-scrolling synth keys and emits glide callbacks on coarse pointers', () => {
    const handleKeyPress = vi.fn();
    const handleSynthGestureChange = vi.fn();

    render(
      <KangurMusicPianoRoll
        expectedStepIndex={0}
        keyTestIdPrefix='music-roll-touch-synth-key'
        keyboardMode='synth'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're', 'mi']}
        onKeyPress={handleKeyPress}
        onSynthGestureChange={handleSynthGestureChange}
        showSynthGlideModeSwitch
        showSynthWaveformSwitch
        stepTestIdPrefix='music-roll-touch-synth-step'
      />
    );

    const key = screen.getByTestId('music-roll-touch-synth-key-do');
    const secondKey = screen.getByTestId('music-roll-touch-synth-key-re');
    mockKeyRect(key);
    mockKeyRect(secondKey);

    expect(key).toHaveClass('touch-none', 'select-none');
    expect(key).not.toHaveClass('touch-manipulation');
    expect(key).toHaveStyle({ touchAction: 'none' });
    expect(screen.getByTestId('music-roll-touch-synth-step-controls-rail')).toHaveClass(
      'overflow-x-auto'
    );
    expect(screen.getByTestId('music-roll-touch-synth-step-keyboard-rail')).toHaveClass(
      'overflow-x-auto'
    );
    expect(screen.queryByTestId('music-roll-touch-synth-step-lane-labels')).not.toBeInTheDocument();
    expect(screen.queryByTestId('music-roll-touch-synth-step-measure-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('music-roll-touch-synth-step-transport-mode')).toHaveTextContent(
      'Synth'
    );
    expect(screen.getByTestId('music-roll-touch-synth-step-transport-waveform')).toHaveTextContent(
      'Brzmienie: Saw'
    );
    expect(screen.getByTestId('music-roll-touch-synth-step-transport-glide-mode')).toHaveTextContent(
      'Ruch: Plynnie'
    );

    fireEvent.click(screen.getByTestId('music-roll-touch-synth-step-synth-waveform-square'));
    fireEvent.click(screen.getByTestId('music-roll-touch-synth-step-synth-glide-mode-semitone'));

    expect(screen.getByTestId('music-roll-touch-synth-step-transport-waveform')).toHaveTextContent(
      'Brzmienie: Square'
    );
    expect(screen.getByTestId('music-roll-touch-synth-step-transport-glide-mode')).toHaveTextContent(
      'Ruch: Stopnie'
    );

    fireEvent.pointerDown(key, {
      clientY: 128,
      pointerId: 11,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(secondKey, {
      clientY: 80,
      pointerId: 12,
      pointerType: 'touch',
    });

    expect(screen.getByTestId('music-roll-touch-synth-step-transport-fingers')).toHaveTextContent(
      'Glides: 2'
    );
    expect(key).toHaveAttribute('data-active-glides', '1');
    expect(secondKey).toHaveAttribute('data-active-glides', '1');

    fireEvent.pointerMove(key, {
      clientY: 24,
      pointerId: 11,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(key, {
      clientY: 24,
      pointerId: 11,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(secondKey, {
      clientY: 80,
      pointerId: 12,
      pointerType: 'touch',
    });

    expect(handleKeyPress).toHaveBeenCalledWith(
      'do',
      expect.objectContaining({
        interactionId: 'synth-11-do',
        keyboardMode: 'synth',
        pointerType: 'touch',
      })
    );
    expect(handleSynthGestureChange).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionId: 'synth-11-do',
        noteId: 'do',
        pitchSemitoneOffset: 1,
      })
    );
  });
});
