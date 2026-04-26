export type MongoFilemakerContactLogValueKind =
  | 'contactType'
  | 'mailCampaign'
  | 'mailServer'
  | 'onBehalf'
  | 'yearProspect';

export type MongoFilemakerContactLogValue = {
  kind: MongoFilemakerContactLogValueKind;
  label?: string;
  legacyValueUuid: string;
  parentId?: string | null;
  valueId?: string;
};

export type MongoFilemakerContactLogParty = {
  legacyOwnerUuid: string;
  ownerName?: string;
  partyId: string;
  partyKind: 'event' | 'organization' | 'person';
};

export type MongoFilemakerContactLog = {
  comment?: string;
  contactTypeLabel?: string;
  createdAt?: string;
  dateEntered?: string;
  id: string;
  legacyContactTypeUuid?: string;
  legacyFilemakerId?: string;
  legacyOrganizationUuid?: string;
  legacyOwnerUuids: string[];
  legacyParentUuid?: string;
  legacyUuid: string;
  linkedParties: MongoFilemakerContactLogParty[];
  mailCampaignLabel?: string;
  mailServerLabel?: string;
  onBehalfLabel?: string;
  ownerName?: string;
  updatedAt?: string;
  updatedBy?: string;
  values: MongoFilemakerContactLogValue[];
  yearProspectLabel?: string;
};

export type MongoFilemakerContactLogsResponse = {
  contactLogs: MongoFilemakerContactLog[];
  limit: number;
  page: number;
  pageSize: number;
  query: string;
  totalCount: number;
  totalPages: number;
};
