export type FilemakerPersonOccupationValue = {
  label?: string;
  legacyValueUuid: string;
  level: number;
  parentId?: string | null;
  valueId?: string;
};

export type FilemakerPersonOccupation = {
  createdAt?: string;
  createdBy?: string;
  id: string;
  legacyPersonUuid: string;
  legacyUuid: string;
  legacyValueUuids: string[];
  personId?: string;
  personName?: string;
  updatedAt?: string;
  updatedBy?: string;
  valueIds: string[];
  values: FilemakerPersonOccupationValue[];
};
