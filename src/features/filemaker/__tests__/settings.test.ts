import { describe, expect, it } from 'vitest';

import {
  buildFilemakerPartyOptions,
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
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
          fullAddress: 'Main Street 1',
          nip: '123',
          regon: '456',
          phoneNumbers: ['+48 123', '+48 123', ''],
        },
        {
          id: 'p-1',
          firstName: 'Duplicate',
          lastName: 'Person',
          fullAddress: 'Other',
        },
      ],
      organizations: [
        {
          id: 'o-1',
          name: 'Acme Corp',
          fullAddress: 'Business Road 2',
        },
      ],
    });

    const database = parseFilemakerDatabase(raw);
    expect(database.persons).toHaveLength(1);
    expect(database.organizations).toHaveLength(1);
    expect(database.persons[0]?.phoneNumbers).toEqual(['+48 123']);
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
            fullAddress: 'Street 9',
            nip: '',
            regon: '',
            phoneNumbers: [],
          },
        ],
        organizations: [
          {
            id: 'o-1',
            name: 'Beta Ltd',
            fullAddress: 'Org Avenue 10',
          },
        ],
      })
    );

    const options = buildFilemakerPartyOptions(database);
    expect(options.length).toBe(3);
    expect(resolveFilemakerPartyLabel(database, { kind: 'person', id: 'p-1' })).toBe('Jane Smith');
    expect(resolveFilemakerPartyLabel(database, { kind: 'organization', id: 'o-1' })).toBe('Beta Ltd');
  });
});
