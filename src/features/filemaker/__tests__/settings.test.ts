import { describe, expect, it } from 'vitest';

import {
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
  getFilemakerAddressById,
  parseFilemakerDatabase,
  resolveFilemakerPartyLabel,
} from '@/features/filemaker/settings';

describe('filemaker settings', () => {
  it('normalizes and deduplicates database entries', () => {
    const raw = JSON.stringify({
      version: 1,
      persons: [
        {
          id: 'p-1',
          firstName: 'John',
          lastName: 'Doe',
          street: 'Main Street 1',
          city: 'Warsaw',
          postalCode: '00-001',
          country: 'Poland',
          nip: '123',
          regon: '456',
          phoneNumbers: ['+48 123', '+48 123', ''],
        },
        {
          id: 'p-1',
          firstName: 'Duplicate',
          lastName: 'Person',
          street: 'Other Street 5',
          city: 'Krakow',
          postalCode: '30-001',
          country: 'Poland',
        },
      ],
      organizations: [
        {
          id: 'o-1',
          name: 'Acme Corp',
          street: 'Business Road 2',
          city: 'Gdansk',
          postalCode: '80-001',
          country: 'Poland',
        },
      ],
    });

    const database = parseFilemakerDatabase(raw);
    expect(database.version).toBe(2);
    expect(database.persons).toHaveLength(1);
    expect(database.organizations).toHaveLength(1);
    expect(database.addresses).toHaveLength(2);
    expect(database.persons[0]?.phoneNumbers).toEqual(['+48 123']);
    expect(database.persons[0]?.city).toBe('Warsaw');
    expect(database.organizations[0]?.country).toBe('Poland');
    expect(database.persons[0]?.addressId).toBe('person-address-p-1');
    expect(database.organizations[0]?.addressId).toBe('organization-address-o-1');
    expect(getFilemakerAddressById(database, database.persons[0]?.addressId)?.country).toBe('Poland');
  });

  it('encodes and decodes party references', () => {
    expect(encodeFilemakerPartyReference({ kind: 'person', id: 'p-1' })).toBe('person:p-1');
    expect(decodeFilemakerPartyReference('organization:o-1')).toEqual({
      kind: 'organization',
      id: 'o-1',
    });
    expect(decodeFilemakerPartyReference('none')).toBeNull();
  });

  it('builds party labels and options', () => {
    const database = parseFilemakerDatabase(
      JSON.stringify({
        version: 1,
        persons: [
          {
            id: 'p-1',
            firstName: 'Jane',
            lastName: 'Smith',
            street: 'Street 9',
            city: 'Warsaw',
            postalCode: '00-002',
            country: 'Poland',
            nip: '',
            regon: '',
            phoneNumbers: [],
          },
        ],
        organizations: [
          {
            id: 'o-1',
            name: 'Beta Ltd',
            street: 'Org Avenue 10',
            city: 'Poznan',
            postalCode: '60-001',
            country: 'Poland',
          },
        ],
      })
    );

    const options = buildFilemakerPartyOptions(database);
    expect(options.length).toBe(3);
    expect(resolveFilemakerPartyLabel(database, { kind: 'person', id: 'p-1' })).toBe('Jane Smith');
    expect(resolveFilemakerPartyLabel(database, { kind: 'organization', id: 'o-1' })).toBe('Beta Ltd');
  });

  it('ignores deprecated fullAddress payloads', () => {
    const database = parseFilemakerDatabase(
      JSON.stringify({
        version: 1,
        persons: [
          {
            id: 'p-deprecated',
            firstName: 'Deprecated',
            lastName: 'Person',
            fullAddress: 'Main Street 1, Warsaw, 00-003, Poland',
          },
        ],
        organizations: [
          {
            id: 'o-deprecated',
            name: 'Deprecated Org',
            fullAddress: 'Business Road 2, Gdynia, 81-001, Poland',
          },
        ],
      })
    );

    expect(database.persons[0]?.street).toBe('');
    expect(database.persons[0]?.streetNumber).toBe('');
    expect(database.persons[0]?.city).toBe('');
    expect(database.persons[0]?.postalCode).toBe('');
    expect(database.persons[0]?.country).toBe('');
    expect(database.organizations[0]?.street).toBe('');
    expect(database.organizations[0]?.streetNumber).toBe('');
    expect(database.organizations[0]?.city).toBe('');
    expect(database.organizations[0]?.postalCode).toBe('');
    expect(database.organizations[0]?.country).toBe('');
    expect(database.addresses).toHaveLength(0);
  });
});
