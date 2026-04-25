import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  useCountries: () => ({ data: [] }),
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
