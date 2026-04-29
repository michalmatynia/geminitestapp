import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  getFilemakerOrganizationsCollectionMock: vi.fn(),
  listMongoFilemakerEventsForOrganizationMock: vi.fn(),
  parseFilemakerDatabaseMock: vi.fn(),
  readFilemakerCampaignSettingValueMock: vi.fn(),
}));

vi.mock('./campaign-settings-store', () => ({
  readFilemakerCampaignSettingValue: (...args: unknown[]) =>
    mocks.readFilemakerCampaignSettingValueMock(...args),
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
}));

import {
  deleteMongoFilemakerOrganization,
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
    mocks.parseFilemakerDatabaseMock.mockReturnValue({
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

    expect(findChain.sort).toHaveBeenCalledWith({ updatedAt: -1, name: 1, _id: 1 });
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
    expect(deleted).toEqual(expect.objectContaining({ id: 'org-1', name: 'Acme Inc' }));
  });
});
