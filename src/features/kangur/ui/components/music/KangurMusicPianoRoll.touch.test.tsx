/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurCoarsePointerMock, useKangurMobileBreakpointMock } = vi.hoisted(() => ({
  useKangurCoarsePointerMock: vi.fn(),
  useKangurMobileBreakpointMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => useKangurCoarsePointerMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => useKangurMobileBreakpointMock(),
}));

import { DIATONIC_PIANO_KEYS } from '@/features/kangur/ui/components/music/music-theory';

describe('KangurMusicPianoRoll touch mode', () => {
  let KangurMusicPianoRoll: typeof import('@/features/kangur/ui/components/music/KangurMusicPianoRoll').default;

  const mockKeyRect = (
    element: HTMLElement,
    top = 0,
    height = 160,
    left = 0,
    width = 96
  ): void => {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () =>
        ({
          bottom: top + height,
          height,
          left,
          right: left + width,
          top,
          width,
          x: left,
          y: top,
        }) as DOMRect,
    });
  };

  beforeEach(async () => {
    vi.useRealTimers();
    vi.resetModules();
    useKangurCoarsePointerMock.mockReturnValue(true);
    useKangurMobileBreakpointMock.mockReturnValue(true);
    KangurMusicPianoRoll = (
      await import('@/features/kangur/ui/components/music/KangurMusicPianoRoll')
    ).default;
    vi.useFakeTimers();
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(16);
        return 1;
      },
      writable: true,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn(),
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
    delete (globalThis as Partial<typeof globalThis>).requestAnimationFrame;
    delete (globalThis as Partial<typeof globalThis>).cancelAnimationFrame;
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
      'cursor-pointer',
      'min-h-[64px]',
      'min-w-[72px]',
      'touch-manipulation',
      'select-none'
    );

    fireEvent.pointerDown(fastKey, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(45);
    });
    fireEvent.click(fastKey);

    fireEvent.pointerDown(slowKey, { pointerType: 'touch' });
    act(() => {
      vi.advanceTimersByTime(260);
    });
    fireEvent.click(slowKey);

    const firstPress = handleKeyPress.mock.calls[0]?.[1];
    const secondPress = handleKeyPress.mock.calls[1]?.[1];

    expect(firstPress).toEqual(
      expect.objectContaining({
        brightness: expect.any(Number),
        pointerType: 'touch',
        pressure: null,
        travelDistancePx: expect.any(Number),
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

  it('boosts touch velocity when pressure and gesture travel indicate a stronger strike', () => {
    const handleKeyPress = vi.fn();

    render(
      <KangurMusicPianoRoll
        keyTestIdPrefix='music-roll-touch-expression-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're', 'mi']}
        onKeyPress={handleKeyPress}
      />
    );

    const expressiveKey = screen.getByTestId('music-roll-touch-expression-key-do');
    const gentleKey = screen.getByTestId('music-roll-touch-expression-key-re');

    fireEvent.pointerDown(expressiveKey, {
      clientY: 124,
      height: 18,
      pointerType: 'touch',
      pressure: 0.92,
      width: 24,
    });
    fireEvent.pointerMove(expressiveKey, {
      clientY: 58,
      height: 18,
      pointerType: 'touch',
      pressure: 0.84,
      width: 24,
    });
    fireEvent.pointerUp(expressiveKey, {
      clientY: 42,
      height: 18,
      pointerType: 'touch',
      pressure: 0.84,
      width: 24,
    });
    act(() => {
      vi.advanceTimersByTime(30);
    });
    fireEvent.click(expressiveKey);

    fireEvent.pointerDown(gentleKey, {
      clientY: 110,
      height: 12,
      pointerType: 'touch',
      pressure: 0.16,
      width: 12,
    });
    fireEvent.pointerUp(gentleKey, {
      clientY: 108,
      height: 12,
      pointerType: 'touch',
      pressure: 0.16,
      width: 12,
    });
    act(() => {
      vi.advanceTimersByTime(180);
    });
    fireEvent.click(gentleKey);

    const expressivePress = handleKeyPress.mock.calls[0]?.[1];
    const gentlePress = handleKeyPress.mock.calls[1]?.[1];

    expect(expressivePress.pressure).toBeCloseTo(0.92, 2);
    expect(expressivePress.travelDistancePx).toBeGreaterThan(60);
    expect(expressivePress.brightness).toBeGreaterThan(gentlePress.brightness);
    expect(expressivePress.velocity).toBeGreaterThan(gentlePress.velocity);
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
    mockKeyRect(key, 0, 160, 0, 96);
    mockKeyRect(secondKey, 0, 160, 104, 96);

    expect(key).toHaveClass('touch-none', 'select-none');
    expect(key).toHaveClass('cursor-pointer');
    expect(key).not.toHaveClass('touch-manipulation');
    expect(key).toHaveStyle({ touchAction: 'none' });
    expect(screen.getByTestId('music-roll-touch-synth-step-controls-rail')).toHaveClass(
      'overflow-x-auto'
    );
    expect(screen.getByTestId('music-roll-touch-synth-step-synth-waveform-sawtooth')).toHaveAttribute(
      'aria-label',
      'Brzmienie: Saw'
    );
    expect(screen.getByTestId('music-roll-touch-synth-step-synth-waveform-sawtooth')).toHaveClass(
      'cursor-pointer'
    );
    expect(screen.getByTestId('music-roll-touch-synth-step-synth-waveform-sawtooth')).toHaveTextContent(
      ''
    );
    expect(
      screen.getByTestId('music-roll-touch-synth-step-synth-waveform-icon-sawtooth')
    ).toBeInTheDocument();
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
    expect(screen.getByTestId('music-roll-touch-synth-step-transport-axis-map')).toHaveTextContent(
      'X: Pitch · Y: Vibrato'
    );
    expect(screen.getByTestId('music-roll-touch-synth-step-synth-axis-guide-shell')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('music-roll-touch-synth-step-synth-waveform-square'));
    fireEvent.click(screen.getByTestId('music-roll-touch-synth-step-synth-glide-mode-semitone'));

    expect(
      screen.getByTestId('music-roll-touch-synth-step-synth-waveform-icon-square')
    ).toBeInTheDocument();
    expect(screen.getByTestId('music-roll-touch-synth-step-transport-waveform')).toHaveTextContent(
      'Brzmienie: Square'
    );
    expect(screen.getByTestId('music-roll-touch-synth-step-transport-glide-mode')).toHaveTextContent(
      'Ruch: Stopnie'
    );

    fireEvent.pointerDown(key, {
      clientX: 48,
      clientY: 128,
      pointerId: 11,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(secondKey, {
      clientX: 152,
      clientY: 80,
      pointerId: 12,
      pointerType: 'touch',
    });

    expect(screen.getByTestId('music-roll-touch-synth-step-transport-fingers')).toHaveTextContent(
      'Glides: 2'
    );
    expect(key).toHaveAttribute('data-active-glides', '1');
    expect(secondKey).toHaveAttribute('data-active-glides', '1');
    expect(key).toHaveAttribute('data-key-state', 'gliding');

    fireEvent.pointerMove(key, {
      clientX: 48,
      clientY: 24,
      pointerId: 11,
      pointerType: 'touch',
    });
    expect(screen.getByTestId('music-roll-touch-synth-step-transport-pitch')).toHaveTextContent(
      'Pitch: DO'
    );
    act(() => {
      vi.advanceTimersByTime(16);
    });
    fireEvent.pointerUp(key, {
      clientX: 48,
      clientY: 24,
      pointerId: 11,
      pointerType: 'touch',
    });
    fireEvent.pointerUp(secondKey, {
      clientX: 152,
      clientY: 80,
      pointerId: 12,
      pointerType: 'touch',
    });

    expect(handleKeyPress).toHaveBeenCalledWith(
      'do',
      expect.objectContaining({
        brightness: expect.any(Number),
        interactionId: 'synth-11-do',
        keyboardMode: 'synth',
        pointerType: 'touch',
      })
    );
    expect(handleSynthGestureChange).toHaveBeenCalledWith(
      expect.objectContaining({
        brightness: expect.any(Number),
        interactionId: 'synth-11-do',
        noteId: 'do',
        pitchSemitoneOffset: 0,
        velocity: expect.any(Number),
        vibratoDepth: expect.any(Number),
      })
    );
  });

  it('treats cross-key touch swipes as stronger expressive motion, not only vertical drags', () => {
    const handleKeyPress = vi.fn();
    const handleSynthGestureChange = vi.fn();

    render(
      <KangurMusicPianoRoll
        keyboardMode='synth'
        keyTestIdPrefix='music-roll-touch-cross-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're', 'mi']}
        onKeyPress={handleKeyPress}
        onSynthGestureChange={handleSynthGestureChange}
      />
    );

    const doKey = screen.getByTestId('music-roll-touch-cross-key-do');
    const reKey = screen.getByTestId('music-roll-touch-cross-key-re');
    mockKeyRect(doKey, 0, 160, 0, 96);
    mockKeyRect(reKey, 0, 160, 104, 96);

    fireEvent.pointerDown(doKey, {
      clientX: 24,
      clientY: 120,
      height: 16,
      pointerId: 41,
      pointerType: 'touch',
      pressure: 0.22,
      width: 18,
    });
    const initialPress = handleKeyPress.mock.calls[0]?.[1];
    act(() => {
      vi.advanceTimersByTime(24);
    });
    fireEvent.pointerMove(doKey, {
      clientX: 148,
      clientY: 74,
      height: 16,
      pointerId: 41,
      pointerType: 'touch',
      pressure: 0.22,
      width: 18,
    });

    const glideUpdate = handleSynthGestureChange.mock.calls.at(-1)?.[0];

    expect(initialPress).toEqual(
      expect.objectContaining({
        brightness: expect.any(Number),
        interactionId: 'synth-41-do',
        velocity: expect.any(Number),
      })
    );
    expect(glideUpdate).toEqual(
      expect.objectContaining({
        brightness: expect.any(Number),
        interactionId: 'synth-41-do',
        noteId: 're',
        velocity: expect.any(Number),
      })
    );
    expect(glideUpdate.velocity).toBeGreaterThan(initialPress.velocity);
    expect(glideUpdate.brightness).toBeGreaterThan(initialPress.brightness);
    expect(screen.getByTestId('music-roll-touch-cross-key-re')).toHaveAttribute(
      'data-active-glides',
      '1'
    );
    expect(screen.getByTestId('music-roll-touch-cross-key-do')).toHaveAttribute(
      'data-hit-pulse',
      'press'
    );
    expect(screen.getByTestId('music-roll-touch-cross-key-re')).toHaveAttribute(
      'data-hit-pulse',
      'glide'
    );
  });

  it('lets live synth expression relax when touch pressure eases off after note start', () => {
    const handleSynthGestureStart = vi.fn();
    const handleSynthGestureChange = vi.fn();

    render(
      <KangurMusicPianoRoll
        keyboardMode='synth'
        keyTestIdPrefix='music-roll-touch-pressure-release'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're', 'mi']}
        onKeyPress={vi.fn()}
        onSynthGestureChange={handleSynthGestureChange}
        onSynthGestureStart={handleSynthGestureStart}
      />
    );

    const key = screen.getByTestId('music-roll-touch-pressure-release-do');
    mockKeyRect(key, 0, 160, 0, 96);

    fireEvent.pointerDown(key, {
      clientX: 48,
      clientY: 82,
      height: 18,
      pointerId: 51,
      pointerType: 'touch',
      pressure: 0.94,
      width: 22,
    });

    const startGesture = handleSynthGestureStart.mock.calls[0]?.[0];
    expect(startGesture).toEqual(
      expect.objectContaining({
        brightness: expect.any(Number),
        interactionId: 'synth-51-do',
        velocity: expect.any(Number),
      })
    );

    fireEvent.pointerMove(key, {
      clientX: 49,
      clientY: 82,
      height: 18,
      pointerId: 51,
      pointerType: 'touch',
      pressure: 0.94,
      width: 22,
    });

    const energizedGesture = handleSynthGestureChange.mock.calls.at(-1)?.[0];
    expect(energizedGesture).toEqual(
      expect.objectContaining({
        interactionId: 'synth-51-do',
        noteId: 'do',
      })
    );

    fireEvent.pointerMove(key, {
      clientX: 50,
      clientY: 82,
      height: 18,
      pointerId: 51,
      pointerType: 'touch',
      pressure: 0.18,
      width: 22,
    });

    const relaxedGesture = handleSynthGestureChange.mock.calls.at(-1)?.[0];
    expect(relaxedGesture).toEqual(
      expect.objectContaining({
        interactionId: 'synth-51-do',
        noteId: 'do',
      })
    );
    expect(relaxedGesture.velocity).toBeLessThan(energizedGesture.velocity);
    expect(relaxedGesture.brightness).toBeLessThan(energizedGesture.brightness);
  });

  it('supports six-year-old icon cues on coarse-pointer synth controls', () => {
    render(
      <KangurMusicPianoRoll
        expectedStepIndex={0}
        keyboardMode='synth'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're']}
        showKeyboardModeSwitch
        showSynthGlideModeSwitch
        showSynthWaveformSwitch
        stepTestIdPrefix='music-roll-touch-kid-step'
        visualCueMode='six_year_old'
      />
    );

    expect(screen.getByTestId('music-roll-touch-kid-step-keyboard-mode-icon-piano')).toHaveTextContent(
      '🎹'
    );
    expect(screen.getByTestId('music-roll-touch-kid-step-keyboard-mode-icon-synth')).toHaveTextContent(
      '✨'
    );
    expect(screen.getByTestId('music-roll-touch-kid-step-transport-waveform')).toHaveAttribute(
      'aria-label',
      'Brzmienie: Saw'
    );
    expect(screen.getByTestId('music-roll-touch-kid-step-transport-waveform-cue')).toHaveTextContent(
      '👂'
    );
    expect(
      screen.getByTestId('music-roll-touch-kid-step-transport-waveform-icon')
    ).toBeInTheDocument();
    expect(screen.getByTestId('music-roll-touch-kid-step-transport-glide-mode-detail')).toHaveTextContent(
      '∿'
    );
  });
});
