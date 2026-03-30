/**
 * @vitest-environment jsdom
 */

import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  assignmentsPanelMock,
  useKangurAuthMock,
  useKangurLearnerProfileRuntimeMock,
} = vi.hoisted(() => ({
  assignmentsPanelMock: vi.fn(() => <div data-testid='learner-profile-assignments-widget' />),
  useKangurAuthMock: vi.fn(),
  useKangurLearnerProfileRuntimeMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/assignments/KangurLearnerAssignmentsPanel', () => ({
  __esModule: true,
  default: (props: unknown) => assignmentsPanelMock(props),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => useKangurAuthMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  useKangurLearnerProfileRuntime: () => useKangurLearnerProfileRuntimeMock(),
}));

import { KangurLearnerProfileAssignmentsWidget } from '../KangurLearnerProfileAssignmentsWidget';

describe('KangurLearnerProfileAssignmentsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      basePath: '/kangur',
    });
    useKangurAuthMock.mockReturnValue({
      canAccessParentAssignments: true,
      user: {
        activeLearner: { id: 'learner-1' },
      },
    });
  });

  it('defers enabling learner assignments until after the first mount turn', async () => {
    vi.useFakeTimers();

    try {
      render(<KangurLearnerProfileAssignmentsWidget />);

      expect(assignmentsPanelMock).toHaveBeenCalled();
      expect(assignmentsPanelMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          basePath: '/kangur',
          enabled: false,
        })
      );

      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(assignmentsPanelMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          basePath: '/kangur',
          enabled: true,
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps learner assignments disabled in local mode', () => {
    useKangurAuthMock.mockReturnValue({
      canAccessParentAssignments: false,
      user: null,
    });

    render(<KangurLearnerProfileAssignmentsWidget />);

    expect(assignmentsPanelMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: '/kangur',
        enabled: false,
      })
    );
  });
});
