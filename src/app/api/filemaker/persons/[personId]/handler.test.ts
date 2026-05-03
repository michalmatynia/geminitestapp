import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  updateMongoFilemakerAddressesForOwnerMock,
  updateMongoFilemakerPersonMock,
} = vi.hoisted(
  () => ({
    requireFilemakerMailAdminSessionMock: vi.fn(),
    updateMongoFilemakerAddressesForOwnerMock: vi.fn(),
    updateMongoFilemakerPersonMock: vi.fn(),
  })
);

vi.mock('@/features/filemaker/server', () => ({
  getMongoFilemakerPersonById: vi.fn(),
  listMongoFilemakerAddressesForOwner: vi.fn(),
  listMongoFilemakerAnyParamsForPerson: vi.fn(),
  listMongoFilemakerAnyTextsForPerson: vi.fn(),
  listMongoFilemakerBankAccountsForPerson: vi.fn(),
  listMongoFilemakerContractsForPerson: vi.fn(),
  listMongoFilemakerDocumentsForPerson: vi.fn(),
  listMongoFilemakerPersonOccupationsForPerson: vi.fn(),
  listMongoFilemakerWebsitesForPerson: vi.fn(),
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
  updateMongoFilemakerAddressesForOwner: updateMongoFilemakerAddressesForOwnerMock,
  updateMongoFilemakerPerson: updateMongoFilemakerPersonMock,
}));

import { patchHandler } from './handler';

describe('filemaker person handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    updateMongoFilemakerPersonMock.mockResolvedValue({
      id: 'person-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    updateMongoFilemakerAddressesForOwnerMock.mockResolvedValue([]);
  });

  it('accepts profile and CV fields in person PATCH payloads', async () => {
    const body = {
      cvCoreStrengths: ['AI products', 'Integration engineering'],
      cvProfessionalSummary: 'Engineer building AI products and integrations.',
      cvSelectedTechnicalEnvironment: ['Next.js, React, TypeScript'],
      firstName: 'Ada',
      githubUrl: 'https://github.com/ada',
      languageSkills: [{ language: 'English', level: 10 }],
      lastName: 'Lovelace',
      nip: '1234567890',
      linkedinUrl: 'https://linkedin.com/in/ada',
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
          highlights: ['Led end-to-end product delivery.'],
          isCurrent: true,
          location: 'Remote',
          organization: 'StudiQ',
          period: 'Sep 2025 - Present',
          startDate: '2025-09',
          title: 'Agentic Engineer',
        },
      ],
      regon: '987654321',
    };

    const response = await patchHandler(
      new NextRequest('http://localhost/api/filemaker/persons/person-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: { personId: 'person-1' } } as Parameters<typeof patchHandler>[1]
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(updateMongoFilemakerPersonMock).toHaveBeenCalledWith('person-1', body);
    await expect(response.json()).resolves.toEqual({
      person: {
        id: 'person-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });
  });

  it('updates linked address fields in person PATCH payloads', async () => {
    const address = {
      addressId: 'address-1',
      city: 'Warsaw',
      country: 'Poland',
      countryId: 'PL',
      isDefault: true,
      postalCode: '00-001',
      street: 'Marszalkowska',
      streetNumber: '1',
    };
    const body = {
      addressId: 'address-1',
      addresses: [address],
      city: 'Warsaw',
      country: 'Poland',
      countryId: 'PL',
      firstName: 'Ada',
      lastName: 'Lovelace',
      postalCode: '00-001',
      street: 'Marszalkowska',
      streetNumber: '1',
    };

    const response = await patchHandler(
      new NextRequest('http://localhost/api/filemaker/persons/person-1', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: { personId: 'person-1' } } as Parameters<typeof patchHandler>[1]
    );

    expect(updateMongoFilemakerPersonMock).toHaveBeenCalledWith('person-1', {
      addressId: 'address-1',
      city: 'Warsaw',
      country: 'Poland',
      countryId: 'PL',
      firstName: 'Ada',
      lastName: 'Lovelace',
      postalCode: '00-001',
      street: 'Marszalkowska',
      streetNumber: '1',
    });
    expect(updateMongoFilemakerAddressesForOwnerMock).toHaveBeenCalledWith(
      'person',
      'person-1',
      [address]
    );
    await expect(response.json()).resolves.toEqual({
      linkedAddresses: [],
      person: {
        id: 'person-1',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
    });
  });
});
