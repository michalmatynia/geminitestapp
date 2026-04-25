import { describe, expect, it } from 'vitest';

import {
  buildFilemakerOrganizationMasterNodes,
  buildFilemakerPersonMasterNodes,
  buildFilemakerValueMasterNodes,
  fromFilemakerOrganizationNodeId,
  fromFilemakerPersonNodeId,
  fromFilemakerValueNodeId,
  toFilemakerOrganizationNodeId,
  toFilemakerPersonNodeId,
  toFilemakerValueNodeId,
} from '@/features/filemaker/entity-master-tree';

import type { FilemakerOrganization, FilemakerPerson, FilemakerValue } from '@/features/filemaker/types';

const timestamp = '2026-03-01T10:00:00.000Z';

describe('filemaker entity master tree', () => {
  it('groups organizations by initial and creates decodable organization nodes', () => {
    const organizations: FilemakerOrganization[] = [
      {
        id: 'org-2',
        name: 'Beta LLC',
        addressId: '',
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        country: '',
        countryId: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
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
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];

    const nodes = buildFilemakerOrganizationMasterNodes(organizations);

    expect(nodes.map((node) => node.name)).toEqual(['A', 'Acme Inc', 'B', 'Beta LLC']);
    expect(fromFilemakerOrganizationNodeId(toFilemakerOrganizationNodeId('org-1'))).toBe('org-1');
  });

  it('groups persons by last-name initial and creates decodable person nodes', () => {
    const persons: FilemakerPerson[] = [
      {
        id: 'person-2',
        firstName: 'John',
        lastName: 'Zimmer',
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
        createdAt: timestamp,
        updatedAt: timestamp,
      },
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
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];

    const nodes = buildFilemakerPersonMasterNodes(persons);

    expect(nodes.map((node) => node.name)).toEqual(['S', 'Jane Smith', 'Z', 'John Zimmer']);
    expect(fromFilemakerPersonNodeId(toFilemakerPersonNodeId('person-1'))).toBe('person-1');
  });

  it('builds hierarchical value nodes using parent value records', () => {
    const values: FilemakerValue[] = [
      {
        id: 'child-1',
        parentId: 'root-1',
        label: 'Urgent',
        value: 'urgent',
        description: 'Priority marker',
        sortOrder: 2,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      {
        id: 'root-1',
        parentId: null,
        label: 'Priority',
        value: 'priority',
        sortOrder: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];

    const nodes = buildFilemakerValueMasterNodes(values);

    expect(nodes.map((node) => node.name)).toEqual(['Priority', 'Urgent']);
    expect(nodes[0]?.type).toBe('folder');
    expect(nodes[1]?.parentId).toBe(toFilemakerValueNodeId('root-1'));
    expect(fromFilemakerValueNodeId(toFilemakerValueNodeId('child-1'))).toBe('child-1');
  });
});
