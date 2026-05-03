export type FilemakerContractPartyKind = 'event' | 'organization' | 'person';

export type FilemakerContractEventLink = {
  city?: string;
  contractId: string;
  createdAt?: string;
  createdBy?: string;
  endDate?: string;
  eventId?: string;
  eventName?: string;
  id: string;
  legacyContractUuid: string;
  legacyCountryUuid?: string;
  legacyEventInstanceUuid?: string;
  legacyEventUuid: string;
  legacyUuid?: string;
  startDate?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type FilemakerContractPersonLink = {
  contractId: string;
  createdAt?: string;
  createdBy?: string;
  id: string;
  legacyContractUuid: string;
  legacyPersonUuid: string;
  legacyStatusUuid?: string;
  legacyUuid?: string;
  personId?: string;
  personName?: string;
  statusLabel?: string;
  statusValueId?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type FilemakerContract = {
  createdAt?: string;
  eventLinks: FilemakerContractEventLink[];
  firstEventEndDate?: string;
  firstEventName?: string;
  firstEventStartDate?: string;
  id: string;
  legacyOnBehalfUuid?: string;
  legacyUuid: string;
  onBehalfId?: string;
  onBehalfKind?: FilemakerContractPartyKind;
  onBehalfName?: string;
  personLinks: FilemakerContractPersonLink[];
  updatedAt?: string;
  updatedBy?: string;
};
