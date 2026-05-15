// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildFilemakerNavActionsMock: vi.fn(),
  buildFilemakerPersonListNodesMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({ push: mocks.pushMock }),
}));

vi.mock('../components/shared/FilemakerPersonMasterTreeNode', () => ({
  FilemakerPersonMasterTreeNode: () => <div data-testid='person-node' />,
}));

vi.mock('../components/shared/filemaker-nav-actions', () => ({
  buildFilemakerNavActions: (...args: unknown[]) =>
    mocks.buildFilemakerNavActionsMock(...args),
}));

vi.mock('../entity-master-tree', () => ({
  buildFilemakerPersonListNodes: (...args: unknown[]) =>
    mocks.buildFilemakerPersonListNodesMock(...args),
}));

import { useAdminFilemakerPersonsListState } from './useAdminFilemakerPersonsListState';

const listResponse = {
  collectionCount: 1,
  filters: {
    address: 'all',
    bank: 'all',
    organization: 'all',
    updatedBy: '',
  },
  limit: 48,
  page: 1,
  pageSize: 48,
  persons: [
    {
      addressId: '',
      city: '',
      country: '',
      countryId: '',
      createdAt: '2026-04-28T10:00:00.000Z',
      firstName: 'Ada',
      fullName: 'Ada Lovelace',
      id: 'person-1',
      lastName: 'Lovelace',
      legacyOrganizationUuids: [],
      linkedOrganizations: [],
      organizationLinkCount: 0,
      phoneNumbers: [],
      unresolvedOrganizationLinkCount: 0,
      updatedAt: '2026-04-28T10:00:00.000Z',
    },
  ],
  query: '',
  sort: 'updatedAt_desc',
  totalCount: 1,
  totalCountIsExact: true,
  totalPages: 1,
};

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const createWrapper = (): React.ComponentType<React.PropsWithChildren> => {
  const queryClient = createTestQueryClient();
  return function TestQueryProvider(props: React.PropsWithChildren): React.JSX.Element {
    return <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>;
  };
};

describe('useAdminFilemakerPersonsListState', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildFilemakerNavActionsMock.mockReturnValue([]);
    mocks.buildFilemakerPersonListNodesMock.mockReturnValue([]);
  });

  it('loads persons by newest update in the list and refetches when sorting changes', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith('/api/filemaker/persons?')) {
        const query = new URLSearchParams(url.split('?')[1] ?? '');
        return Promise.resolve(
          Response.json({
            ...listResponse,
            sort: query.get('sort') ?? listResponse.sort,
          })
        );
      }
      return Promise.reject(new Error(`Unexpected fetch ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminFilemakerPersonsListState(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const firstListUrl = String(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(firstListUrl).toContain('sort=updatedAt_desc');
    expect(result.current.sort).toBe('updatedAt_desc');

    act(() => {
      result.current.onSortChange('name_asc');
    });

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([input]) => String(input));
      expect(urls.some((url) => url.includes('sort=name_asc'))).toBe(true);
    });
  });
});
