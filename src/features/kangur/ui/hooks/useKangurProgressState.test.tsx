/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurProgressState } from '@/features/kangur/shared/contracts/kangur';
import { saveProgress } from '@/features/kangur/ui/services/progress';

const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: useKangurSubjectFocusMock,
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

describe('useKangurProgressState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
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

    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-2',
    });

    rerender(<ProgressProbe />);

    expect(screen.getByTestId('kangur-progress-total-xp')).toHaveTextContent('45');
  });
});
