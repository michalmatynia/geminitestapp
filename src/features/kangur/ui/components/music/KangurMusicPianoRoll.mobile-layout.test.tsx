/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
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

describe('KangurMusicPianoRoll mobile viewport layout', () => {
  let KangurMusicPianoRoll: typeof import('@/features/kangur/ui/components/music/KangurMusicPianoRoll').default;

  beforeEach(async () => {
    vi.resetModules();
    useKangurCoarsePointerMock.mockReturnValue(false);
    useKangurMobileBreakpointMock.mockReturnValue(true);
    KangurMusicPianoRoll = (
      await import('@/features/kangur/ui/components/music/KangurMusicPianoRoll')
    ).default;
  });

  it('uses the compact layout on narrow viewports even without a coarse pointer', () => {
    render(
      <KangurMusicPianoRoll
        keyTestIdPrefix='music-roll-mobile-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're', 'mi']}
        shellTestId='music-roll-mobile-shell'
        showKeyboardModeSwitch
        stepTestIdPrefix='music-roll-mobile-step'
      />
    );

    expect(screen.getByTestId('music-roll-mobile-shell')).toHaveAttribute('data-layout', 'compact');
    expect(screen.getByTestId('music-roll-mobile-shell')).toHaveClass('p-3.5');
    expect(screen.getByTestId('music-roll-mobile-step-controls-rail')).toHaveClass(
      'overflow-x-auto',
      'px-1'
    );
    expect(screen.getByTestId('music-roll-mobile-step-keyboard-rail')).toHaveClass(
      'overflow-x-auto',
      'px-1.5'
    );
    expect(screen.getByTestId('music-roll-mobile-step-keyboard-rail').firstElementChild).toHaveClass(
      'flex',
      'min-w-max',
      'gap-3'
    );
    expect(screen.queryByTestId('music-roll-mobile-step-lane-labels')).not.toBeInTheDocument();
    expect(screen.queryByTestId('music-roll-mobile-step-measure-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('music-roll-mobile-key-do')).toHaveClass(
      'min-h-[64px]',
      'min-w-[72px]'
    );
    expect(screen.getByTestId('music-roll-mobile-key-do')).not.toHaveClass('touch-manipulation');
  });
});
