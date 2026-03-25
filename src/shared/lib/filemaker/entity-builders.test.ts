import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createFilemakerAddress,
  createFilemakerOrganization,
  createFilemakerPerson,
  formatFilemakerAddress,
  normalizeAddressFields,
} from '@/shared/lib/filemaker/entity-builders';

describe('filemaker entity builders', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-25T14:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('normalizes address fields and formats them into a label', () => {
    const address = normalizeAddressFields({
      street: '  Main Street  ',
      streetNumber: 42,
      city: '  Warsaw ',
      postalCode: ' 00-001 ',
      country: ' Poland ',
      countryId: null,
    });

    expect(address).toEqual({
      street: 'Main Street',
      streetNumber: '',
      city: 'Warsaw',
      postalCode: '00-001',
      country: 'Poland',
      countryId: '',
    });
    expect(
      formatFilemakerAddress({
        street: ' Main Street ',
        streetNumber: ' 15A ',
        city: ' Warsaw ',
        postalCode: '00-001',
        country: ' Poland ',
      })
    ).toBe('Main Street 15A, Warsaw, 00-001, Poland');
  });

  it('builds addresses and organizations with normalized strings and provided timestamps', () => {
    expect(
      createFilemakerAddress({
        id: ' address-1 ',
        street: ' Main Street ',
        streetNumber: ' 1 ',
        city: ' Warsaw ',
        postalCode: ' 00-001 ',
        country: ' Poland ',
        countryId: ' PL ',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      })
    ).toEqual({
      id: 'address-1',
      street: 'Main Street',
      streetNumber: '1',
      city: 'Warsaw',
      postalCode: '00-001',
      country: 'Poland',
      countryId: 'PL',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    expect(
      createFilemakerOrganization({
        id: ' org-1 ',
        name: '  ACME Corp  ',
        addressId: 123,
        street: '  Commerce Ave ',
        streetNumber: ' 12B ',
        city: ' Krakow ',
        postalCode: ' 30-001 ',
        country: ' Poland ',
        countryId: ' PL ',
      })
    ).toEqual({
      id: 'org-1',
      name: 'ACME Corp',
      addressId: '',
      street: 'Commerce Ave',
      streetNumber: '12B',
      city: 'Krakow',
      postalCode: '30-001',
      country: 'Poland',
      countryId: 'PL',
      createdAt: '2026-03-25T14:00:00.000Z',
      updatedAt: '2026-03-25T14:00:00.000Z',
    });
  });

  it('builds people with deduplicated phone numbers from arrays and csv strings', () => {
    expect(
      createFilemakerPerson({
        id: 'person-1',
        firstName: ' Ada ',
        lastName: ' Lovelace ',
        addressId: ' address-1 ',
        street: ' Main Street ',
        streetNumber: ' 15A ',
        city: ' Warsaw ',
        postalCode: ' 00-001 ',
        country: ' Poland ',
        countryId: ' PL ',
        nip: ' 123 ',
        regon: ' 456 ',
        phoneNumbers: ['+48 111 111 111', ' +48 111 111 111 ', '', null],
      })
    ).toEqual({
      id: 'person-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      addressId: 'address-1',
      street: 'Main Street',
      streetNumber: '15A',
      city: 'Warsaw',
      postalCode: '00-001',
      country: 'Poland',
      countryId: 'PL',
      nip: '123',
      regon: '456',
      phoneNumbers: ['+48 111 111 111'],
      createdAt: '2026-03-25T14:00:00.000Z',
      updatedAt: '2026-03-25T14:00:00.000Z',
    });

    expect(
      createFilemakerPerson({
        id: 'person-2',
        firstName: 'Grace',
        lastName: 'Hopper',
        phoneNumbers: '123, 456, 123, , 789 ',
      }).phoneNumbers
    ).toEqual(['123', '456', '789']);
  });
});
