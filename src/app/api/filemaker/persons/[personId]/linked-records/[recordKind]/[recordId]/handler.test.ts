/* eslint-disable max-lines-per-function */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  collectionMock: vi.fn(),
  deleteOneMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  getMongoFilemakerPersonByIdMock: vi.fn(),
  listMongoFilemakerAnyParamsForPersonMock: vi.fn(),
  listMongoFilemakerAnyTextsForPersonMock: vi.fn(),
  listMongoFilemakerBankAccountsForPersonMock: vi.fn(),
  listMongoFilemakerDocumentsForPersonMock: vi.fn(),
  listMongoFilemakerPersonOccupationsForPersonMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
  updateOneMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDbMock,
}));

vi.mock('@/features/filemaker/server', () => ({
  FILEMAKER_ANYPARAMS_COLLECTION: 'filemaker_anyparams',
  FILEMAKER_ANYTEXTS_COLLECTION: 'filemaker_anytexts',
  FILEMAKER_BANK_ACCOUNTS_COLLECTION: 'filemaker_bank_accounts',
  FILEMAKER_DOCUMENTS_COLLECTION: 'filemaker_documents',
  FILEMAKER_PERSON_OCCUPATIONS_COLLECTION: 'filemaker_person_occupations',
  getMongoFilemakerPersonById: mocks.getMongoFilemakerPersonByIdMock,
  listMongoFilemakerAnyParamsForPerson: mocks.listMongoFilemakerAnyParamsForPersonMock,
  listMongoFilemakerAnyTextsForPerson: mocks.listMongoFilemakerAnyTextsForPersonMock,
  listMongoFilemakerBankAccountsForPerson: mocks.listMongoFilemakerBankAccountsForPersonMock,
  listMongoFilemakerDocumentsForPerson: mocks.listMongoFilemakerDocumentsForPersonMock,
  listMongoFilemakerPersonOccupationsForPerson:
    mocks.listMongoFilemakerPersonOccupationsForPersonMock,
  requireFilemakerMailAdminSession: mocks.requireFilemakerMailAdminSessionMock,
}));

import { deleteHandler, patchHandler } from './handler';

const createContext = (recordKind: string, recordId: string): ApiHandlerContext => ({
  params: {
    personId: 'person-1',
    recordId,
    recordKind,
  },
  query: {},
});

const createJsonRequest = (body: Record<string, unknown>): NextRequest =>
  new NextRequest('http://localhost/api/filemaker/persons/person-1/linked-records/any-text/text-1', {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  });

describe('filemaker person linked records handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    mocks.getMongoFilemakerPersonByIdMock.mockResolvedValue({
      id: 'person-1',
      legacyUuid: 'person-legacy-1',
    });
    mocks.collectionMock.mockReturnValue({
      deleteOne: mocks.deleteOneMock,
      updateOne: mocks.updateOneMock,
    });
    mocks.getMongoDbMock.mockResolvedValue({ collection: mocks.collectionMock });
    mocks.updateOneMock.mockResolvedValue({ matchedCount: 1 });
    mocks.deleteOneMock.mockResolvedValue({ deletedCount: 1 });
    mocks.listMongoFilemakerAnyParamsForPersonMock.mockResolvedValue([]);
    mocks.listMongoFilemakerAnyTextsForPersonMock.mockResolvedValue([{ id: 'text-1' }]);
    mocks.listMongoFilemakerBankAccountsForPersonMock.mockResolvedValue([]);
    mocks.listMongoFilemakerDocumentsForPersonMock.mockResolvedValue([]);
    mocks.listMongoFilemakerPersonOccupationsForPersonMock.mockResolvedValue([]);
  });

  it('updates a linked any text record after verifying person ownership', async () => {
    const response = await patchHandler(
      createJsonRequest({
        text: 'Updated text',
        updatedBy: '  Admin  ',
      }),
      createContext('any-text', 'text-1')
    );

    expect(mocks.requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(mocks.getMongoFilemakerPersonByIdMock).toHaveBeenCalledWith('person-1');
    expect(mocks.listMongoFilemakerAnyTextsForPersonMock).toHaveBeenCalledWith({
      id: 'person-1',
      legacyUuid: 'person-legacy-1',
    });
    expect(mocks.collectionMock).toHaveBeenCalledWith('filemaker_anytexts');
    expect(mocks.updateOneMock).toHaveBeenCalledWith(
      { $or: [{ _id: 'text-1' }, { id: 'text-1' }, { legacyUuid: 'text-1' }] },
      {
        $set: {
          text: 'Updated text',
          updatedAt: expect.any(String),
          updatedBy: 'Admin',
        },
      }
    );
    await expect(response.json()).resolves.toMatchObject({
      kind: 'any-text',
      patch: {
        text: 'Updated text',
        updatedBy: 'Admin',
      },
      recordId: 'text-1',
    });
  });

  it('deletes a linked occupation record after verifying person ownership', async () => {
    mocks.listMongoFilemakerAnyTextsForPersonMock.mockResolvedValue([]);
    mocks.listMongoFilemakerPersonOccupationsForPersonMock.mockResolvedValue([{ id: 'job-1' }]);

    const response = await deleteHandler(
      new NextRequest('http://localhost/api/filemaker/persons/person-1/linked-records/occupation/job-1', {
        method: 'DELETE',
      }),
      createContext('occupation', 'job-1')
    );

    expect(mocks.collectionMock).toHaveBeenCalledWith('filemaker_person_occupations');
    expect(mocks.deleteOneMock).toHaveBeenCalledWith({
      $or: [{ _id: 'job-1' }, { id: 'job-1' }, { legacyUuid: 'job-1' }],
    });
    await expect(response.json()).resolves.toEqual({
      deleted: true,
      kind: 'occupation',
      recordId: 'job-1',
    });
  });

  it('does not update records that are not linked to the person', async () => {
    mocks.listMongoFilemakerAnyTextsForPersonMock.mockResolvedValue([]);

    await expect(
      patchHandler(createJsonRequest({ text: 'Updated text' }), createContext('any-text', 'text-1'))
    ).rejects.toThrow('Linked FileMaker record was not found for this person.');

    expect(mocks.updateOneMock).not.toHaveBeenCalled();
  });
});
