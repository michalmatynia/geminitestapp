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
        }),
      ])
    );
  });
});
