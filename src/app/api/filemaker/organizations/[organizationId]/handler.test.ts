import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  deleteMongoFilemakerOrganizationMock,
  getMongoFilemakerOrganizationByIdMock,
  getMongoFilemakerPartySnapshotMock,
  listMongoFilemakerAddressesForOrganizationMock,
  listMongoFilemakerAnyParamsForOrganizationMock,
  listMongoFilemakerAnyTextsForOrganizationMock,
  listMongoFilemakerBankAccountsForOrganizationMock,
  listMongoFilemakerDemandsForOrganizationMock,
  listMongoFilemakerDocumentsForOrganizationMock,
  listMongoFilemakerEmailsForOrganizationMock,
  listMongoFilemakerEventsForOrganizationMock,
  listMongoFilemakerHarvestProfilesForOrganizationMock,
  listMongoFilemakerPersonsForOrganizationMock,
  listMongoFilemakerProfilesForOrganizationMock,
  listMongoFilemakerValueCatalogMock,
  listMongoFilemakerWebsitesForOrganizationMock,
  requireFilemakerMailAdminSessionMock,
  updateMongoFilemakerAddressesForOrganizationMock,
  updateMongoFilemakerOrganizationMock,
} = vi.hoisted(() => ({
  deleteMongoFilemakerOrganizationMock: vi.fn(),
  getMongoFilemakerOrganizationByIdMock: vi.fn(),
  getMongoFilemakerPartySnapshotMock: vi.fn(),
  listMongoFilemakerAddressesForOrganizationMock: vi.fn(),
  listMongoFilemakerAnyParamsForOrganizationMock: vi.fn(),
  listMongoFilemakerAnyTextsForOrganizationMock: vi.fn(),
  listMongoFilemakerBankAccountsForOrganizationMock: vi.fn(),
  listMongoFilemakerDemandsForOrganizationMock: vi.fn(),
  listMongoFilemakerDocumentsForOrganizationMock: vi.fn(),
  listMongoFilemakerEmailsForOrganizationMock: vi.fn(),
  listMongoFilemakerEventsForOrganizationMock: vi.fn(),
  listMongoFilemakerHarvestProfilesForOrganizationMock: vi.fn(),
  listMongoFilemakerPersonsForOrganizationMock: vi.fn(),
  listMongoFilemakerProfilesForOrganizationMock: vi.fn(),
  listMongoFilemakerValueCatalogMock: vi.fn(),
  listMongoFilemakerWebsitesForOrganizationMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
  updateMongoFilemakerAddressesForOrganizationMock: vi.fn(),
  updateMongoFilemakerOrganizationMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  deleteMongoFilemakerOrganization: deleteMongoFilemakerOrganizationMock,
  getMongoFilemakerOrganizationById: getMongoFilemakerOrganizationByIdMock,
  getMongoFilemakerPartySnapshot: getMongoFilemakerPartySnapshotMock,
  listMongoFilemakerAnyParamsForOrganization: listMongoFilemakerAnyParamsForOrganizationMock,
  listMongoFilemakerAnyTextsForOrganization: listMongoFilemakerAnyTextsForOrganizationMock,
  listMongoFilemakerBankAccountsForOrganization: listMongoFilemakerBankAccountsForOrganizationMock,
  listMongoFilemakerDocumentsForOrganization: listMongoFilemakerDocumentsForOrganizationMock,
  listMongoFilemakerEmailsForOrganization: listMongoFilemakerEmailsForOrganizationMock,
  listMongoFilemakerEventsForOrganization: listMongoFilemakerEventsForOrganizationMock,
  listMongoFilemakerPersonsForOrganization: listMongoFilemakerPersonsForOrganizationMock,
  listMongoFilemakerValueCatalog: listMongoFilemakerValueCatalogMock,
  listMongoFilemakerWebsitesForOrganization: listMongoFilemakerWebsitesForOrganizationMock,
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
  updateMongoFilemakerOrganization: updateMongoFilemakerOrganizationMock,
}));

vi.mock('@/features/filemaker/server/filemaker-organizations-mongo', () => ({
  listMongoFilemakerAddressesForOrganization: listMongoFilemakerAddressesForOrganizationMock,
  updateMongoFilemakerAddressesForOrganization: updateMongoFilemakerAddressesForOrganizationMock,
}));

vi.mock('@/features/filemaker/server/filemaker-organization-imported-metadata', () => ({
  listMongoFilemakerDemandsForOrganization: listMongoFilemakerDemandsForOrganizationMock,
  listMongoFilemakerHarvestProfilesForOrganization: listMongoFilemakerHarvestProfilesForOrganizationMock,
  listMongoFilemakerProfilesForOrganization: listMongoFilemakerProfilesForOrganizationMock,
}));

import { deleteHandler } from './handler';

const requestContext = {
  params: { organizationId: 'org%201' },
} as ApiHandlerContext;

describe('filemaker organization by-id handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    deleteMongoFilemakerOrganizationMock.mockResolvedValue({ id: 'org 1', name: 'Acme Inc' });
  });

  it('deletes the requested organization', async () => {
    const response = await deleteHandler(
      new NextRequest('http://localhost/api/filemaker/organizations/org%201', {
        method: 'DELETE',
      }),
      requestContext
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(deleteMongoFilemakerOrganizationMock).toHaveBeenCalledWith('org 1');
    expect(response.status).toBe(204);
  });
});
