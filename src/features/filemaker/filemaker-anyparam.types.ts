export type FilemakerAnyParamOwnerKind = 'event' | 'organization' | 'person';

export type FilemakerAnyParamValue = {
  label?: string;
  legacyValueUuid: string;
  level: number;
  parentId?: string | null;
  valueId?: string;
};

export type FilemakerAnyParamTextValue = {
  field: string;
  slot: number;
  value: string;
};

export type FilemakerAnyParam = {
  createdAt?: string;
  createdBy?: string;
  id: string;
  legacyOwnerUuid: string;
  legacyUuid: string;
  legacyValueUuids: string[];
  ownerId?: string;
  ownerKind?: FilemakerAnyParamOwnerKind;
  ownerName?: string;
  textValues: FilemakerAnyParamTextValue[];
  updatedAt?: string;
  updatedBy?: string;
  valueIds: string[];
  values: FilemakerAnyParamValue[];
};
