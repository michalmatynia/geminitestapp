import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminFilemakerOrganizationEditPageState } from '@/features/filemaker/hooks/useAdminFilemakerOrganizationEditPageState';

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  settingsGet: vi.fn(),
  updateSettingMutateAsync: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ organizationId: 'org-1' }),
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
};

describe('useAdminFilemakerOrganizationEditPageState', () => {
  beforeEach(() => {
    mocks.routerPush.mockReset();
    mocks.updateSettingMutateAsync.mockReset();
    mocks.toast.mockReset();
    mocks.settingsGet.mockReset();
    mocks.settingsGet.mockImplementation(() => JSON.stringify(databaseFixture));
  });

  it('hydrates organization state from organizationId route param', async () => {
    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.organization?.id).toBe('org-1');
      expect(result.current.organization?.name).toBe('Acme Inc');
    });

    expect(result.current.orgDraft.name).toBe('Acme Inc');
  });
});
