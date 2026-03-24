/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DIATONIC_PIANO_KEYS } from '@/features/kangur/ui/components/music/music-theory';

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

describe('KangurMusicPianoRoll', () => {
  const scrollIntoViewMock = vi.fn();
  const setPointerCaptureMock = vi.fn();
  const releasePointerCaptureMock = vi.fn();
  let KangurMusicPianoRoll: typeof import('@/features/kangur/ui/components/music/KangurMusicPianoRoll').default;

  const mockKeyRect = (element: HTMLElement, top = 0, height = 160, left = 0, width = 96): void => {
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
    scrollIntoViewMock.mockReset();
    setPointerCaptureMock.mockReset();
    releasePointerCaptureMock.mockReset();
    useKangurCoarsePointerMock.mockReturnValue(false);
    useKangurMobileBreakpointMock.mockReturnValue(false);
    KangurMusicPianoRoll = (
      await import('@/features/kangur/ui/components/music/KangurMusicPianoRoll')
    ).default;
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
    delete (globalThis as Partial<typeof globalThis>).requestAnimationFrame;
    delete (globalThis as Partial<typeof globalThis>).cancelAnimationFrame;
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
    expect(screen.getByTestId('music-roll-key-do')).toHaveAttribute('data-key-state', 'pressed');
    expect(screen.getByTestId('music-roll-key-re')).toHaveAttribute('data-key-state', 'active');
    expect(screen.getByTestId('music-roll-key-high_do')).toHaveAttribute('data-key-state', 'expected');
    expect(screen.getByTestId('music-roll-key-do')).toHaveClass('cursor-pointer');
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

  it('switches to synth mode and maps horizontal glide to pitch while vertical motion controls vibrato', async () => {
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
    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-keyboard-mode-synth')).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    );
    expect(screen.getByTestId('music-roll-synth-step-keyboard-mode-piano')).toHaveClass(
      'cursor-pointer'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-waveform-sine')).toHaveAttribute(
      'aria-label',
      'Brzmienie: Sine'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-waveform-sine')).toHaveClass(
      'cursor-pointer'
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
    expect(screen.getByTestId('music-roll-synth-step-transport-axis-map')).toHaveTextContent(
      'X: Pitch · Y: Vibrato'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-axis-guide-x')).toHaveTextContent(
      'X = Pitch'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-axis-guide-y')).toHaveTextContent(
      'Y = Vibrato'
    );

    fireEvent.click(screen.getByTestId('music-roll-synth-step-synth-waveform-triangle'));

    expect(handleSynthWaveformChange).toHaveBeenCalledWith('triangle');
    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-synth-waveform-triangle')).toHaveAttribute(
        'aria-pressed',
        'true'
      )
    );
    expect(
      screen.getByTestId('music-roll-synth-step-synth-waveform-icon-triangle')
    ).toBeInTheDocument();
    expect(screen.getByTestId('music-roll-synth-step-transport-waveform')).toHaveTextContent(
      'Brzmienie: Triangle'
    );

    const key = screen.getByTestId('music-roll-synth-key-do');
    const secondKey = screen.getByTestId('music-roll-synth-key-re');
    mockKeyRect(key, 0, 160, 0, 96);
    mockKeyRect(secondKey, 0, 160, 104, 96);
    expect(key).toHaveClass('cursor-pointer');

    fireEvent.pointerDown(key, {
      clientX: 48,
      clientY: 80,
      pointerId: 7,
      pointerType: 'touch',
    });

    expect(handleKeyPress).toHaveBeenCalledWith(
      'do',
      expect.objectContaining({
        brightness: expect.any(Number),
        interactionId: 'synth-7-do',
        keyboardMode: 'synth',
        pointerType: 'touch',
      })
    );
    expect(handleSynthGestureStart).toHaveBeenCalledWith(
      expect.objectContaining({
        brightness: expect.any(Number),
        interactionId: 'synth-7-do',
        normalizedVerticalPosition: 0.5,
        noteId: 'do',
        pitchSemitoneOffset: 0,
        stereoPan: -0.34,
        vibratoDepth: 0,
        vibratoRateHz: 5.2,
      })
    );
    expect(setPointerCaptureMock).toHaveBeenCalledWith(7);
    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-transport-fingers')).toHaveTextContent(
        'Glides: 1'
      )
    );
    expect(screen.getByTestId('music-roll-synth-step-transport-pan')).toHaveTextContent(
      'Pan: L34'
    );
    expect(key).toHaveAttribute('data-active-glides', '1');
    expect(screen.getByTestId('music-roll-synth-step-synth-axis-anchor-do')).toHaveAttribute(
      'data-active-anchor',
      'true'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-axis-anchor-re')).not.toHaveAttribute(
      'data-active-anchor'
    );

    fireEvent.pointerDown(secondKey, {
      clientX: 152,
      clientY: 80,
      pointerId: 8,
      pointerType: 'touch',
    });

    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-transport-fingers')).toHaveTextContent(
        'Glides: 2'
      )
    );
    expect(secondKey).toHaveAttribute('data-active-glides', '1');

    fireEvent.pointerMove(key, {
      clientX: 106,
      clientY: 80,
      pointerId: 7,
      pointerType: 'touch',
    });

    expect(handleSynthGestureChange).toHaveBeenCalledWith(
      expect.objectContaining({
        interactionId: 'synth-7-do',
        noteId: 're',
        pitchCentsFromKey: -88,
        pitchSemitoneOffset: 1.12,
        stereoPan: 0,
      })
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-axis-anchor-do')).toHaveAttribute(
      'data-active-anchor',
      'true'
    );
    expect(screen.getByTestId('music-roll-synth-key-do')).toHaveAttribute(
      'data-active-glides',
      '1'
    );

    fireEvent.pointerMove(key, {
      clientX: 126,
      clientY: 80,
      pointerId: 7,
      pointerType: 'touch',
    });

    await waitFor(() =>
      expect(handleSynthGestureChange).toHaveBeenCalledWith(
        expect.objectContaining({
          brightness: expect.any(Number),
          interactionId: 'synth-7-do',
          normalizedVerticalPosition: 0.5,
          noteId: 're',
          pitchCentsFromKey: -50,
          pitchSemitoneOffset: 1.5,
          stereoPan: 0.14,
          vibratoDepth: 0,
          vibratoRateHz: 5.2,
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-transport-glide')).toHaveTextContent(
        'Glide: +1.5 st'
      )
    );
    expect(screen.getByTestId('music-roll-synth-step-transport-pitch')).toHaveTextContent(
      'Pitch: RE -50c · 63%'
    );
    expect(screen.getByTestId('music-roll-synth-step-transport-pan')).toHaveTextContent(
      'Pan: R14'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-pitch-guide')).toHaveAttribute(
      'data-pitch-position',
      '0.63'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-pitch-guide')).toHaveAttribute(
      'data-pan',
      '0.14'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-pitch-guide')).toHaveAttribute(
      'data-pitch-cents',
      '-50'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-axis-anchor-re')).toHaveAttribute(
      'data-active-anchor',
      'true'
    );

    fireEvent.pointerMove(key, {
      clientX: 152,
      clientY: 80,
      pointerId: 7,
      pointerType: 'touch',
    });

    await waitFor(() =>
      expect(handleSynthGestureChange).toHaveBeenCalledWith(
        expect.objectContaining({
          brightness: expect.any(Number),
          interactionId: 'synth-7-do',
          normalizedVerticalPosition: 0.5,
          noteId: 're',
          pitchSemitoneOffset: 2,
          stereoPan: 0.34,
          vibratoDepth: 0,
          vibratoRateHz: 5.2,
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-transport-glide')).toHaveTextContent(
        'Glide: +2.0 st'
      )
    );
    expect(screen.getByTestId('music-roll-synth-step-transport-pitch')).toHaveTextContent(
      'Pitch: RE · 76%'
    );
    expect(screen.getByTestId('music-roll-synth-step-transport-pan')).toHaveTextContent(
      'Pan: R34'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-pitch-guide')).toHaveAttribute(
      'data-pitch-position',
      '0.76'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-pitch-guide')).toHaveAttribute(
      'data-pan',
      '0.34'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-pitch-guide')).toHaveAttribute(
      'data-pitch-cents',
      '0'
    );
    expect(screen.getByTestId('music-roll-synth-step-synth-axis-anchor-re')).toHaveAttribute(
      'data-active-anchor',
      'true'
    );

    fireEvent.pointerMove(key, {
      clientX: 152,
      clientY: 20,
      pointerId: 7,
      pointerType: 'touch',
    });

    await waitFor(() =>
      expect(handleSynthGestureChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          interactionId: 'synth-7-do',
          normalizedVerticalPosition: 0.125,
          noteId: 're',
          pitchSemitoneOffset: 2,
          vibratoDepth: expect.any(Number),
          vibratoRateHz: 3.9,
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-transport-vibrato')).toHaveTextContent(
        'Vibrato: 72% · 3.9Hz'
      )
    );
    expect(
      screen
        .getByTestId('music-roll-synth-key-re')
        .querySelector('[data-vibrato-neutral-zone="0.12"]')
    ).not.toBeNull();
    expect(
      screen
        .getByTestId('music-roll-synth-key-re')
        .querySelector('[data-vibrato-direction="up"]')
    ).not.toBeNull();
    expect(
      screen
        .getByTestId('music-roll-synth-key-re')
        .querySelector('[data-vibrato-rate="3.9"]')
    ).not.toBeNull();

    fireEvent.pointerMove(key, {
      clientX: 152,
      clientY: 80,
      pointerId: 7,
      pointerType: 'touch',
    });

    await waitFor(() =>
      expect(handleSynthGestureChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          interactionId: 'synth-7-do',
          normalizedVerticalPosition: 0.5,
          noteId: 're',
          pitchSemitoneOffset: 2,
          vibratoDepth: 0,
          vibratoRateHz: 5.2,
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-transport-vibrato')).toHaveTextContent(
        'Vibrato: 0%'
      )
    );
    expect(
      screen
        .getByTestId('music-roll-synth-key-re')
        .querySelector('[data-vibrato-direction="neutral"]')
    ).not.toBeNull();

    fireEvent.pointerUp(key, {
      clientX: 152,
      clientY: 80,
      pointerId: 7,
      pointerType: 'touch',
    });

    await waitFor(() =>
      expect(handleSynthGestureEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          interactionId: 'synth-7-do',
          noteId: 're',
          pitchSemitoneOffset: 2,
        })
      )
    );
    await waitFor(() => expect(releasePointerCaptureMock).toHaveBeenCalledWith(7));

    fireEvent.pointerUp(secondKey, {
      clientX: 152,
      clientY: 80,
      pointerId: 8,
      pointerType: 'touch',
    });

    fireEvent.click(screen.getByTestId('music-roll-synth-step-synth-glide-mode-semitone'));

    expect(handleSynthGlideModeChange).toHaveBeenCalledWith('semitone');
    await waitFor(() =>
      expect(
        screen.getByTestId('music-roll-synth-step-synth-glide-mode-semitone')
      ).toHaveAttribute('aria-pressed', 'true')
    );
    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-transport-glide-mode')).toHaveTextContent(
        'Ruch: Stopnie'
      )
    );

    fireEvent.pointerDown(key, {
      clientX: 48,
      clientY: 80,
      pointerId: 9,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(key, {
      clientX: 120,
      clientY: 80,
      pointerId: 9,
      pointerType: 'touch',
    });

    await waitFor(() =>
      expect(handleSynthGestureChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          interactionId: 'synth-9-do',
          noteId: 're',
          pitchSemitoneOffset: 1,
        })
      )
    );
    await waitFor(() =>
      expect(screen.getByTestId('music-roll-synth-step-transport-glide')).toHaveTextContent(
        'Glide: +1.0 st'
      )
    );
  });

  it('opens the ADSR modal in synth mode and updates the envelope controls', async () => {
    const handleSynthEnvelopeChange = vi.fn();

    render(
      <KangurMusicPianoRoll
        keyTestIdPrefix='music-roll-envelope-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're']}
        onSynthEnvelopeChange={handleSynthEnvelopeChange}
        showKeyboardModeSwitch
        showSynthEnvelopeButton
        stepTestIdPrefix='music-roll-envelope-step'
      />
    );

    fireEvent.click(screen.getByTestId('music-roll-envelope-step-keyboard-mode-synth'));
    fireEvent.click(screen.getByTestId('music-roll-envelope-step-synth-envelope-button'));

    const modal = await screen.findByTestId('music-roll-envelope-step-synth-envelope-modal');
    expect(modal).toBeInTheDocument();

    const attackInput = screen.getByTestId(
      'music-roll-envelope-step-synth-envelope-attack'
    ) as HTMLInputElement;
    expect(attackInput.value).toBe('12');

    fireEvent.change(attackInput, { target: { value: '320' } });

    expect(handleSynthEnvelopeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        attackMs: 320,
        decayMs: 0,
        releaseMs: 90,
        sustainLevel: 1,
      })
    );
    expect(attackInput.value).toBe('320');
    expect(
      screen.getByTestId('music-roll-envelope-step-synth-envelope-attack-value')
    ).toHaveTextContent('320 ms');

    const sustainInput = screen.getByTestId(
      'music-roll-envelope-step-synth-envelope-sustain'
    ) as HTMLInputElement;
    fireEvent.change(sustainInput, { target: { value: '42' } });

    expect(handleSynthEnvelopeChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sustainLevel: 0.42,
      })
    );
    expect(
      screen.getByTestId('music-roll-envelope-step-synth-envelope-sustain-value')
    ).toHaveTextContent('42%');
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

  it('renders a free-play transport state when no melody is provided', async () => {
    render(
      <KangurMusicPianoRoll
        keyTestIdPrefix='music-roll-freeplay-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={[]}
        onKeyPress={vi.fn()}
        showKeyboardModeSwitch
        showSynthGlideModeSwitch
        showSynthWaveformSwitch
        stepTestIdPrefix='music-roll-freeplay-step'
      />
    );

    expect(screen.getByText('Swobodnie')).toBeInTheDocument();
    expect(screen.getByTestId('music-roll-freeplay-step-transport-freeplay')).toHaveTextContent(
      'Swobodna gra'
    );
    expect(
      screen.queryByTestId('music-roll-freeplay-step-transport-count')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('music-roll-freeplay-step-keyboard-mode-synth'));

    await waitFor(() =>
      expect(screen.getByTestId('music-roll-freeplay-step-transport-mode')).toHaveTextContent(
        'Synth'
      )
    );
    expect(
      screen.getByTestId('music-roll-freeplay-step-transport-axis-map')
    ).toHaveTextContent('X: Pitch · Y: Vibrato');
  });

  it('retargets a captured synth glide when the pointer crosses into a neighbouring key', () => {
    const handleSynthGestureChange = vi.fn();
    const handleSynthGestureEnd = vi.fn();

    render(
      <KangurMusicPianoRoll
        keyboardMode='synth'
        keyTestIdPrefix='music-roll-cross-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're']}
        onKeyPress={vi.fn()}
        onSynthGestureChange={handleSynthGestureChange}
        onSynthGestureEnd={handleSynthGestureEnd}
        stepTestIdPrefix='music-roll-cross-step'
      />
    );

    const doKey = screen.getByTestId('music-roll-cross-key-do');
    const reKey = screen.getByTestId('music-roll-cross-key-re');
    mockKeyRect(doKey, 0, 160, 0, 96);
    mockKeyRect(reKey, 0, 160, 104, 96);

    fireEvent.pointerDown(doKey, {
      clientX: 40,
      clientY: 118,
      pointerId: 31,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(doKey, {
      clientX: 146,
      clientY: 44,
      pointerId: 31,
      pointerType: 'touch',
    });

    expect(handleSynthGestureChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        interactionId: 'synth-31-do',
        noteId: 're',
      })
    );
    expect(screen.getByTestId('music-roll-cross-key-re')).toHaveAttribute('data-active-glides', '1');

    fireEvent.pointerUp(doKey, {
      clientX: 146,
      clientY: 44,
      pointerId: 31,
      pointerType: 'touch',
    });

    expect(handleSynthGestureEnd).toHaveBeenLastCalledWith(
      expect.objectContaining({
        interactionId: 'synth-31-do',
        noteId: 're',
      })
    );
  });
});
