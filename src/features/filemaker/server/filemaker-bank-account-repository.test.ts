import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MongoFilemakerPerson } from './filemaker-persons-mongo';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { listMongoFilemakerBankAccountsForPerson } from './filemaker-bank-account-repository';

const createPerson = (input: Partial<MongoFilemakerPerson> = {}): MongoFilemakerPerson =>
  ({
    addressId: '',
    city: '',
    country: '',
    countryId: '',
    firstName: 'Ada',
    fullName: 'Ada Lovelace',
    id: 'person-1',
    lastName: 'Lovelace',
    legacyOrganizationUuids: [],
    linkedOrganizations: [],
    nip: '',
    organizationLinkCount: 0,
    phoneNumbers: [],
    postalCode: '',
    regon: '',
    street: '',
    streetNumber: '',
    unresolvedOrganizationLinkCount: 0,
    ...input,
  }) as MongoFilemakerPerson;

describe('filemaker bank account repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('looks up person bank accounts by owner and default/display legacy bank account UUIDs', async () => {
    const toArrayMock = vi.fn().mockResolvedValue([
      {
        _id: 'account-1',
        accountNumber: '123',
        id: 'account-1',
        isDefaultForOwner: false,
        isDisplayForOwner: false,
        legacyOwnerUuid: 'UNRESOLVED-OWNER',
        legacyUuid: 'BANK-DEFAULT',
        schemaVersion: 1,
      },
    ]);
    const sortMock = vi.fn().mockReturnValue({ toArray: toArrayMock });
    const findMock = vi.fn().mockReturnValue({ sort: sortMock });
    const collectionMock = vi.fn().mockReturnValue({ find: findMock });
    getMongoDbMock.mockResolvedValue({ collection: collectionMock });

    const accounts = await listMongoFilemakerBankAccountsForPerson(
      createPerson({
        legacyDefaultBankAccountUuid: 'bank-default',
        legacyDisplayBankAccountUuid: 'bank-display',
        legacyUuid: 'person-legacy',
      })
    );

    expect(collectionMock).toHaveBeenCalledWith('filemaker_bank_accounts');
    expect(findMock).toHaveBeenCalledWith({
      $or: [
        { ownerKind: 'person', ownerId: 'person-1' },
        { ownerKind: 'person', legacyOwnerUuid: 'PERSON-LEGACY' },
        { ownerKind: { $exists: false }, legacyOwnerUuid: 'PERSON-LEGACY' },
        { legacyUuid: { $in: ['BANK-DEFAULT', 'BANK-DISPLAY'] } },
      ],
    });
    expect(accounts).toEqual([
      expect.objectContaining({
        accountNumber: '123',
        id: 'account-1',
        legacyUuid: 'BANK-DEFAULT',
      }),
    ]);
  });
});
