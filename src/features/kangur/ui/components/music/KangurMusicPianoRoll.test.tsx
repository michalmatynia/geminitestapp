/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import KangurMusicPianoRoll from '@/features/kangur/ui/components/music/KangurMusicPianoRoll';
import { DIATONIC_PIANO_KEYS } from '@/features/kangur/ui/components/music/music-theory';

describe('KangurMusicPianoRoll', () => {
  const scrollIntoViewMock = vi.fn();
  const setPointerCaptureMock = vi.fn();
  const releasePointerCaptureMock = vi.fn();

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
    scrollIntoViewMock.mockReset();
    setPointerCaptureMock.mockReset();
    releasePointerCaptureMock.mockReset();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
      writable: true,
    });
    Object.defineProperty(HTMLButtonElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: setPointerCaptureMock,
      writable: true,
    });
    Object.defineProperty(HTMLButtonElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCaptureMock,
      writable: true,
    });
  });

  afterEach(() => {
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
    delete (HTMLButtonElement.prototype as Partial<HTMLButtonElement>).setPointerCapture;
    delete (HTMLButtonElement.prototype as Partial<HTMLButtonElement>).releasePointerCapture;
  });

  it('renders played, active, and expected melody steps and forwards key presses', () => {
    const handleKeyPress = vi.fn();

    render(
      <KangurMusicPianoRoll
        activeStepIndex={1}
        completedStepCount={1}
        expectedStepIndex={2}
        keyTestIdPrefix='music-roll-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={[
          { noteId: 'do', span: 2 },
          { noteId: 're' },
          { label: 'DO+', noteId: 'high_do', span: 3 },
        ]}
        onKeyPress={handleKeyPress}
        pressedNoteId='do'
        shellTestId='music-roll-shell'
        stepTestIdPrefix='music-roll-step'
      />
    );

    expect(screen.getByTestId('music-roll-shell')).toBeInTheDocument();
    expect(screen.getByTestId('music-roll-shell')).toHaveAttribute('data-layout', 'full');
    expect(screen.getByTestId('music-roll-step-lane-labels')).toBeInTheDocument();
    expect(screen.getByTestId('music-roll-step-keyboard-rail')).not.toHaveClass('overflow-x-auto');
    expect(screen.getByTestId('music-roll-step-0')).toHaveAttribute('data-state', 'played');
    expect(screen.getByTestId('music-roll-step-1')).toHaveAttribute('data-state', 'active');
    expect(screen.getByTestId('music-roll-step-2')).toHaveAttribute('data-state', 'expected');
    expect(screen.getByTestId('music-roll-step-2')).toHaveAttribute('data-lane-id', 'high_do');
    expect(screen.getByTestId('music-roll-step-2')).toHaveAttribute('data-span', '3');
    expect(screen.getByTestId('music-roll-step-2')).toHaveStyle({
      gridColumn: '4 / span 3',
    });
    expect(screen.getByTestId('music-roll-step-cursor')).toHaveStyle({
      gridColumn: '3 / span 1',
    });
    expect(screen.getByTestId('music-roll-step-measure-1')).toHaveTextContent('Takt 1');
    expect(screen.getByTestId('music-roll-step-measure-2')).toHaveTextContent('Takt 2');
    expect(screen.getByTestId('music-roll-step-measure-boundary-4')).toBeInTheDocument();
    expect(screen.getByTestId('music-roll-step-measure-summary-1')).toHaveTextContent(
      'Jednostki 1-4'
    );
    expect(screen.getByTestId('music-roll-step-measure-summary-2')).toHaveTextContent(
      'Jednostki 5-6'
    );
    expect(screen.getByTestId('music-roll-step-transport-active')).toHaveTextContent('Teraz: RE');
    expect(screen.getByTestId('music-roll-step-transport-expected')).toHaveTextContent(
      'Dalej: DO+'
    );
    expect(screen.getByTestId('music-roll-step-transport-count')).toHaveTextContent('Krok 2/3');
    expect(screen.getByTestId('music-roll-key-re')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('music-roll-key-high_do')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('music-roll-key-do')).toHaveAttribute('aria-pressed', 'true');
    expect(scrollIntoViewMock).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });

    fireEvent.click(screen.getByTestId('music-roll-key-mi'));

    expect(handleKeyPress).toHaveBeenCalledWith(
      'mi',
      expect.objectContaining({
        pointerType: 'mouse',
        velocity: expect.any(Number),
      })
    );
  });

  it('switches to synth mode and emits glide gesture updates while dragging vertically', () => {
    const handleKeyboardModeChange = vi.fn();
    const handleSynthGlideModeChange = vi.fn();
    const handleKeyPress = vi.fn();
    const handleSynthGestureStart = vi.fn();
    const handleSynthGestureChange = vi.fn();
    const handleSynthGestureEnd = vi.fn();
    const handleSynthWaveformChange = vi.fn();

    render(
      <KangurMusicPianoRoll
        expectedStepIndex={0}
        keyTestIdPrefix='music-roll-synth-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're']}
        onKeyboardModeChange={handleKeyboardModeChange}
        onKeyPress={handleKeyPress}
        onSynthGlideModeChange={handleSynthGlideModeChange}
        onSynthGestureChange={handleSynthGestureChange}
        onSynthGestureEnd={handleSynthGestureEnd}
        onSynthGestureStart={handleSynthGestureStart}
        onSynthWaveformChange={handleSynthWaveformChange}
        showKeyboardModeSwitch
        showSynthGlideModeSwitch
        showSynthWaveformSwitch
        stepTestIdPrefix='music-roll-synth-step'
      />
    );

    fireEvent.click(screen.getByTestId('music-roll-synth-step-keyboard-mode-synth'));

    expect(handleKeyboardModeChange).toHaveBeenCalledWith('synth');
    expect(screen.getByTestId('music-roll-synth-step-keyboard-mode-synth')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-waveform-sine')).toHaveAttribute(
      'aria-label',
      'Brzmienie: Sine'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-waveform-sine')).toHaveTextContent('');
    expect(
      screen.getByTestId('music-roll-synth-step-synth-waveform-icon-sine')
    ).toBeInTheDocument();
    expect(screen.getByTestId('music-roll-synth-step-transport-mode')).toHaveTextContent('Synth');
    expect(screen.getByTestId('music-roll-synth-step-transport-waveform')).toHaveTextContent(
      'Brzmienie: Saw'
    );
    expect(screen.getByTestId('music-roll-synth-step-transport-glide-mode')).toHaveTextContent(
      'Ruch: Plynnie'
    );

    fireEvent.click(screen.getByTestId('music-roll-synth-step-synth-waveform-triangle'));

    expect(handleSynthWaveformChange).toHaveBeenCalledWith('triangle');
    expect(screen.getByTestId('music-roll-synth-step-synth-waveform-triangle')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByTestId('music-roll-synth-step-synth-waveform-icon-triangle')
    ).toBeInTheDocument();
    expect(screen.getByTestId('music-roll-synth-step-transport-waveform')).toHaveTextContent(
      'Brzmienie: Triangle'
    );

    const key = screen.getByTestId('music-roll-synth-key-do');
    const secondKey = screen.getByTestId('music-roll-synth-key-re');
    mockKeyRect(key);
    mockKeyRect(secondKey);

    fireEvent.pointerDown(key, {
      clientY: 120,
      pointerId: 7,
      pointerType: 'touch',
    });

    expect(handleKeyPress).toHaveBeenCalledWith(
      'do',
      expect.objectContaining({
        interactionId: 'synth-7-do',
        keyboardMode: 'synth',
        pointerType: 'touch',
      })
    );
    expect(handleSynthGestureStart).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionId: 'synth-7-do',
        normalizedVerticalPosition: 0.75,
        noteId: 'do',
        pitchSemitoneOffset: -1,
      })
    );
    expect(setPointerCaptureMock).toHaveBeenCalledWith(7);
    expect(screen.getByTestId('music-roll-synth-step-transport-fingers')).toHaveTextContent(
      'Glides: 1'
    );
    expect(key).toHaveAttribute('data-active-glides', '1');

    fireEvent.pointerDown(secondKey, {
      clientY: 96,
      pointerId: 8,
      pointerType: 'touch',
    });

    expect(screen.getByTestId('music-roll-synth-step-transport-fingers')).toHaveTextContent(
      'Glides: 2'
    );
    expect(secondKey).toHaveAttribute('data-active-glides', '1');

    fireEvent.pointerMove(key, {
      clientY: 20,
      pointerId: 7,
      pointerType: 'touch',
    });

    expect(handleSynthGestureChange).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionId: 'synth-7-do',
        normalizedVerticalPosition: 0.125,
        noteId: 'do',
        pitchSemitoneOffset: 1.5,
      })
    );
    expect(screen.getByTestId('music-roll-synth-step-transport-glide')).toHaveTextContent(
      'Glide: +1.5 st'
    );

    fireEvent.pointerUp(key, {
      clientY: 20,
      pointerId: 7,
      pointerType: 'touch',
    });

    expect(handleSynthGestureEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionId: 'synth-7-do',
        noteId: 'do',
        pitchSemitoneOffset: 1.5,
      })
    );
    expect(releasePointerCaptureMock).toHaveBeenCalledWith(7);

    fireEvent.pointerUp(secondKey, {
      clientY: 96,
      pointerId: 8,
      pointerType: 'touch',
    });

    fireEvent.click(screen.getByTestId('music-roll-synth-step-synth-glide-mode-semitone'));

    expect(handleSynthGlideModeChange).toHaveBeenCalledWith('semitone');
    expect(screen.getByTestId('music-roll-synth-step-synth-glide-mode-semitone')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByTestId('music-roll-synth-step-transport-glide-mode')).toHaveTextContent(
      'Ruch: Stopnie'
    );

    fireEvent.pointerDown(key, {
      clientY: 120,
      pointerId: 9,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(key, {
      clientY: 20,
      pointerId: 9,
      pointerType: 'touch',
    });

    expect(handleSynthGestureChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        interactionId: 'synth-9-do',
        noteId: 'do',
        pitchSemitoneOffset: 2,
      })
    );
    expect(screen.getByTestId('music-roll-synth-step-transport-glide')).toHaveTextContent(
      'Glide: +2.0 st'
    );
  });

  it('can render six-year-old icon cues for synth transport and switches', () => {
    render(
      <KangurMusicPianoRoll
        expectedStepIndex={0}
        keyboardMode='synth'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're']}
        showKeyboardModeSwitch
        showSynthGlideModeSwitch
        showSynthWaveformSwitch
        stepTestIdPrefix='music-roll-kid-step'
        visualCueMode='six_year_old'
      />
    );

    expect(screen.getByTestId('music-roll-kid-step-keyboard-mode-icon-piano')).toHaveTextContent(
      '🎹'
    );
    expect(screen.getByTestId('music-roll-kid-step-keyboard-mode-icon-synth')).toHaveTextContent(
      '✨'
    );
    expect(screen.getByTestId('music-roll-kid-step-synth-waveform-sine')).toHaveAttribute(
      'aria-label',
      'Brzmienie: Sine'
    );
    expect(screen.getByTestId('music-roll-kid-step-synth-glide-mode-icon-semitone')).toHaveTextContent(
      '↕'
    );
    expect(
      screen.getByTestId('music-roll-kid-step-synth-glide-mode-detail-semitone')
    ).toHaveTextContent('#');
    expect(screen.getByTestId('music-roll-kid-step-transport-mode')).toHaveAttribute(
      'aria-label',
      'Tryb: synth'
    );
    expect(screen.getByTestId('music-roll-kid-step-transport-waveform-cue')).toHaveTextContent(
      '👂'
    );
    expect(screen.getByTestId('music-roll-kid-step-transport-glide-mode-icon')).toHaveTextContent(
      '↕'
    );
  });
});
