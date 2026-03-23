/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => true,
}));

import KangurMusicPianoRoll from '@/features/kangur/ui/components/music/KangurMusicPianoRoll';
import { DIATONIC_PIANO_KEYS } from '@/features/kangur/ui/components/music/music-theory';

describe('KangurMusicPianoRoll mobile viewport layout', () => {
  it('uses the compact layout on narrow viewports even without a coarse pointer', () => {
    render(
      <KangurMusicPianoRoll
        keyTestIdPrefix='music-roll-mobile-key'
        keys={DIATONIC_PIANO_KEYS}
        melody={['do', 're', 'mi']}
        shellTestId='music-roll-mobile-shell'
        showKeyboardModeSwitch
        stepTestIdPrefix='music-roll-mobile-step'
        title='Kolorowy piano roll'
      />
    );

    expect(screen.getByTestId('music-roll-mobile-shell')).toHaveAttribute('data-layout', 'compact');
    expect(screen.getByTestId('music-roll-mobile-step-controls-rail')).toHaveClass('overflow-x-auto');
    expect(screen.getByTestId('music-roll-mobile-step-keyboard-rail')).toHaveClass('overflow-x-auto');
    expect(screen.getByTestId('music-roll-mobile-step-keyboard-rail').firstElementChild).toHaveClass(
      'flex',
      'min-w-max'
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
