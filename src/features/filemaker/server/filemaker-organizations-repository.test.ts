import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getFilemakerOrganizationsCollectionMock: vi.fn(),
  listMongoFilemakerEventsForOrganizationMock: vi.fn(),
  parseFilemakerDatabaseMock: vi.fn(),
  readFilemakerCampaignSettingValueMock: vi.fn(),
  toPersistedFilemakerDatabaseMock: vi.fn(),
  upsertFilemakerCampaignSettingValueMock: vi.fn(),
}));

vi.mock('./campaign-settings-store', () => ({
  readFilemakerCampaignSettingValue: (...args: unknown[]) =>
    mocks.readFilemakerCampaignSettingValueMock(...args),
  upsertFilemakerCampaignSettingValue: (...args: unknown[]) =>
    mocks.upsertFilemakerCampaignSettingValueMock(...args),
}));

vi.mock('./filemaker-events-mongo', () => ({
  FILEMAKER_EVENT_ORGANIZATION_LINKS_COLLECTION: 'filemaker_event_organization_links',
}));

vi.mock('./filemaker-events-repository', () => ({
  listMongoFilemakerEventsForOrganization: (...args: unknown[]) =>
    mocks.listMongoFilemakerEventsForOrganizationMock(...args),
}));

vi.mock('./filemaker-organizations-mongo', () => ({
  getFilemakerOrganizationsCollection: (...args: unknown[]) =>
    mocks.getFilemakerOrganizationsCollectionMock(...args),
  toFilemakerOrganization: (document: {
    city?: string;
    createdAt?: string;
    id: string;
    name: string;
    updatedAt?: string;
  }) => ({
    addressId: '',
    city: document.city ?? '',
    country: '',
    countryId: '',
    createdAt: document.createdAt ?? '',
    id: document.id,
    name: document.name,
    postalCode: '',
    street: '',
    streetNumber: '',
    updatedAt: document.updatedAt ?? '',
  }),
}));

vi.mock('../settings', () => ({
  parseFilemakerDatabase: (...args: unknown[]) => mocks.parseFilemakerDatabaseMock(...args),
  toPersistedFilemakerDatabase: (...args: unknown[]) =>
    mocks.toPersistedFilemakerDatabaseMock(...args),
}));

import {
  deleteMongoFilemakerOrganization,
  deleteMongoFilemakerOrganizations,
  listMongoFilemakerOrganizations,
} from './filemaker-organizations-repository';

const createFindChain = (documents: Array<Record<string, unknown>>) => {
  const chain = {
    limit: vi.fn(() => chain),
    skip: vi.fn(() => chain),
    sort: vi.fn(() => chain),
    toArray: vi.fn(async () => documents),
  };
  return chain;
};

describe('listMongoFilemakerOrganizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMongoFilemakerEventsForOrganizationMock.mockResolvedValue([]);
    mocks.readFilemakerCampaignSettingValueMock.mockResolvedValue('stored-filemaker-database');
    mocks.toPersistedFilemakerDatabaseMock.mockImplementation((value: unknown) => value);
    mocks.upsertFilemakerCampaignSettingValueMock.mockResolvedValue(true);
    mocks.parseFilemakerDatabaseMock.mockReturnValue({
      jobListingLexiconLinks: [],
      jobListings: [
        {
          createdAt: '2026-04-28T09:00:00.000Z',
          description: 'Build interfaces.',
          id: 'listing-1',
          lexiconTermIds: [],
          location: 'Warszawa',
          organizationId: 'org-1',
          salaryMax: null,
          salaryMin: null,
          salaryPeriod: 'monthly',
          sourceSite: 'pracuj.pl',
          sourceUrl: 'https://www.pracuj.pl/praca/frontend,oferta,1001',
          status: 'open',
          targetedCampaignIds: [],
          title: 'Frontend Developer',
          updatedAt: '2026-04-28T09:00:00.000Z',
        },
        {
          id: 'listing-other',
          organizationId: 'org-other',
          title: 'Hidden Listing',
        },
      ],
    });
  });

  it('sorts by updated time and returns linked job listings for the visible organisations', async () => {
    const documents = [
      {
        _id: 'org-1',
        createdAt: '2026-04-27T09:00:00.000Z',
        id: 'org-1',
        name: 'Acme Inc',
        updatedAt: '2026-04-28T10:00:00.000Z',
      },
    ];
    const findChain = createFindChain(documents);
    mocks.getFilemakerOrganizationsCollectionMock.mockResolvedValue({
      estimatedDocumentCount: vi.fn(async () => 1),
      find: vi.fn(() => findChain),
    });

    const result = await listMongoFilemakerOrganizations({
      sort: 'updatedAt_desc',
    });

    expect(findChain.sort).toHaveBeenCalledWith({
      updatedAt: -1,
      createdAt: -1,
      name: 1,
      _id: 1,
    });
    expect(result.organizations).toEqual([
      expect.objectContaining({
        id: 'org-1',
        name: 'Acme Inc',
        updatedAt: '2026-04-28T10:00:00.000Z',
      }),
    ]);
    expect(result.linkedJobListingsByOrganizationId).toEqual({
      'org-1': [
        expect.objectContaining({
          id: 'listing-1',
          organizationId: 'org-1',
          title: 'Frontend Developer',
        }),
      ],
    });
  });

  it('deletes an organization by the resolved Mongo document id', async () => {
    const findOne = vi.fn(async () => ({
      _id: 'mongo-org-1',
      id: 'org-1',
      name: 'Acme Inc',
    }));
    const deleteOne = vi.fn(async () => ({ deletedCount: 1 }));
    mocks.getFilemakerOrganizationsCollectionMock.mockResolvedValue({
      deleteOne,
      findOne,
    });

    const deleted = await deleteMongoFilemakerOrganization('org-1');

    expect(findOne).toHaveBeenCalledWith({
      $or: [{ _id: 'org-1' }, { id: 'org-1' }, { legacyUuid: 'org-1' }],
    });
    expect(deleteOne).toHaveBeenCalledWith({ _id: 'mongo-org-1' });
    expect(mocks.upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledTimes(1);
    expect(deleted).toEqual(expect.objectContaining({ id: 'org-1', name: 'Acme Inc' }));
  });

  it('batch deletes organizations and removes linked settings job listings', async () => {
    const documents = new Map([
      [
        'org-1',
        {
          _id: 'mongo-org-1',
          id: 'org-1',
          legacyUuid: 'legacy-org-1',
          name: 'Acme Inc',
        },
      ],
      [
        'legacy-org-2',
        {
          _id: 'mongo-org-2',
          id: 'org-2',
          legacyUuid: 'legacy-org-2',
          name: 'Beta Inc',
        },
      ],
    ]);
    const findOne = vi.fn(async (filter: { $or: Array<Record<string, string>> }) => {
      const requestedId =
        filter.$or.find((entry: Record<string, string>): boolean => entry._id !== undefined)
          ?._id ?? '';
      return documents.get(requestedId) ?? null;
    });
    const deleteMany = vi.fn(async () => ({ deletedCount: 2 }));
    mocks.getFilemakerOrganizationsCollectionMock.mockResolvedValue({
      deleteMany,
      findOne,
    });
    mocks.parseFilemakerDatabaseMock.mockReturnValue({
      jobListingLexiconLinks: [
        { id: 'link-1', jobListingId: 'listing-1', lexiconTermId: 'term-1' },
        { id: 'link-2', jobListingId: 'listing-2', lexiconTermId: 'term-2' },
        { id: 'link-3', jobListingId: 'listing-other', lexiconTermId: 'term-3' },
      ],
      jobListings: [
        { id: 'listing-1', organizationId: 'org-1', title: 'Frontend Developer' },
        { id: 'listing-2', organizationId: 'legacy-org-2', title: 'Backend Developer' },
        { id: 'listing-other', organizationId: 'org-other', title: 'Hidden Listing' },
      ],
    });

    const result = await deleteMongoFilemakerOrganizations([
      'org-1',
      'legacy-org-2',
      'missing-org',
    ]);

    expect(deleteMany).toHaveBeenCalledWith({
      _id: { $in: ['mongo-org-1', 'mongo-org-2'] },
    });
    expect(result).toMatchObject({
      deletedJobListingCount: 2,
      deletedJobListingIds: ['listing-1', 'listing-2'],
      deletedOrganizationCount: 2,
      deletedOrganizationIds: ['org-1', 'org-2'],
      missingOrganizationIds: ['missing-org'],
      requestedOrganizationIds: ['org-1', 'legacy-org-2', 'missing-org'],
    });
    expect(mocks.upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledTimes(1);
    const persisted = JSON.parse(
      mocks.upsertFilemakerCampaignSettingValueMock.mock.calls[0]?.[1] as string
    ) as {
      jobListingLexiconLinks: Array<{ id: string }>;
      jobListings: Array<{ id: string }>;
    };
    expect(persisted.jobListings).toEqual([
      expect.objectContaining({ id: 'listing-other' }),
    ]);
    expect(persisted.jobListingLexiconLinks).toEqual([
      expect.objectContaining({ id: 'link-3' }),
    ]);
  });
});
