/* eslint-disable max-lines, max-lines-per-function */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminFilemakerOrganizationEditPageState } from '@/features/filemaker/hooks/useAdminFilemakerOrganizationEditPageState';
import { FILEMAKER_DATABASE_KEY } from '@/features/filemaker/settings';
import type { FilemakerJobListing } from '@/features/filemaker/types';

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

vi.mock('@/shared/hooks/use-i18n-queries', () => {
  const countriesData = {
    data: [{ code: 'PL', id: 'PL', name: 'Poland' }],
  };
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

const databaseWithJobListingsFixture = {
  ...databaseFixture,
  jobListings: [
    {
      id: 'job-listing-1',
      organizationId: 'org-1',
      title: 'FileMaker Developer',
      description: 'Build custom FileMaker workflows.',
      location: 'Remote',
      salaryMin: 12000,
      salaryMax: 18000,
      salaryCurrency: 'PLN',
      salaryPeriod: 'monthly',
      status: 'open',
      targetedCampaignIds: ['campaign-1'],
      lastTargetedAt: '2026-04-15T10:00:00.000Z',
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
    },
    {
      id: 'job-listing-other-org',
      organizationId: 'org-other',
      title: 'Other Org Listing',
      description: 'Should not hydrate for org-1.',
      salaryPeriod: 'monthly',
      status: 'open',
      targetedCampaignIds: [],
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-04-01T10:00:00.000Z',
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
      () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              harvestProfiles: [
                {
                  id: 'harvest-1',
                  legacyOrganizationUuid: 'LEGACY-ORG-UUID',
                  legacyUuid: 'LEGACY-HARVEST-UUID',
                  organizationId: 'mongo-org-1',
                  owner: 'Scraper Bot',
                  pageDescription: 'Imported page description',
                  pageKeywords: 'lighting, stage',
                  pageTitle: 'Imported Site Title',
                  updatedAt: '2026-03-03T10:00:00.000Z',
                  updatedBy: 'Importer',
                },
              ],
              importedDemands: [
                {
                  id: 'demand-mongo-1',
                  legacyOrganizationUuid: 'LEGACY-ORG-UUID',
                  legacyUuid: 'LEGACY-DEMAND-UUID',
                  legacyValueUuids: ['LEGACY-VALUE-ROOT'],
                  organizationId: 'mongo-org-1',
                  updatedAt: '2026-03-02T10:00:00.000Z',
                  updatedBy: 'Importer',
                  valueIds: ['value-root'],
                  values: [
                    {
                      label: 'Production',
                      legacyValueUuid: 'LEGACY-VALUE-ROOT',
                      level: 1,
                      valueId: 'value-root',
                    },
                  ],
                },
              ],
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
      expect(result.current.importedDemands).toEqual([
        expect.objectContaining({
          id: 'demand-mongo-1',
          valueIds: ['value-root'],
        }),
      ]);
      expect(result.current.harvestProfiles).toEqual([
        expect.objectContaining({
          id: 'harvest-1',
          pageTitle: 'Imported Site Title',
        }),
      ]);
      expect(result.current.legacyDemandRows).toEqual([
        expect.objectContaining({
          id: 'demand-mongo-1',
          valueIds: ['value-root'],
        }),
      ]);
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/filemaker/organizations/mongo-org-1', {
      signal: expect.any(AbortSignal),
    });
  });

  it('loads imported metadata for settings-backed legacy organizations', async () => {
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY
        ? JSON.stringify({
            ...databaseFixture,
            organizations: [
              {
                ...databaseFixture.organizations[0],
                legacyUuid: 'LEGACY-ORG-UUID',
              },
            ],
          })
        : null
    );
    const fetchMock = vi.fn(
      () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              harvestProfiles: [
                {
                  id: 'harvest-1',
                  legacyOrganizationUuid: 'LEGACY-ORG-UUID',
                  legacyUuid: 'LEGACY-HARVEST-UUID',
                  organizationId: 'org-1',
                  pageTitle: 'Imported Site Title',
                },
              ],
              importedDemands: [
                {
                  id: 'demand-mongo-1',
                  legacyOrganizationUuid: 'LEGACY-ORG-UUID',
                  legacyUuid: 'LEGACY-DEMAND-UUID',
                  legacyValueUuids: ['LEGACY-VALUE-ROOT'],
                  organizationId: 'org-1',
                  valueIds: ['value-root'],
                  values: [
                    {
                      label: 'Production',
                      legacyValueUuid: 'LEGACY-VALUE-ROOT',
                      level: 1,
                      valueId: 'value-root',
                    },
                  ],
                },
              ],
              linkedAddresses: [],
              linkedEmails: [],
              organization: {
                ...databaseFixture.organizations[0],
                legacyUuid: 'LEGACY-ORG-UUID',
              },
            }),
            { status: 200 }
          )
        )
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.organizationSource).toBe('settings');
      expect(result.current.importedDemands).toEqual([
        expect.objectContaining({ id: 'demand-mongo-1' }),
      ]);
      expect(result.current.harvestProfiles).toEqual([
        expect.objectContaining({ id: 'harvest-1' }),
      ]);
      expect(result.current.legacyDemandRows).toEqual([
        expect.objectContaining({
          id: 'demand-mongo-1',
          valueIds: ['value-root'],
        }),
      ]);
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/filemaker/organizations/LEGACY-ORG-UUID', {
      signal: expect.any(AbortSignal),
    });
  });

  it('persists Mongo organization address country values to the detail endpoint', async () => {
    mocks.routeParams = { organizationId: 'mongo-org-1' };
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY
        ? JSON.stringify({ ...databaseFixture, organizations: [] })
        : null
    );
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              organization: {
                id: 'mongo-org-1',
                name: 'Mongo Org',
                addressId: 'mongo-address-1',
                street: 'Fioletowa',
                streetNumber: '71',
                city: 'Szczecin',
                postalCode: '70-781',
                country: 'Poland',
                countryId: 'PL',
                taxId: '',
                krs: '',
                createdAt: '2026-03-01T10:00:00.000Z',
                updatedAt: '2026-03-01T10:00:00.000Z',
              },
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            linkedAddresses: [],
            linkedEmails: [],
            organization: {
              id: 'mongo-org-1',
              name: 'Mongo Org',
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
          }),
          { status: 200 }
        )
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.organizationSource).toBe('mongo');
    });

    act(() => {
      result.current.setEditableAddresses([
        {
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
        },
      ]);
    });

    await act(async () => {
      await result.current.handleSave();
    });

    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
    expect(patchCall).toBeDefined();
    const body = JSON.parse(String(patchCall?.[1]?.body ?? '{}'));
    expect(body).toMatchObject({
      addressId: 'mongo-address-1',
      addresses: [
        {
          addressId: 'mongo-address-1',
          country: 'Poland',
          countryId: 'PL',
          countryValueId: 'filemaker-value-poland',
          isDefault: true,
          legacyCountryUuid: '889CD8F7-6E4E-4074-8CA1-AF684038B7D1',
        },
      ],
      country: 'Poland',
      countryId: 'PL',
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

  it('hydrates job listings for the organization', async () => {
    mocks.settingsGet.mockImplementation((key: string) =>
      key === FILEMAKER_DATABASE_KEY ? JSON.stringify(databaseWithJobListingsFixture) : null
    );

    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.jobListings).toEqual([
        expect.objectContaining({
          id: 'job-listing-1',
          organizationId: 'org-1',
          title: 'FileMaker Developer',
          targetedCampaignIds: ['campaign-1'],
        }),
      ]);
    });
  });

  it('persists organization job listings with targeted campaign assignments', async () => {
    const { result } = renderHook(() => useAdminFilemakerOrganizationEditPageState());

    await waitFor(() => {
      expect(result.current.organization?.id).toBe('org-1');
    });

    const listing: FilemakerJobListing = {
      id: 'job-listing-new',
      organizationId: 'org-1',
      title: 'Campaign Manager',
      description: 'Own hiring campaign operations.',
      location: 'Warsaw',
      salaryMin: 9000,
      salaryMax: 14000,
      salaryCurrency: 'PLN',
      salaryPeriod: 'monthly',
      status: 'open',
      targetedCampaignIds: ['campaign-hiring'],
      lastTargetedAt: '2026-04-20T10:00:00.000Z',
      createdAt: '2026-04-20T09:00:00.000Z',
      updatedAt: '2026-04-20T09:00:00.000Z',
    };

    act(() => {
      result.current.setJobListings([listing]);
    });

    await act(async () => {
      await result.current.handleSave();
    });

    const [persistCall] = mocks.updateSettingMutateAsync.mock.calls[0] ?? [];
    const persistedDatabase = JSON.parse(String(persistCall?.value ?? '{}'));
    expect(persistedDatabase.jobListings).toEqual([
      expect.objectContaining({
        id: 'job-listing-new',
        organizationId: 'org-1',
        title: 'Campaign Manager',
        description: 'Own hiring campaign operations.',
        salaryMin: 9000,
        salaryMax: 14000,
        targetedCampaignIds: ['campaign-hiring'],
        lastTargetedAt: '2026-04-20T10:00:00.000Z',
      }),
    ]);
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
