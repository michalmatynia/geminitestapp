import { formatFilemakerAddress } from './settings';

import type { FilemakerEvent, FilemakerOrganization, FilemakerPerson, FilemakerValue } from './types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const ORGANIZATION_GROUP_NODE_PREFIX = 'filemaker-organization-group:';
const ORGANIZATION_NODE_PREFIX = 'filemaker-organization:';
const EVENT_NODE_PREFIX = 'filemaker-event:';
const PERSON_GROUP_NODE_PREFIX = 'filemaker-person-group:';
const PERSON_NODE_PREFIX = 'filemaker-person:';
const VALUE_NODE_PREFIX = 'filemaker-value:';

const encodeNodePart = (value: string): string => encodeURIComponent(value);

const decodeNodePart = (value: string): string => decodeURIComponent(value);

const resolveInitialGroup = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length === 0) return '#';
  const initial = normalized[0]?.toUpperCase() ?? '#';
  return /^[A-Z0-9]$/.test(initial) ? initial : '#';
};

const compareGroupLabels = (left: string, right: string): number => {
  if (left === '#') return 1;
  if (right === '#') return -1;
  return left.localeCompare(right);
};

const buildGroupNode = (input: {
  id: string;
  name: string;
  path: string;
  sortOrder: number;
  count: number;
  entity: string;
}): MasterTreeNode => ({
  id: input.id,
  type: 'folder',
  kind: `${input.entity}_group`,
  parentId: null,
  name: input.name,
  path: input.path,
  sortOrder: input.sortOrder,
  metadata: {
    entity: `${input.entity}_group`,
    count: input.count,
  },
});

export const toFilemakerOrganizationGroupNodeId = (group: string): string =>
  `${ORGANIZATION_GROUP_NODE_PREFIX}${encodeNodePart(group)}`;

export const toFilemakerOrganizationNodeId = (organizationId: string): string =>
  `${ORGANIZATION_NODE_PREFIX}${encodeNodePart(organizationId)}`;

export const fromFilemakerOrganizationNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(ORGANIZATION_NODE_PREFIX)) return null;
  return decodeNodePart(nodeId.slice(ORGANIZATION_NODE_PREFIX.length));
};

export const toFilemakerPersonGroupNodeId = (group: string): string =>
  `${PERSON_GROUP_NODE_PREFIX}${encodeNodePart(group)}`;

export const toFilemakerPersonNodeId = (personId: string): string =>
  `${PERSON_NODE_PREFIX}${encodeNodePart(personId)}`;

export const fromFilemakerPersonNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(PERSON_NODE_PREFIX)) return null;
  return decodeNodePart(nodeId.slice(PERSON_NODE_PREFIX.length));
};

export const toFilemakerEventNodeId = (eventId: string): string =>
  `${EVENT_NODE_PREFIX}${encodeNodePart(eventId)}`;

export const fromFilemakerEventNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(EVENT_NODE_PREFIX)) return null;
  return decodeNodePart(nodeId.slice(EVENT_NODE_PREFIX.length));
};

export const toFilemakerValueNodeId = (valueId: string): string =>
  `${VALUE_NODE_PREFIX}${encodeNodePart(valueId)}`;

export const fromFilemakerValueNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(VALUE_NODE_PREFIX)) return null;
  return decodeNodePart(nodeId.slice(VALUE_NODE_PREFIX.length));
};

export const buildFilemakerOrganizationMasterNodes = (
  organizations: FilemakerOrganization[]
): MasterTreeNode[] => {
  const grouped = new Map<string, FilemakerOrganization[]>();
  organizations.forEach((organization: FilemakerOrganization): void => {
    const group = resolveInitialGroup(organization.name);
    grouped.set(group, [...(grouped.get(group) ?? []), organization]);
  });

  const groups = Array.from(grouped.entries()).sort(([left], [right]) =>
    compareGroupLabels(left, right)
  );

  return groups.flatMap(([group, entries], groupIndex): MasterTreeNode[] => {
    const groupNodeId = toFilemakerOrganizationGroupNodeId(group);
    const sortedEntries = entries
      .slice()
      .sort((left: FilemakerOrganization, right: FilemakerOrganization) =>
        left.name.localeCompare(right.name)
      );
    return [
      buildGroupNode({
        id: groupNodeId,
        name: group,
        path: `organizations/${group}`,
        sortOrder: groupIndex,
        count: sortedEntries.length,
        entity: 'filemaker_organization',
      }),
      ...sortedEntries.map((organization: FilemakerOrganization, index): MasterTreeNode => {
        const normalizedName = organization.name.trim();
        const label = normalizedName.length > 0 ? normalizedName : organization.id;
        return {
          id: toFilemakerOrganizationNodeId(organization.id),
          type: 'file',
          kind: 'filemaker_organization',
          parentId: groupNodeId,
          name: label,
          path: `organizations/${group}/${label}`,
          sortOrder: index,
          metadata: {
            entity: 'filemaker_organization',
            rawId: organization.id,
            address: formatFilemakerAddress(organization),
            taxId: organization.taxId ?? '',
            krs: organization.krs ?? '',
            tradingName: organization.tradingName ?? '',
            updatedAt: organization.updatedAt,
          },
        };
      }),
    ];
  });
};

export const buildFilemakerOrganizationListNodes = (
  organizations: FilemakerOrganization[]
): MasterTreeNode[] =>
  organizations.map((organization: FilemakerOrganization, index): MasterTreeNode => {
    const normalizedName = organization.name.trim();
    const label = normalizedName.length > 0 ? normalizedName : organization.id;
    return {
      id: toFilemakerOrganizationNodeId(organization.id),
      type: 'file',
      kind: 'filemaker_organization',
      parentId: null,
      name: label,
      path: `organizations/${label}`,
      sortOrder: index,
      metadata: {
        entity: 'filemaker_organization',
        rawId: organization.id,
        address: formatFilemakerAddress(organization),
        taxId: organization.taxId ?? '',
        krs: organization.krs ?? '',
        tradingName: organization.tradingName ?? '',
        updatedAt: organization.updatedAt,
      },
    };
  });

export const buildFilemakerPersonMasterNodes = (persons: FilemakerPerson[]): MasterTreeNode[] => {
  const grouped = new Map<string, FilemakerPerson[]>();
  persons.forEach((person: FilemakerPerson): void => {
    const groupSource = person.lastName.trim().length > 0 ? person.lastName : person.firstName;
    const group = resolveInitialGroup(groupSource);
    grouped.set(group, [...(grouped.get(group) ?? []), person]);
  });

  const groups = Array.from(grouped.entries()).sort(([left], [right]) =>
    compareGroupLabels(left, right)
  );

  return groups.flatMap(([group, entries], groupIndex): MasterTreeNode[] => {
    const groupNodeId = toFilemakerPersonGroupNodeId(group);
    const sortedEntries = entries
      .slice()
      .sort((left: FilemakerPerson, right: FilemakerPerson) =>
        `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`)
      );
    return [
      buildGroupNode({
        id: groupNodeId,
        name: group,
        path: `persons/${group}`,
        sortOrder: groupIndex,
        count: sortedEntries.length,
        entity: 'filemaker_person',
      }),
      ...sortedEntries.map((person: FilemakerPerson, index): MasterTreeNode => {
        const normalizedName = `${person.firstName} ${person.lastName}`.trim();
        const label = normalizedName.length > 0 ? normalizedName : person.id;
        return {
          id: toFilemakerPersonNodeId(person.id),
          type: 'file',
          kind: 'filemaker_person',
          parentId: groupNodeId,
          name: label,
          path: `persons/${group}/${label}`,
          sortOrder: index,
          metadata: {
            entity: 'filemaker_person',
            rawId: person.id,
            address: formatFilemakerAddress(person),
            nip: person.nip,
            regon: person.regon,
            phoneNumbers: person.phoneNumbers.join(', '),
            updatedAt: person.updatedAt,
          },
        };
      }),
    ];
  });
};

export const buildFilemakerPersonListNodes = (persons: FilemakerPerson[]): MasterTreeNode[] =>
  persons.map((person: FilemakerPerson, index): MasterTreeNode => {
    const normalizedName = `${person.firstName} ${person.lastName}`.trim();
    const label = normalizedName.length > 0 ? normalizedName : person.id;
    return {
      id: toFilemakerPersonNodeId(person.id),
      type: 'file',
      kind: 'filemaker_person',
      parentId: null,
      name: label,
      path: `persons/${label}`,
      sortOrder: index,
      metadata: {
        entity: 'filemaker_person',
        rawId: person.id,
        address: formatFilemakerAddress(person),
        nip: person.nip,
        regon: person.regon,
        phoneNumbers: person.phoneNumbers.join(', '),
        updatedAt: person.updatedAt,
      },
    };
  });

export const buildFilemakerEventListNodes = (events: FilemakerEvent[]): MasterTreeNode[] =>
  events.map((event: FilemakerEvent, index): MasterTreeNode => {
    const normalizedName = event.eventName.trim();
    const label = normalizedName.length > 0 ? normalizedName : event.id;
    return {
      id: toFilemakerEventNodeId(event.id),
      type: 'file',
      kind: 'filemaker_event',
      parentId: null,
      name: label,
      path: `events/${label}`,
      sortOrder: index,
      metadata: {
        entity: 'filemaker_event',
        rawId: event.id,
        address: formatFilemakerAddress(event),
        updatedAt: event.updatedAt,
      },
    };
  });

export const buildFilemakerValueMasterNodes = (values: FilemakerValue[]): MasterTreeNode[] => {
  const ids = new Set(values.map((value: FilemakerValue): string => value.id));
  const parentIds = new Set(
    values
      .map((value: FilemakerValue): string | null | undefined => value.parentId)
      .filter((parentId): parentId is string => parentId !== null && parentId !== undefined)
      .filter((parentId: string): boolean => ids.has(parentId))
  );
  const sortedValues = values.slice().sort((left: FilemakerValue, right: FilemakerValue) => {
    if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
    return left.label.localeCompare(right.label);
  });

  return sortedValues.map((value: FilemakerValue): MasterTreeNode => {
    const parentId =
      value.parentId !== null && value.parentId !== undefined && ids.has(value.parentId)
        ? toFilemakerValueNodeId(value.parentId)
        : null;
    return {
      id: toFilemakerValueNodeId(value.id),
      type: parentIds.has(value.id) ? 'folder' : 'file',
      kind: 'filemaker_value',
      parentId,
      name: value.label,
      path: `values/${value.id}`,
      sortOrder: value.sortOrder,
      metadata: {
        entity: 'filemaker_value',
        rawId: value.id,
        value: value.value,
        description: value.description ?? '',
        updatedAt: value.updatedAt,
      },
    };
  });
};
