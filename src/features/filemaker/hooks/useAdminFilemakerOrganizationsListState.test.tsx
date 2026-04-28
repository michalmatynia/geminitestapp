// @vitest-environment jsdom

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildFilemakerNavActionsMock: vi.fn(),
  buildFilemakerOrganizationListNodesMock: vi.fn(),
  getFilemakerEventsForOrganizationMock: vi.fn(),
  getFilemakerJobListingsForOrganizationMock: vi.fn(),
  parseFilemakerDatabaseMock: vi.fn(),
  pushMock: vi.fn(),
  toastMock: vi.fn(),
  useFilemakerOrganiserImportActionMock: vi.fn(),
  withCsrfHeadersMock: vi.fn(),
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({ push: mocks.pushMock }),
}));

vi.mock('@/shared/lib/security/csrf-client', () => ({
  withCsrfHeaders: (headers?: HeadersInit) => mocks.withCsrfHeadersMock(headers),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: vi.fn(() => null),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock('../components/shared/FilemakerOrganizationMasterTreeNode', () => ({
  FilemakerOrganizationMasterTreeNode: () => <div data-testid='organization-node' />,
}));

vi.mock('../components/shared/filemaker-nav-actions', () => ({
  buildFilemakerNavActions: (...args: unknown[]) =>
    mocks.buildFilemakerNavActionsMock(...args),
}));

vi.mock('../entity-master-tree', () => ({
  buildFilemakerOrganizationListNodes: (...args: unknown[]) =>
    mocks.buildFilemakerOrganizationListNodesMock(...args),
}));

vi.mock('../settings', () => ({
  FILEMAKER_DATABASE_KEY: 'filemaker.database',
  getFilemakerEventsForOrganization: (...args: unknown[]) =>
    mocks.getFilemakerEventsForOrganizationMock(...args),
  getFilemakerJobListingsForOrganization: (...args: unknown[]) =>
    mocks.getFilemakerJobListingsForOrganizationMock(...args),
  parseFilemakerDatabase: (...args: unknown[]) => mocks.parseFilemakerDatabaseMock(...args),
}));

vi.mock('./useFilemakerOrganiserImportAction', () => ({
  useFilemakerOrganiserImportAction: (...args: unknown[]) =>
    mocks.useFilemakerOrganiserImportActionMock(...args),
}));

import { useAdminFilemakerOrganizationsListState } from './useAdminFilemakerOrganizationsListState';

const listResponse = {
  collectionCount: 1,
  filters: {
    address: 'all',
    bank: 'all',
    parent: 'all',
    updatedBy: '',
  },
  limit: 48,
  linkedEventsByOrganizationId: {},
  organizations: [
    {
      addressId: '',
      city: '',
      country: '',
      countryId: '',
      createdAt: '2026-04-28T10:00:00.000Z',
      id: 'org-1',
      name: 'Acme Inc',
      postalCode: '',
      street: '',
      streetNumber: '',
      updatedAt: '2026-04-28T10:00:00.000Z',
    },
  ],
  page: 1,
  pageSize: 48,
  query: '',
  totalCount: 1,
  totalCountIsExact: true,
  totalPages: 1,
};

const scrapeResponse = {
  organizationId: 'org-1',
  organizationName: 'Acme Inc',
  promoted: [
    { status: 'created' },
    { status: 'linked' },
    { status: 'already-linked' },
  ],
  runId: 'run-1',
  skipped: [{ reason: 'Duplicate' }],
};

describe('useAdminFilemakerOrganizationsListState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildFilemakerNavActionsMock.mockReturnValue([]);
    mocks.buildFilemakerOrganizationListNodesMock.mockReturnValue([]);
    mocks.getFilemakerEventsForOrganizationMock.mockReturnValue([]);
    mocks.getFilemakerJobListingsForOrganizationMock.mockReturnValue([]);
    mocks.parseFilemakerDatabaseMock.mockReturnValue({ events: [], jobListings: [] });
    mocks.useFilemakerOrganiserImportActionMock.mockReturnValue({
      importActions: [],
      isImporting: false,
    });
    mocks.withCsrfHeadersMock.mockImplementation((headers?: HeadersInit) => ({
      ...(headers as Record<string, string> | undefined),
      'x-csrf-token': 'csrf-token',
    }));
  });

  it('launches organization email scrape with CSRF headers and reports the result', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith('/api/filemaker/organizations?')) {
        return Response.json(listResponse);
      }
      if (url === '/api/filemaker/organizations/org-1/email-scrape') {
        expect(init).toMatchObject({
          method: 'POST',
          body: JSON.stringify({ maxPages: 8 }),
        });
        expect(init?.headers).toMatchObject({
          'Content-Type': 'application/json',
          'x-csrf-token': 'csrf-token',
        });
        return Response.json(scrapeResponse);
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminFilemakerOrganizationsListState());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.onLaunchOrganizationEmailScrape('org-1');
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/filemaker/organizations/org-1/email-scrape',
        expect.objectContaining({ method: 'POST' })
      );
    });
    await waitFor(() => expect(result.current.organizationEmailScrapeState).toEqual({}));

    expect(mocks.withCsrfHeadersMock).toHaveBeenCalledWith({
      'Content-Type': 'application/json',
    });
    expect(mocks.toastMock).toHaveBeenCalledWith(
      'Email scrape finished: 1 created, 1 linked, 1 already linked, 1 skipped.',
      { variant: 'success' }
    );

    vi.unstubAllGlobals();
  });
});
