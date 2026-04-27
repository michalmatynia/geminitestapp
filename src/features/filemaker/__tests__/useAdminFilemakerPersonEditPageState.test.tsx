import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
