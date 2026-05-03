export type FilemakerPartySnapshotKind = 'event' | 'organization' | 'person';

export type FilemakerPartySnapshotCounts = {
  addresses: number;
  contactLogs: number;
  demands: number;
  emails: number;
  events: number;
  harvestProfiles: number;
  organizations: number;
  persons: number;
  total: number;
  websites: number;
};

export type FilemakerPartySnapshot = {
  counts: FilemakerPartySnapshotCounts;
  id: string;
  latestContactLogAt?: string;
  partyId: string;
  partyKind: FilemakerPartySnapshotKind;
  partyLegacyUuid?: string;
  partyName?: string;
  rebuiltAt: string;
  schemaVersion: 1;
};

export const createEmptyFilemakerPartySnapshotCounts = (): FilemakerPartySnapshotCounts => ({
  addresses: 0,
  contactLogs: 0,
  demands: 0,
  emails: 0,
  events: 0,
  harvestProfiles: 0,
  organizations: 0,
  persons: 0,
  total: 0,
  websites: 0,
});
