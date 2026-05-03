export type FilemakerOrganizationDemandValue = {
  label?: string;
  legacyValueUuid: string;
  level: number;
  parentId?: string | null;
  valueId?: string;
};

export type FilemakerOrganizationProfileValue = FilemakerOrganizationDemandValue;

export type FilemakerOrganizationImportedDemand = {
  createdAt?: string;
  createdBy?: string;
  id: string;
  legacyOrganizationUuid: string;
  legacyUuid: string;
  legacyValueUuids: string[];
  organizationId?: string;
  organizationName?: string;
  updatedAt?: string;
  updatedBy?: string;
  valueIds: string[];
  values: FilemakerOrganizationDemandValue[];
};

export type FilemakerOrganizationImportedProfile = {
  createdAt?: string;
  createdBy?: string;
  id: string;
  legacyOrganizationUuid: string;
  legacyUuid: string;
  legacyValueUuids: string[];
  organizationId?: string;
  organizationName?: string;
  updatedAt?: string;
  updatedBy?: string;
  valueIds: string[];
  values: FilemakerOrganizationProfileValue[];
};

export type FilemakerOrganizationHarvestProfile = {
  createdAt?: string;
  createdBy?: string;
  id: string;
  legacyOrganizationUuid: string;
  legacyUuid: string;
  organizationId?: string;
  organizationName?: string;
  owner?: string;
  pageDescription?: string;
  pageKeywords?: string;
  pageTitle?: string;
  updatedAt?: string;
  updatedBy?: string;
};
