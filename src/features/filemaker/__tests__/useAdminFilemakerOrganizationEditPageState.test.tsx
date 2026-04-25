import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminFilemakerOrganizationEditPageState } from '@/features/filemaker/hooks/useAdminFilemakerOrganizationEditPageState';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings';

const mocks = vi.hoisted(() => ({
  routeParams: { organizationId: 'org-1' },
  routerPush: vi.fn(),
  settingsGet: vi.fn(),
  updateSettingMutateAsync: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => mocks.routeParams,
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('@/shared/hooks/use-i18n-queries', () => ({
  useCountries: () => ({
    data: [{ code: 'PL', id: 'PL', name: 'Poland' }],
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    mutateAsync: mocks.updateSettingMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: mocks.settingsGet,
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

const databaseFixture = {
  version: 2,
  persons: [],
  organizations: [
    {
      id: 'org-1',
      name: 'Acme Inc',
      addressId: '',
      street: '',
      streetNumber: '',
      city: '',
      postalCode: '',
      country: '',
      countryId: '',
      taxId: '',
      krs: '',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
  ],
  events: [],
  addresses: [],
  addressLinks: [],
  phoneNumbers: [],
  phoneNumberLinks: [],
  emails: [],
  emailLinks: [],
  eventOrganizationLinks: [],
  values: [],
};

const databaseWithLegacyDemandFixture = {
  ...databaseFixture,
  values: [
    {
      id: 'value-root',
      parentId: null,
      label: 'Production',
      value: 'Production',
      sortOrder: 0,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'value-child',
      parentId: 'value-root',
      label: 'Lighting',
      value: 'Lighting',
      sortOrder: 0,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: 'value-grandchild',
      parentId: 'value-child',
      label: 'LED wall',
      value: 'LED wall',
      sortOrder: 0,
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
  ],
  organizationLegacyDemands: [
    {
      id: 'demand-1',
      organizationId: 'org-1',
      valueIds: ['value-root', 'value-child'],
      legacyUuid: 'legacy-demand-uuid',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
  ],
};

const databaseWithSharedEmailFixture = {
  ...databaseFixture,
  persons: [
    {
      id: 'person-1',
      firstName: 'Jane',
      lastName: 'Smith',
      addressId: '',
      street: '',
      streetNumber: '',
      city: '',
      postalCode: '',
      country: '',
      countryId: '',
      nip: '',
      regon: '',
      phoneNumbers: [],
    },
  ],
  emails: [
    {
      id: 'email-shared',
      email: 'shared@example.com',
      status: 'active',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    },
  ],
  emailLinks: [
    {
      id: 'email-link-person',
      emailId: 'email-shared',
      partyKind: 'person',
      partyId: 'person-1',
    },
    {
      id: 'email-link-organization',
      emailId: 'email-shared',
      partyKind: 'organization',
      partyId: 'org-1',
    },
  ],
};

describe('useAdminFilemakerOrganizationEditPageState', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mocks.routerPush.mockReset();
    mocks.updateSettingMutateAsync.mockReset();
    mocks.updateSettingMutateAsync.mockResolvedValue({});
    mocks.toast.mockReset();
    mocks.routeParams = { organizationId: 'org-1' };
    mocks.settingsGet.mockReset();
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY ? JSON.stringify(databaseFixture) : null
    );
  });

  it('hydrates organization state from organizationId route param', async () => {
    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.organization?.id).toBe('org-1');
      expect(result.current.organization?.name).toBe('Acme Inc');
    });

    expect(result.current.orgDraft.name).toBe('Acme Inc');
  });

  it('resolves linked emails through emailLinks without duplicating the email record', async () => {
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY ? JSON.stringify(databaseWithSharedEmailFixture) : null
    );

    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.emails.map((email) => email.email)).toEqual(['shared@example.com']);
    });
  });

  it('hydrates linked emails from the Mongo organization detail response', async () => {
    mocks.routeParams = { organizationId: 'mongo-org-1' };
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY
        ? JSON.stringify({ ...databaseFixture, organizations: [] })
        : null
    );
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            linkedAddresses: [
              {
                id: 'mongo-address-1',
                street: 'Fioletowa',
                streetNumber: '71',
                city: 'Szczecin',
                postalCode: '70-781',
                country: 'Poland',
                countryId: 'PL',
                countryValueId: 'filemaker-value-poland',
                countryValueLabel: 'Poland',
                createdAt: '2026-03-01T10:00:00.000Z',
                legacyCountryUuid: '889CD8F7-6E4E-4074-8CA1-AF684038B7D1',
                legacyUuid: '99968074-1E6E-4092-86F7-92A2C9B62E8A',
                updatedAt: '2026-03-01T10:00:00.000Z',
              },
            ],
            linkedEmails: [
              {
                id: 'email-mongo',
                email: 'mongo-linked@example.com',
                status: 'active',
                createdAt: '2026-03-01T10:00:00.000Z',
                updatedAt: '2026-03-01T10:00:00.000Z',
              },
            ],
            organization: {
              id: 'mongo-org-1',
              name: 'Mongo Org',
              legacyUuid: 'LEGACY-ORG-UUID',
              addressId: 'mongo-address-1',
              street: '',
              streetNumber: '',
              city: '',
              postalCode: '',
              country: '',
              countryId: '',
              taxId: '',
              krs: '',
              createdAt: '2026-03-01T10:00:00.000Z',
              updatedAt: '2026-03-01T10:00:00.000Z',
            },
          }),
          { status: 200 }
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.organizationSource).toBe('mongo');
      expect(result.current.emails.map((email) => email.email)).toEqual([
        'mongo-linked@example.com',
      ]);
      expect(result.current.editableAddresses).toEqual([
        expect.objectContaining({
          addressId: 'mongo-address-1',
          city: 'Szczecin',
          country: 'Poland',
          countryId: 'PL',
          countryValueId: 'filemaker-value-poland',
          countryValueLabel: 'Poland',
          isDefault: true,
          legacyCountryUuid: '889CD8F7-6E4E-4074-8CA1-AF684038B7D1',
          legacyUuid: '99968074-1E6E-4092-86F7-92A2C9B62E8A',
          postalCode: '70-781',
          street: 'Fioletowa',
          streetNumber: '71',
        }),
      ]);
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/filemaker/organizations/mongo-org-1', {
      signal: expect.any(AbortSignal),
    });
  });

  it('hydrates legacy demand rows for the organization', async () => {
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY ? JSON.stringify(databaseWithLegacyDemandFixture) : null
    );

    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.legacyDemandRows).toEqual([
        expect.objectContaining({
          id: 'demand-1',
          organizationId: 'org-1',
          valueIds: ['value-root', 'value-child'],
          legacyUuid: 'legacy-demand-uuid',
        }),
      ]);
    });
  });

  it('persists legacy demand rows with value hierarchy paths', async () => {
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY ? JSON.stringify(databaseWithLegacyDemandFixture) : null
    );

    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.legacyDemandRows).toHaveLength(1);
    });

    act(() => {
      result.current.setLegacyDemandRows((current) =>
        current.map((row) => ({
          ...row,
          valueIds: ['value-root', 'value-child', 'value-grandchild'],
        }))
      );
    });

    await act(async () => {
      await result.current.handleSave();
    });

    const [persistCall] = mocks.updateSettingMutateAsync.mock.calls[0] ?? [];
    const persistedDatabase = JSON.parse(String(persistCall?.value ?? '{}'));
    expect(persistedDatabase.organizationLegacyDemands).toEqual([
      expect.objectContaining({
        id: 'demand-1',
        organizationId: 'org-1',
        valueIds: ['value-root', 'value-child', 'value-grandchild'],
        legacyUuid: 'legacy-demand-uuid',
      }),
    ]);
  });

  it('creates a new organization from the new route', async () => {
    mocks.routeParams = { organizationId: 'new' };

    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.isCreateMode).toBe(true);
    });

    act(() => {
      result.current.setOrgDraft((current) => ({
        ...current,
        name: 'New Org',
        tradingName: 'New Trading',
        cooperationStatus: 'Prospect',
        establishedDate: '2024-01-02',
      }));
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mocks.updateSettingMutateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.routerPush).toHaveBeenCalledWith('/admin/filemaker/organizations');
    expect(mocks.toast).toHaveBeenCalledWith('Organization created.', { variant: 'success' });

    const [persistCall] = mocks.updateSettingMutateAsync.mock.calls[0] ?? [];
    const persistedDatabase = JSON.parse(String(persistCall?.value ?? '{}'));
    expect(persistedDatabase.organizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'New Org',
          tradingName: 'New Trading',
          cooperationStatus: 'Prospect',
          establishedDate: '2024-01-02',
        }),
      ])
    );
  });
});
