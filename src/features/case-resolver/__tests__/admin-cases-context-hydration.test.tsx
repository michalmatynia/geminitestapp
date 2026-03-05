import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminCaseResolverCasesProvider,
  useAdminCaseResolverCasesActionsContext,
  useAdminCaseResolverCasesStateContext,
} from '@/features/case-resolver/context/AdminCaseResolverCasesContext';
import {
  CASE_RESOLVER_WORKSPACE_KEY,
  createCaseResolverFile,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import type { CaseResolverWorkspaceRecordFetchResult } from '@/shared/contracts/case-resolver';
import type { SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';

const fetchCaseResolverWorkspaceRecordDetailedMock = vi.fn();
const updatePreferencesMutateAsyncMock = vi.fn();
const toastMock = vi.fn();
const settingsStoreRefetchMock = vi.fn();

const settingsMap = new Map<string, string>();
const settingsStoreMock: SettingsStoreValue = {
  map: settingsMap,
  isLoading: false,
  isFetching: false,
  error: null,
  get: (key: string): string | undefined => settingsMap.get(key),
  getBoolean: (_key: string, fallback = false): boolean => fallback,
  getNumber: (_key: string, fallback?: number): number | undefined => fallback,
  refetch: settingsStoreRefetchMock,
};

const userPreferencesQueryMock: {
  data: Record<string, unknown>;
  isLoading: boolean;
} = {
  data: {},
  isLoading: false,
};

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
}));

vi.mock('@/features/auth/hooks/useUserPreferences', () => ({
  useUserPreferences: () => userPreferencesQueryMock,
  useUpdateUserPreferencesMutation: () => ({
    mutateAsync: updatePreferencesMutateAsyncMock,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/features/case-resolver/workspace-persistence', async () => {
  const actual = await vi.importActual<typeof import('@/features/case-resolver/workspace-persistence')>(
    '@/features/case-resolver/workspace-persistence'
  );
  return {
    ...actual,
    fetchCaseResolverWorkspaceRecordDetailed: (...args: unknown[]) =>
      fetchCaseResolverWorkspaceRecordDetailedMock(...args),
  };
});

const buildWorkspaceWithCase = () => ({
  ...parseCaseResolverWorkspace(null),
  id: 'workspace-with-case',
  files: [
    createCaseResolverFile({
      id: 'case-1',
      fileType: 'case',
      name: 'Case One',
      folder: '',
    }),
  ],
});

const buildResolvedResult = (
  source: 'resolved_v2'
): CaseResolverWorkspaceRecordFetchResult => ({
  status: 'resolved',
  workspace: buildWorkspaceWithCase(),
  attemptKey: 'light_fresh',
  scope: 'light',
  source,
  durationMs: 4,
});

const buildNoRecordResult = (message: string): CaseResolverWorkspaceRecordFetchResult => ({
  status: 'no_record',
  durationMs: 5,
  message,
});

function ContextProbe(): React.JSX.Element {
  const { workspace, casesLoadState, casesLoadMessage } = useAdminCaseResolverCasesStateContext();
  const { handleRefreshWorkspace } = useAdminCaseResolverCasesActionsContext();
  const caseCount = workspace.files.filter((file) => file.fileType === 'case').length;

  return (
    <div>
      <span data-testid='case-count'>{String(caseCount)}</span>
      <span data-testid='load-state'>{casesLoadState}</span>
      <span data-testid='load-message'>{casesLoadMessage ?? ''}</span>
      <button
        type='button'
        onClick={(): void => {
          void handleRefreshWorkspace();
        }}
      >
        Refresh
      </button>
    </div>
  );
}

const renderWithProvider = () =>
  render(
    <AdminCaseResolverCasesProvider>
      <ContextProbe />
    </AdminCaseResolverCasesProvider>
  );

describe('admin cases context hydration', () => {
  beforeEach(() => {
    settingsMap.clear();
    settingsStoreMock.isLoading = false;
    settingsStoreMock.isFetching = false;
    userPreferencesQueryMock.data = {};
    userPreferencesQueryMock.isLoading = false;
    fetchCaseResolverWorkspaceRecordDetailedMock.mockReset();
    updatePreferencesMutateAsyncMock.mockReset();
    toastMock.mockReset();
    settingsStoreRefetchMock.mockReset();
  });

  it('adopts parsed workspace once settings store finishes loading', async () => {
    settingsStoreMock.isLoading = true;
    settingsStoreMock.isFetching = true;
    fetchCaseResolverWorkspaceRecordDetailedMock.mockResolvedValue(
      buildNoRecordResult('Workspace record unavailable.')
    );

    const rendered = renderWithProvider();

    expect(screen.getByTestId('case-count')).toHaveTextContent('0');

    settingsStoreMock.isLoading = false;
    settingsStoreMock.isFetching = false;
    settingsMap.set(CASE_RESOLVER_WORKSPACE_KEY, JSON.stringify(buildWorkspaceWithCase()));

    rendered.rerender(
      <AdminCaseResolverCasesProvider>
        <ContextProbe />
      </AdminCaseResolverCasesProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('case-count')).toHaveTextContent('1');
    });
  });

  it('bootstraps from keyed record and marks ready state', async () => {
    fetchCaseResolverWorkspaceRecordDetailedMock.mockResolvedValue(
      buildResolvedResult('resolved_v2')
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('case-count')).toHaveTextContent('1');
      expect(screen.getByTestId('load-state')).toHaveTextContent('ready');
    });

    expect(fetchCaseResolverWorkspaceRecordDetailedMock).toHaveBeenCalledWith(
      'cases_page_bootstrap',
      {
        attemptProfile: 'context_fast',
        maxTotalMs: 15_000,
        attemptTimeoutMs: 5_000,
        requiredFileId: null,
        includeDetachedHistory: true,
        includeDetachedDocuments: true,
      }
    );
  });

  it('surfaces no_record state and message when workspace key is missing', async () => {
    fetchCaseResolverWorkspaceRecordDetailedMock.mockResolvedValue(
      buildNoRecordResult('Case Resolver workspace key is missing.')
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('load-state')).toHaveTextContent('no_record');
      expect(screen.getByTestId('load-message')).toHaveTextContent(
        'Case Resolver workspace key is missing.'
      );
    });
  });

  it('retries workspace bootstrap on manual refresh', async () => {
    fetchCaseResolverWorkspaceRecordDetailedMock
      .mockResolvedValueOnce(buildNoRecordResult('Case Resolver workspace key is missing.'))
      .mockResolvedValueOnce(buildResolvedResult('resolved_v2'));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('load-state')).toHaveTextContent('no_record');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(screen.getByTestId('case-count')).toHaveTextContent('1');
      expect(screen.getByTestId('load-state')).toHaveTextContent('ready');
    });

    expect(fetchCaseResolverWorkspaceRecordDetailedMock).toHaveBeenNthCalledWith(
      2,
      'cases_page_manual_refresh',
      {
        attemptProfile: 'context_fast',
        maxTotalMs: 15_000,
        attemptTimeoutMs: 5_000,
        requiredFileId: null,
        includeDetachedHistory: true,
        includeDetachedDocuments: true,
      }
    );
  });
});
