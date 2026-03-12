/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurLearnerProfileRuntimeMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurLearnerProfileLevelProgressWidget } from './KangurLearnerProfileLevelProgressWidget';

describe('KangurLearnerProfileLevelProgressWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('uses Mongo-backed level-progress intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      entry: {
        id: 'learner-profile-level-progress',
        title: 'Postep poziomu',
        summary: 'Mongo opis poziomu, XP i dystansu do kolejnego progu.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      snapshot: {
        level: { level: 4, minXp: 250, title: 'Liczmistrz', color: 'text-indigo-600' },
        nextLevel: { level: 5, minXp: 900, title: 'Matematyk', color: 'text-purple-600' },
        levelProgressPercent: 92,
        totalXp: 480,
      },
      xpToNextLevel: 420,
    });

    render(<KangurLearnerProfileLevelProgressWidget />);

    expect(screen.getByText('Postep poziomu')).toBeInTheDocument();
    expect(screen.getByText('Mongo opis poziomu, XP i dystansu do kolejnego progu.')).toBeInTheDocument();
    expect(screen.getByText('Liczmistrz')).toBeInTheDocument();
    expect(screen.getByTestId('learner-profile-level-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '92'
    );
  });
});
