export type FilemakerEntityKind = 'person' | 'organization';

export type FilemakerPartyReference = {
  kind: FilemakerEntityKind;
  id: string;
};

export type FilemakerPerson = {
  id: string;
  firstName: string;
  lastName: string;
  fullAddress: string;
  nip: string;
  regon: string;
  phoneNumbers: string[];
  createdAt: string;
  updatedAt: string;
};

export type FilemakerOrganization = {
  id: string;
  name: string;
  fullAddress: string;
  createdAt: string;
  updatedAt: string;
};

export type FilemakerDatabase = {
  version: 1;
  persons: FilemakerPerson[];
  organizations: FilemakerOrganization[];
};

export type FilemakerPartyOption = {
  value: string;
  label: string;
  description?: string;
};
