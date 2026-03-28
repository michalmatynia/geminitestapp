/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/features/kangur/shared/contracts/kangur';
import {
  saveProgress,
  setProgressOwnerKey,
} from '@/features/kangur/ui/services/progress';

const { subjectKeyState } = vi.hoisted(() => ({
  subjectKeyState: {
    current: 'learner-1' as string | null,
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurOptionalSubjectKey', () => ({
  useKangurOptionalSubjectKey: () => subjectKeyState.current,
}));

import { useKangurProgressState } from './useKangurProgressState';

const createProgress = (
  overrides: Partial<ReturnType<typeof createDefaultKangurProgressState>> = {}
) => ({
  ...createDefaultKangurProgressState(),
  ...overrides,
});

const ProgressProbe = (): React.JSX.Element => {
  const progress = useKangurProgressState();
  return <div data-testid='kangur-progress-total-xp'>{progress.totalXp}</div>;
};

const DisabledProgressProbe = (): React.JSX.Element => {
  const progress = useKangurProgressState({ enabled: false });
  return <div data-testid='kangur-disabled-progress-total-xp'>{progress.totalXp}</div>;
};

describe('useKangurProgressState', () => {
  beforeEach(() => {
    localStorage.clear();
    subjectKeyState.current = 'learner-1';
    setProgressOwnerKey(null);
  });

  it('switches to the new learner scoped snapshot when the subject key changes', () => {
    saveProgress(
      createProgress({
        totalXp: 120,
        gamesPlayed: 5,
      }),
      { ownerKey: 'learner-1' }
    );
    saveProgress(
      createProgress({
        totalXp: 45,
        gamesPlayed: 2,
      }),
      { ownerKey: 'learner-2' }
    );

    const { rerender } = render(<ProgressProbe />);

    expect(screen.getByTestId('kangur-progress-total-xp')).toHaveTextContent('120');

    subjectKeyState.current = 'learner-2';

    rerender(<ProgressProbe />);

    expect(screen.getByTestId('kangur-progress-total-xp')).toHaveTextContent('45');
  });

  it('falls back to the persisted owner key when no subject focus provider is mounted', () => {
    saveProgress(
      createProgress({
        totalXp: 84,
        gamesPlayed: 6,
      }),
      { ownerKey: 'persisted-owner' }
    );
    setProgressOwnerKey('persisted-owner');
    subjectKeyState.current = null;

    render(<ProgressProbe />);

    expect(screen.getByTestId('kangur-progress-total-xp')).toHaveTextContent('84');
  });

  it('returns the inert server snapshot while disabled', () => {
    saveProgress(
      createProgress({
        totalXp: 84,
        gamesPlayed: 6,
      }),
      { ownerKey: 'learner-1' }
    );

    render(<DisabledProgressProbe />);

    expect(screen.getByTestId('kangur-disabled-progress-total-xp')).toHaveTextContent('0');
  });
});
