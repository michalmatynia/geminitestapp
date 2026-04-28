/* eslint-disable complexity, max-lines */

import { formatFilemakerAddress } from './settings';

import type { MongoFilemakerInvoice } from './pages/AdminFilemakerInvoicesPage.types';
import type {
  FilemakerEvent,
  FilemakerJobListing,
  FilemakerOrganization,
  FilemakerPerson,
  FilemakerValue,
} from './types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const ORGANIZATION_GROUP_NODE_PREFIX = 'filemaker-organization-group:';
const ORGANIZATION_NODE_PREFIX = 'filemaker-organization:';
const ORGANIZATION_EVENTS_FOLDER_NODE_PREFIX = 'filemaker-organization-events-folder:';
const ORGANIZATION_JOBS_FOLDER_NODE_PREFIX = 'filemaker-organization-jobs-folder:';
const ORGANIZATION_EVENT_NODE_PREFIX = 'filemaker-organization-event:';
const ORGANIZATION_JOB_LISTING_NODE_PREFIX = 'filemaker-organization-job-listing:';
const EVENT_NODE_PREFIX = 'filemaker-event:';
const INVOICE_NODE_PREFIX = 'filemaker-invoice:';
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

export const toFilemakerOrganizationEventsFolderNodeId = (organizationId: string): string =>
  `${ORGANIZATION_EVENTS_FOLDER_NODE_PREFIX}${encodeNodePart(organizationId)}`;

export const toFilemakerOrganizationJobsFolderNodeId = (organizationId: string): string =>
  `${ORGANIZATION_JOBS_FOLDER_NODE_PREFIX}${encodeNodePart(organizationId)}`;

export const toFilemakerOrganizationEventNodeId = (
  organizationId: string,
  eventId: string
): string =>
  `${ORGANIZATION_EVENT_NODE_PREFIX}${encodeNodePart(organizationId)}:${encodeNodePart(eventId)}`;

export const fromFilemakerOrganizationEventNodeId = (
  nodeId: string
): { organizationId: string; eventId: string } | null => {
  if (!nodeId.startsWith(ORGANIZATION_EVENT_NODE_PREFIX)) return null;
  const [organizationId, eventId] = nodeId
    .slice(ORGANIZATION_EVENT_NODE_PREFIX.length)
    .split(':')
    .map(decodeNodePart);
  if (
    organizationId === undefined ||
    organizationId.length === 0 ||
    eventId === undefined ||
    eventId.length === 0
  ) {
    return null;
  }
  return { eventId, organizationId };
};

export const toFilemakerOrganizationJobListingNodeId = (
  organizationId: string,
  jobListingId: string
): string =>
  `${ORGANIZATION_JOB_LISTING_NODE_PREFIX}${encodeNodePart(organizationId)}:${encodeNodePart(jobListingId)}`;

export const fromFilemakerOrganizationJobListingNodeId = (
  nodeId: string
): { organizationId: string; jobListingId: string } | null => {
  if (!nodeId.startsWith(ORGANIZATION_JOB_LISTING_NODE_PREFIX)) return null;
  const [organizationId, jobListingId] = nodeId
    .slice(ORGANIZATION_JOB_LISTING_NODE_PREFIX.length)
    .split(':')
    .map(decodeNodePart);
  if (
    organizationId === undefined ||
    organizationId.length === 0 ||
    jobListingId === undefined ||
    jobListingId.length === 0
  ) {
    return null;
  }
  return { jobListingId, organizationId };
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

export const toFilemakerInvoiceNodeId = (invoiceId: string): string =>
  `${INVOICE_NODE_PREFIX}${encodeNodePart(invoiceId)}`;

export const fromFilemakerInvoiceNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(INVOICE_NODE_PREFIX)) return null;
  return decodeNodePart(nodeId.slice(INVOICE_NODE_PREFIX.length));
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

export type FilemakerOrganizationTreeRelations = {
  eventsByOrganizationId?: ReadonlyMap<string, readonly FilemakerEvent[]>;
  jobListingsByOrganizationId?: ReadonlyMap<string, readonly FilemakerJobListing[]>;
};

const buildOrganizationRelationFolderNode = (input: {
  count: number;
  id: string;
  name: string;
  organizationNodeId: string;
  path: string;
  sortOrder: number;
  entity: string;
}): MasterTreeNode => ({
  id: input.id,
  type: 'folder',
  kind: input.entity,
  parentId: input.organizationNodeId,
  name: input.name,
  path: input.path,
  sortOrder: input.sortOrder,
  metadata: {
    count: input.count,
    entity: input.entity,
  },
});

const buildOrganizationEventNodes = (input: {
  events: readonly FilemakerEvent[];
  eventsFolderNodeId: string;
  organizationId: string;
  organizationPath: string;
}): MasterTreeNode[] =>
  input.events
    .slice()
    .sort((left: FilemakerEvent, right: FilemakerEvent): number =>
      left.eventName.localeCompare(right.eventName)
    )
    .map((event: FilemakerEvent, index: number): MasterTreeNode => {
      const label = event.eventName.trim().length > 0 ? event.eventName : event.id;
      return {
        id: toFilemakerOrganizationEventNodeId(input.organizationId, event.id),
        type: 'file',
        kind: 'filemaker_organization_event_link',
        parentId: input.eventsFolderNodeId,
        name: label,
        path: `${input.organizationPath}/events/${label}`,
        sortOrder: index,
        metadata: {
          city: event.city,
          entity: 'filemaker_organization_event_link',
          organizationId: input.organizationId,
          rawId: event.id,
          updatedAt: event.updatedAt,
        },
      };
    });

const buildOrganizationJobListingNodes = (input: {
  jobListings: readonly FilemakerJobListing[];
  jobsFolderNodeId: string;
  organizationId: string;
  organizationPath: string;
}): MasterTreeNode[] =>
  input.jobListings
    .slice()
    .sort((left: FilemakerJobListing, right: FilemakerJobListing): number =>
      left.title.localeCompare(right.title)
    )
    .map((listing: FilemakerJobListing, index: number): MasterTreeNode => {
      const label = listing.title.trim().length > 0 ? listing.title : listing.id;
      return {
        id: toFilemakerOrganizationJobListingNodeId(input.organizationId, listing.id),
        type: 'file',
        kind: 'filemaker_organization_job_listing_link',
        parentId: input.jobsFolderNodeId,
        name: label,
        path: `${input.organizationPath}/jobs/${label}`,
        sortOrder: index,
        metadata: {
          entity: 'filemaker_organization_job_listing_link',
          location: listing.location ?? '',
          organizationId: input.organizationId,
          rawId: listing.id,
          status: listing.status,
          updatedAt: listing.updatedAt,
        },
      };
    });

const buildOrganizationRelationNodes = (input: {
  events: readonly FilemakerEvent[];
  jobListings: readonly FilemakerJobListing[];
  organizationId: string;
  organizationNodeId: string;
  organizationPath: string;
}): MasterTreeNode[] => {
  const relationNodes: MasterTreeNode[] = [];
  if (input.events.length > 0) {
    const eventsFolderNodeId = toFilemakerOrganizationEventsFolderNodeId(input.organizationId);
    relationNodes.push(
      buildOrganizationRelationFolderNode({
        count: input.events.length,
        entity: 'filemaker_organization_events_folder',
        id: eventsFolderNodeId,
        name: 'Events',
        organizationNodeId: input.organizationNodeId,
        path: `${input.organizationPath}/events`,
        sortOrder: 0,
      }),
      ...buildOrganizationEventNodes({
        events: input.events,
        eventsFolderNodeId,
        organizationId: input.organizationId,
        organizationPath: input.organizationPath,
      })
    );
  }
  if (input.jobListings.length > 0) {
    const jobsFolderNodeId = toFilemakerOrganizationJobsFolderNodeId(input.organizationId);
    relationNodes.push(
      buildOrganizationRelationFolderNode({
        count: input.jobListings.length,
        entity: 'filemaker_organization_jobs_folder',
        id: jobsFolderNodeId,
        name: 'Jobs',
        organizationNodeId: input.organizationNodeId,
        path: `${input.organizationPath}/jobs`,
        sortOrder: 1,
      }),
      ...buildOrganizationJobListingNodes({
        jobListings: input.jobListings,
        jobsFolderNodeId,
        organizationId: input.organizationId,
        organizationPath: input.organizationPath,
      })
    );
  }
  return relationNodes;
};

export const buildFilemakerOrganizationListNodes = (
  organizations: FilemakerOrganization[],
  relations: FilemakerOrganizationTreeRelations = {}
): MasterTreeNode[] =>
  organizations.flatMap((organization: FilemakerOrganization, index): MasterTreeNode[] => {
    const normalizedName = organization.name.trim();
    const label = normalizedName.length > 0 ? normalizedName : organization.id;
    const organizationNodeId = toFilemakerOrganizationNodeId(organization.id);
    const events = relations.eventsByOrganizationId?.get(organization.id) ?? [];
    const jobListings = relations.jobListingsByOrganizationId?.get(organization.id) ?? [];
    const hasRelations = events.length > 0 || jobListings.length > 0;
    const organizationPath = `organizations/${label}`;
    return [
      {
        id: organizationNodeId,
        type: hasRelations ? 'folder' : 'file',
        kind: 'filemaker_organization',
        parentId: null,
        name: label,
        path: organizationPath,
        sortOrder: index,
        metadata: {
          entity: 'filemaker_organization',
          rawId: organization.id,
          address: formatFilemakerAddress(organization),
          eventCount: events.length,
          jobListingCount: jobListings.length,
          taxId: organization.taxId ?? '',
          krs: organization.krs ?? '',
          tradingName: organization.tradingName ?? '',
          updatedAt: organization.updatedAt,
        },
      },
      ...buildOrganizationRelationNodes({
        events,
        jobListings,
        organizationId: organization.id,
        organizationNodeId,
        organizationPath,
      }),
    ];
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

export const buildFilemakerInvoiceListNodes = (
  invoices: MongoFilemakerInvoice[]
): MasterTreeNode[] =>
  invoices.map((invoice: MongoFilemakerInvoice, index): MasterTreeNode => {
    const invoiceNo = invoice.invoiceNo?.trim() ?? '';
    const signature = invoice.signature?.trim() ?? '';
    let label = invoice.id;
    if (signature.length > 0) label = signature;
    if (invoiceNo.length > 0) label = invoiceNo;
    return {
      id: toFilemakerInvoiceNodeId(invoice.id),
      type: 'file',
      kind: 'filemaker_invoice',
      parentId: null,
      name: label,
      path: `invoices/${label}`,
      sortOrder: index,
      metadata: {
        entity: 'filemaker_invoice',
        rawId: invoice.id,
        buyer: invoice.organizationBName ?? '',
        seller: invoice.organizationSName ?? '',
        issueDate: invoice.issueDate ?? '',
        paymentDue: invoice.cPaymentDue ?? '',
        sum: invoice.servicesSum ?? '',
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
