/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const authState = vi.hoisted(() => ({
  value: {
    user: {
      id: 'learner-owner-1',
      actorType: 'learner' as const,
      activeLearner: {
        id: 'learner-1',
      },
    },
    isAuthenticated: true,
    isLoadingAuth: false,
  },
}));

const ageGroupFocusServiceMocks = vi.hoisted(() => ({
  loadPersistedAgeGroupFocusMock: vi.fn(),
  persistAgeGroupFocusMock: vi.fn(),
  subscribeToAgeGroupFocusChangesMock: vi.fn(),
}));

const subjectFocusServiceMocks = vi.hoisted(() => ({
  hasPersistedSubjectFocusMock: vi.fn(),
  loadPersistedSubjectFocusMock: vi.fn(),
  loadRemoteSubjectFocusMock: vi.fn(),
  persistRemoteSubjectFocusMock: vi.fn(),
  persistSubjectFocusMock: vi.fn(),
  subscribeToSubjectFocusChangesMock: vi.fn(),
}));

const setProgressScopeMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState.value,
  useKangurAuthSessionState: () => ({
    user: authState.value.user,
    isAuthenticated: authState.value.isAuthenticated,
    hasResolvedAuth: true,
    canAccessParentAssignments: false,
  }),
  useKangurAuthStatusState: () => ({
    isLoadingAuth: authState.value.isLoadingAuth,
    isLoadingPublicSettings: false,
    isLoggingOut: false,
    authError: null,
    appPublicSettings: null,
  }),
}));

vi.mock('@/features/kangur/ui/services/progress', () => ({
  setProgressScope: setProgressScopeMock,
}));

vi.mock('@/features/kangur/ui/services/age-group-focus', () => ({
  loadPersistedAgeGroupFocus: ageGroupFocusServiceMocks.loadPersistedAgeGroupFocusMock,
  persistAgeGroupFocus: ageGroupFocusServiceMocks.persistAgeGroupFocusMock,
  subscribeToAgeGroupFocusChanges: ageGroupFocusServiceMocks.subscribeToAgeGroupFocusChangesMock,
}));

vi.mock('@/features/kangur/ui/services/subject-focus', () => ({
  hasPersistedSubjectFocus: subjectFocusServiceMocks.hasPersistedSubjectFocusMock,
  loadPersistedSubjectFocus: subjectFocusServiceMocks.loadPersistedSubjectFocusMock,
  loadRemoteSubjectFocus: subjectFocusServiceMocks.loadRemoteSubjectFocusMock,
  normalizeKangurSubjectFocusSubject: (value: unknown) =>
    value === 'alphabet' || value === 'english' || value === 'maths' ? value : null,
  persistRemoteSubjectFocus: subjectFocusServiceMocks.persistRemoteSubjectFocusMock,
  persistSubjectFocus: subjectFocusServiceMocks.persistSubjectFocusMock,
  subscribeToSubjectFocusChanges: subjectFocusServiceMocks.subscribeToSubjectFocusChangesMock,
}));

import {
  KangurFocusProvider,
  useKangurAgeGroupFocus,
  useKangurSubjectFocus,
} from '@/features/kangur/ui/context/KangurFocusProvider';

const Probe = (): React.JSX.Element => {
  const { ageGroup, setAgeGroup } = useKangurAgeGroupFocus();
  const { subject } = useKangurSubjectFocus();

  return (
    <div>
      <button type='button' onClick={() => setAgeGroup('six_year_old')}>
        set-six
      </button>
      <div data-testid='age-group-value'>{ageGroup}</div>
      <div data-testid='subject-value'>{subject}</div>
    </div>
  );
};

describe('KangurFocusProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.value = {
      user: {
        id: 'learner-owner-1',
        actorType: 'learner',
        activeLearner: {
          id: 'learner-1',
        },
      },
      isAuthenticated: true,
      isLoadingAuth: false,
    };
    subjectFocusServiceMocks.hasPersistedSubjectFocusMock.mockReturnValue(true);
    subjectFocusServiceMocks.loadPersistedSubjectFocusMock.mockReturnValue('maths');
    subjectFocusServiceMocks.loadRemoteSubjectFocusMock.mockResolvedValue(null);
    subjectFocusServiceMocks.persistRemoteSubjectFocusMock.mockResolvedValue('alphabet');
    subjectFocusServiceMocks.persistSubjectFocusMock.mockImplementation(
      (_key: string | null, subject: string) => subject
    );
    subjectFocusServiceMocks.subscribeToSubjectFocusChangesMock.mockImplementation(
      () => () => undefined
    );
    ageGroupFocusServiceMocks.loadPersistedAgeGroupFocusMock.mockReturnValue('ten_year_old');
    ageGroupFocusServiceMocks.persistAgeGroupFocusMock.mockImplementation(
      (_key: string | null, ageGroup: string) => ageGroup
    );
    ageGroupFocusServiceMocks.subscribeToAgeGroupFocusChangesMock.mockImplementation(
      () => () => undefined
    );
  });

  it('keeps subject and age group in sync inside the combined root provider', async () => {
    subjectFocusServiceMocks.loadPersistedSubjectFocusMock.mockReturnValue('english');
    ageGroupFocusServiceMocks.loadPersistedAgeGroupFocusMock.mockReturnValue('six_year_old');

    render(
      <KangurFocusProvider>
        <Probe />
      </KangurFocusProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('age-group-value')).toHaveTextContent('six_year_old');
      expect(screen.getByTestId('subject-value')).toHaveTextContent('alphabet');
    });

    expect(subjectFocusServiceMocks.persistSubjectFocusMock).toHaveBeenCalledWith(
      'learner-1',
      'alphabet'
    );
    expect(subjectFocusServiceMocks.persistRemoteSubjectFocusMock).toHaveBeenCalledWith(
      'learner-1',
      'alphabet'
    );
  });

  it('syncs the subject when the focused age group changes at runtime', async () => {
    render(
      <KangurFocusProvider>
        <Probe />
      </KangurFocusProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('age-group-value')).toHaveTextContent('ten_year_old');
      expect(screen.getByTestId('subject-value')).toHaveTextContent('maths');
    });

    fireEvent.click(screen.getByRole('button', { name: 'set-six' }));

    await waitFor(() => {
      expect(screen.getByTestId('age-group-value')).toHaveTextContent('six_year_old');
      expect(screen.getByTestId('subject-value')).toHaveTextContent('alphabet');
    });

    expect(ageGroupFocusServiceMocks.persistAgeGroupFocusMock).toHaveBeenCalledWith(
      'learner-1',
      'six_year_old'
    );
    expect(subjectFocusServiceMocks.persistSubjectFocusMock).toHaveBeenCalledWith(
      'learner-1',
      'alphabet'
    );
  });
});
