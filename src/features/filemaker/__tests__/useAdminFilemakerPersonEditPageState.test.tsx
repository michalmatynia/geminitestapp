import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminFilemakerPersonEditPageState } from '@/features/filemaker/hooks/useAdminFilemakerPersonEditPageState';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings';

const mocks = vi.hoisted(() => ({
  routeParams: { personId: 'person-1' },
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

vi.mock('@/shared/hooks/use-i18n-queries', () => {
  const countriesData = { data: [] };
  return {
    useCountries: () => countriesData,
  };
});

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
  organizations: [],
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

const databaseWithSharedEmailFixture = {
  ...databaseFixture,
  organizations: [
    {
      id: 'org-1',
      name: 'Shared Org',
      addressId: '',
      street: '',
      streetNumber: '',
      city: '',
      postalCode: '',
      country: '',
      countryId: '',
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

describe('useAdminFilemakerPersonEditPageState', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mocks.routerPush.mockReset();
    mocks.updateSettingMutateAsync.mockReset();
    mocks.updateSettingMutateAsync.mockResolvedValue({});
    mocks.toast.mockReset();
    mocks.routeParams = { personId: 'person-1' };
    mocks.settingsGet.mockReset();
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY ? JSON.stringify(databaseFixture) : null
    );
  });

  it('hydrates person state from personId route param', async () => {
    const { result } = renderHook(() => useAdminFilemakerPersonEditPageState());

    await waitFor(() => {
      expect(result.current.person?.id).toBe('person-1');
      expect(result.current.person?.lastName).toBe('Smith');
    });

    expect(result.current.personDraft.lastName).toBe('Smith');
  });

  it('persists the edited person and navigates back to the persons page', async () => {
    const { result } = renderHook(() => useAdminFilemakerPersonEditPageState());

    await waitFor(() => {
      expect(result.current.person?.id).toBe('person-1');
    });

    act(() => {
      result.current.setPersonDraft((current) => ({
        ...current,
        lastName: 'Kowalska',
      }));
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mocks.updateSettingMutateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.routerPush).toHaveBeenCalledWith('/admin/filemaker/persons');
    expect(mocks.toast).toHaveBeenCalledWith('Person updated.', { variant: 'success' });

    const [persistCall] = mocks.updateSettingMutateAsync.mock.calls[0] ?? [];
    expect(persistCall).toMatchObject({
      key: FILEMAKER_DATABASE_KEY,
    });

    const persistedDatabase = JSON.parse(String(persistCall?.value ?? '{}'));
    expect(persistedDatabase.persons[0]?.lastName).toBe('Kowalska');
  });

  it('persists linked address fields for settings-backed persons', async () => {
    const { result } = renderHook(() => useAdminFilemakerPersonEditPageState());

    await waitFor(() => {
      expect(result.current.person?.id).toBe('person-1');
    });

    act(() => {
      result.current.setEditableAddresses([
        {
          addressId: 'address-1',
          city: 'Warsaw',
          country: 'Poland',
          countryId: 'PL',
          isDefault: true,
          postalCode: '00-001',
          street: 'Marszalkowska',
          streetNumber: '1',
        },
      ]);
    });

    await act(async () => {
      await result.current.handleSave();
    });

    const [persistCall] = mocks.updateSettingMutateAsync.mock.calls[0] ?? [];
    const persistedDatabase = JSON.parse(String(persistCall?.value ?? '{}'));
    expect(persistedDatabase.persons[0]).toMatchObject({
      addressId: 'address-1',
    });
    expect(persistedDatabase.addresses).toEqual([
      expect.objectContaining({
        id: 'address-1',
        city: 'Warsaw',
        street: 'Marszalkowska',
      }),
    ]);
    expect(persistedDatabase.addressLinks).toEqual([
      expect.objectContaining({
        addressId: 'address-1',
        isDefault: true,
        ownerId: 'person-1',
        ownerKind: 'person',
      }),
    ]);
  });

  it('saves settings-backed persons without blocking on incomplete linked addresses', async () => {
    const { result } = renderHook(() => useAdminFilemakerPersonEditPageState());

    await waitFor(() => {
      expect(result.current.person?.id).toBe('person-1');
    });

    act(() => {
      result.current.setEditableAddresses([
        {
          addressId: 'address-incomplete',
          city: 'Warsaw',
          country: 'Poland',
          countryId: 'PL',
          isDefault: true,
          postalCode: '',
          street: '',
          streetNumber: '',
        },
      ]);
      result.current.setPersonDraft((current) => ({
        ...current,
        lastName: 'Kowalska',
      }));
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mocks.updateSettingMutateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith('Person updated.', { variant: 'success' });

    const [persistCall] = mocks.updateSettingMutateAsync.mock.calls[0] ?? [];
    const persistedDatabase = JSON.parse(String(persistCall?.value ?? '{}'));
    expect(persistedDatabase.persons[0]?.lastName).toBe('Kowalska');
    expect(persistedDatabase.addressLinks).toEqual([]);
  });

  it('resolves linked emails through emailLinks without duplicating the email record', async () => {
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY ? JSON.stringify(databaseWithSharedEmailFixture) : null
    );

    const { result } = renderHook(() => useAdminFilemakerPersonEditPageState());

    await waitFor(() => {
      expect(result.current.emails.map((email) => email.email)).toEqual(['shared@example.com']);
    });
  });

  it('creates a new person from the new route', async () => {
    mocks.routeParams = { personId: 'new' };

    const { result } = renderHook(() => useAdminFilemakerPersonEditPageState());

    await waitFor(() => {
      expect(result.current.isCreateMode).toBe(true);
    });

    act(() => {
      result.current.setPersonDraft((current) => ({
        ...current,
        firstName: 'Ada',
        lastName: 'Lovelace',
      }));
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mocks.updateSettingMutateAsync).toHaveBeenCalledTimes(1);
    expect(mocks.routerPush).toHaveBeenCalledWith('/admin/filemaker/persons');
    expect(mocks.toast).toHaveBeenCalledWith('Person created.', { variant: 'success' });

    const [persistCall] = mocks.updateSettingMutateAsync.mock.calls[0] ?? [];
    const persistedDatabase = JSON.parse(String(persistCall?.value ?? '{}'));
    expect(persistedDatabase.persons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          firstName: 'Ada',
          lastName: 'Lovelace',
        }),
      ])
    );
  });

  it('sends Mongo-backed basic and CV profile fields when saving', async () => {
    const mongoPerson = {
      ...databaseFixture.persons[0],
      fullName: 'Jane Smith',
      linkedOrganizations: [],
      nip: 'old-nip',
      organizationLinkCount: 0,
      regon: 'old-regon',
      unresolvedOrganizationLinkCount: 0,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          linkedAddresses: [],
          person: mongoPerson,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          linkedAddresses: [],
          person: {
            ...mongoPerson,
            nip: '1234567890',
            regon: '987654321',
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminFilemakerPersonEditPageState());

    await waitFor(() => {
      expect(result.current.personDraft.nip).toBe('old-nip');
    });

    act(() => {
      result.current.setPersonDraft((current) => ({
        ...current,
        cvHeadline: 'Agentic Engineer',
        firstName: 'Jane',
        languageSkills: [{ language: 'English', level: 10 }],
        lastName: 'Smith',
        nip: '1234567890',
        profileEducation: [
          {
            country: 'United Kingdom',
            degree: 'Master of Computing',
            institution: 'Analytical Engine University',
            period: '1842 - 1843',
          },
        ],
        profileJobExperience: [
          {
            endDate: '',
            isCurrent: true,
            organization: 'StudiQ',
            period: 'Sep 2025 - Present',
            startDate: '2025-09',
            title: 'Agentic Engineer',
          },
        ],
        regon: '987654321',
      }));
    });

    await act(async () => {
      await result.current.handleSave();
    });

    const patchCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH'
    );
    expect(patchCall).toBeDefined();
    const body = JSON.parse(String((patchCall?.[1] as RequestInit | undefined)?.body ?? '{}'));
    expect(body).toMatchObject({
      cvHeadline: 'Agentic Engineer',
      firstName: 'Jane',
      languageSkills: [{ language: 'English', level: 10 }],
      lastName: 'Smith',
      nip: '1234567890',
      profileEducation: [
        expect.objectContaining({
          country: 'United Kingdom',
        }),
      ],
      profileJobExperience: [
        expect.objectContaining({
          endDate: '',
          isCurrent: true,
          startDate: '2025-09',
        }),
      ],
      regon: '987654321',
    });
    expect(mocks.updateSettingMutateAsync).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('Person updated.', { variant: 'success' });
  });

  it('saves Mongo-backed persons while leaving incomplete imported addresses unchanged', async () => {
    const mongoPerson = {
      ...databaseFixture.persons[0],
      fullName: 'Jane Smith',
      linkedOrganizations: [],
      organizationLinkCount: 0,
      unresolvedOrganizationLinkCount: 0,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          linkedAddresses: [
            {
              id: 'address-incomplete',
              city: 'Warsaw',
              country: 'Poland',
              countryId: 'PL',
              postalCode: '',
              street: '',
              streetNumber: '',
            },
          ],
          person: mongoPerson,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          person: {
            ...mongoPerson,
            lastName: 'Kowalska',
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminFilemakerPersonEditPageState());

    await waitFor(() => {
      expect(result.current.editableAddresses).toHaveLength(1);
    });

    act(() => {
      result.current.setPersonDraft((current) => ({
        ...current,
        lastName: 'Kowalska',
      }));
    });

    await act(async () => {
      await result.current.handleSave();
    });

    const patchCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH'
    );
    expect(patchCall).toBeDefined();
    const body = JSON.parse(String((patchCall?.[1] as RequestInit | undefined)?.body ?? '{}'));
    expect(body).toMatchObject({
      firstName: 'Jane',
      lastName: 'Kowalska',
    });
    expect(body).not.toHaveProperty('addresses');
    expect(body).not.toHaveProperty('addressId');
    expect(mocks.toast).toHaveBeenCalledWith('Person updated.', { variant: 'success' });
  });
});
