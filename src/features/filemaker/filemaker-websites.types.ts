export type FilemakerWebsitePartyKind = 'event' | 'organization' | 'person';

export type MongoFilemakerWebsite = {
  createdAt?: string;
  host?: string;
  id: string;
  legacyTypeRaw?: string;
  legacyUuid?: string;
  legacyUuids: string[];
  normalizedUrl?: string;
  socialPlatform?: string;
  updatedAt?: string;
  updatedBy?: string;
  url: string;
  websiteKind?: 'official' | 'social' | 'other';
};

export type MongoFilemakerWebsiteLink = {
  createdAt?: string;
  createdBy?: string;
  id: string;
  legacyJoinUuid?: string;
  legacyOwnerUuid: string;
  ownerName?: string;
  partyId: string;
  partyKind: FilemakerWebsitePartyKind;
  updatedAt?: string;
  updatedBy?: string;
  websiteId: string;
};

export type MongoFilemakerWebsiteSummary = MongoFilemakerWebsite & {
  eventLinkCount: number;
  linkCount: number;
  organizationLinkCount: number;
  personLinkCount: number;
};

export type MongoFilemakerWebsiteDetail = MongoFilemakerWebsiteSummary & {
  links: MongoFilemakerWebsiteLink[];
};

export type WebsiteLinkFilter =
  | 'all'
  | 'with_links'
  | 'without_links'
  | 'organizations'
  | 'persons'
  | 'events';

export type MongoFilemakerWebsitesResponse = {
  collectionCount: number;
  filters: {
    links: WebsiteLinkFilter;
  };
  limit: number;
  page: number;
  pageSize: number;
  query: string;
  totalCount: number;
  totalPages: number;
  websites: MongoFilemakerWebsiteSummary[];
};
