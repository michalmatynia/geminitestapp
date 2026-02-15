export type FilemakerEntityKind = 'person' | 'organization';

export type FilemakerPartyReference = {
  kind: FilemakerEntityKind;
  id: string;
};

export type FilemakerPerson = {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
  addressId: string;
  nip: string;
  regon: string;
  phoneNumbers: string[];
  createdAt: string;
  updatedAt: string;
};

export type FilemakerOrganization = {
  id: string;
  name: string;
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
  addressId: string;
  createdAt: string;
  updatedAt: string;
};

export type FilemakerAddress = {
  id: string;
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
  createdAt: string;
  updatedAt: string;
};

export type FilemakerDatabase = {
  version: 2;
  persons: FilemakerPerson[];
  organizations: FilemakerOrganization[];
  addresses: FilemakerAddress[];
};

export type FilemakerPartyOption = {
  value: string;
  label: string;
  description?: string;
};
