/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KANGUR_SUBJECT } from '@/features/kangur/lessons/lesson-catalog';

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

const subjectFocusServiceMocks = vi.hoisted(() => ({
  hasPersistedSubjectFocusMock: vi.fn(),
  loadPersistedSubjectFocusMock: vi.fn(),
  loadRemoteSubjectFocusMock: vi.fn(),
  persistSubjectFocusMock: vi.fn(),
  persistRemoteSubjectFocusMock: vi.fn(),
  subscribeToSubjectFocusChangesMock: vi.fn(),
}));

const setProgressScopeMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState.value,
}));

vi.mock('@/features/kangur/ui/services/progress', () => ({
  setProgressScope: setProgressScopeMock,
}));

vi.mock('@/features/kangur/ui/services/subject-focus', () => ({
  hasPersistedSubjectFocus: subjectFocusServiceMocks.hasPersistedSubjectFocusMock,
  loadPersistedSubjectFocus: subjectFocusServiceMocks.loadPersistedSubjectFocusMock,
  loadRemoteSubjectFocus: subjectFocusServiceMocks.loadRemoteSubjectFocusMock,
  persistSubjectFocus: subjectFocusServiceMocks.persistSubjectFocusMock,
  persistRemoteSubjectFocus: subjectFocusServiceMocks.persistRemoteSubjectFocusMock,
  subscribeToSubjectFocusChanges: subjectFocusServiceMocks.subscribeToSubjectFocusChangesMock,
  normalizeKangurSubjectFocusSubject: (value: unknown) =>
    value === 'maths' || value === 'english' ? value : null,
}));

import {
  KangurSubjectFocusProvider,
  useKangurSubjectFocus,
} from '@/features/kangur/ui/context/KangurSubjectFocusContext';

const Probe = (): React.JSX.Element => {
  const { subject, setSubject } = useKangurSubjectFocus();

  return (
    <div>
      <button type='button' onClick={() => setSubject('english')}>
        set-valid
      </button>
      <button
        type='button'
        onClick={() => setSubject(undefined as unknown as 'maths')}
      >
        set-invalid
      </button>
      <div data-testid='subject-value'>{subject}</div>
    </div>
  );
};

describe('KangurSubjectFocusContext', () => {
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
    subjectFocusServiceMocks.persistSubjectFocusMock.mockImplementation(
      (_key: string | null, subject: string) => subject
    );
    subjectFocusServiceMocks.persistRemoteSubjectFocusMock.mockResolvedValue('english');
    subjectFocusServiceMocks.subscribeToSubjectFocusChangesMock.mockImplementation(
      (_key: string | null, listener: (subject: 'maths') => void) => {
        listener('maths');
        return () => undefined;
      }
    );
  });

  it('ignores invalid runtime subject values instead of persisting an empty payload', async () => {
    render(
      <KangurSubjectFocusProvider>
        <Probe />
      </KangurSubjectFocusProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('subject-value')).toHaveTextContent('maths');
    });

    fireEvent.click(screen.getByRole('button', { name: 'set-invalid' }));

    expect(screen.getByTestId('subject-value')).toHaveTextContent('maths');
    expect(subjectFocusServiceMocks.persistSubjectFocusMock).not.toHaveBeenCalledWith(
      'learner-1',
      undefined
    );
    expect(subjectFocusServiceMocks.persistRemoteSubjectFocusMock).not.toHaveBeenCalled();
  });

  it('persists valid subject changes locally and remotely', async () => {
    render(
      <KangurSubjectFocusProvider>
        <Probe />
      </KangurSubjectFocusProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('subject-value')).toHaveTextContent('maths');
    });

    fireEvent.click(screen.getByRole('button', { name: 'set-valid' }));

    await waitFor(() => {
      expect(screen.getByTestId('subject-value')).toHaveTextContent('english');
    });

    expect(subjectFocusServiceMocks.persistSubjectFocusMock).toHaveBeenCalledWith(
      'learner-1',
      'english'
    );
    expect(subjectFocusServiceMocks.persistRemoteSubjectFocusMock).toHaveBeenCalledWith(
      'english'
    );
  });

  it('skips remote hydration when a persisted subject already exists for the active learner', async () => {
    render(
      <KangurSubjectFocusProvider>
        <Probe />
      </KangurSubjectFocusProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('subject-value')).toHaveTextContent('maths');
    });

    expect(subjectFocusServiceMocks.hasPersistedSubjectFocusMock).toHaveBeenCalledWith(
      'learner-1'
    );
    expect(subjectFocusServiceMocks.loadRemoteSubjectFocusMock).not.toHaveBeenCalled();
  });

  it('hydrates from the remote subject focus when no persisted value exists', async () => {
    subjectFocusServiceMocks.hasPersistedSubjectFocusMock.mockReturnValue(false);
    subjectFocusServiceMocks.loadRemoteSubjectFocusMock.mockResolvedValue('english');

    render(
      <KangurSubjectFocusProvider>
        <Probe />
      </KangurSubjectFocusProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('subject-value')).toHaveTextContent('english');
    });

    expect(subjectFocusServiceMocks.loadRemoteSubjectFocusMock).toHaveBeenCalledTimes(1);
    expect(subjectFocusServiceMocks.persistSubjectFocusMock).toHaveBeenCalledWith(
      'learner-1',
      'english'
    );
  });

  it('defers persisted subject hydration until after the initial render', async () => {
    subjectFocusServiceMocks.loadPersistedSubjectFocusMock.mockReturnValue('english');
    subjectFocusServiceMocks.subscribeToSubjectFocusChangesMock.mockImplementation(
      () => () => undefined
    );

    const serverHtml = renderToString(
      <KangurSubjectFocusProvider>
        <Probe />
      </KangurSubjectFocusProvider>
    );

    expect(serverHtml).toContain(DEFAULT_KANGUR_SUBJECT);
    expect(serverHtml).not.toContain('english');

    render(
      <KangurSubjectFocusProvider>
        <Probe />
      </KangurSubjectFocusProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('subject-value')).toHaveTextContent('english');
    });
  });
});
