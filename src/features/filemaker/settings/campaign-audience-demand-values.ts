import type {
  FilemakerDatabase,
  FilemakerOrganization,
  FilemakerOrganizationLegacyDemand,
  FilemakerValue,
} from '../types';
import { normalizeString } from '../filemaker-settings.helpers';

export type OrganizationDemandConditionValues = {
  labels: string[];
  legacyValueUuids: string[];
  paths: string[];
  valueIds: string[];
};

export const EMPTY_ORGANIZATION_DEMAND_VALUES: OrganizationDemandConditionValues = {
  labels: [],
  legacyValueUuids: [],
  paths: [],
  valueIds: [],
};

const addUniqueNormalizedValue = (target: string[], value: string | null | undefined): void => {
  const normalizedValue = normalizeString(value);
  if (normalizedValue.length === 0 || target.includes(normalizedValue)) return;
  target.push(normalizedValue);
};

const resolveDemandValueLabel = (
  value: FilemakerValue | null | undefined,
  fallback: string
): string => {
  const label = normalizeString(value?.label);
  if (label.length > 0) return label;
  const rawValue = normalizeString(value?.value);
  if (rawValue.length > 0) return rawValue;
  return fallback;
};

const createOrganizationDemandConditionValues = (): OrganizationDemandConditionValues => ({
  labels: [],
  legacyValueUuids: [],
  paths: [],
  valueIds: [],
});

export const buildOrganizationDemandValuesById = (
  database: FilemakerDatabase
): Map<string, OrganizationDemandConditionValues> => {
  const valuesById = new Map<string, FilemakerValue>(
    database.values.map((value: FilemakerValue): [string, FilemakerValue] => [value.id, value])
  );
  const demandsByOrganizationId = new Map<string, OrganizationDemandConditionValues>();

  database.organizationLegacyDemands.forEach(
    (demand: FilemakerOrganizationLegacyDemand): void => {
      const organizationId = normalizeString(demand.organizationId);
      const pathValueIds = demand.valueIds
        .map((valueId: string): string => normalizeString(valueId))
        .filter((valueId: string): boolean => valueId.length > 0);
      if (organizationId.length === 0 || pathValueIds.length === 0) return;

      const current =
        demandsByOrganizationId.get(organizationId) ??
        createOrganizationDemandConditionValues();
      const pathLabels: string[] = [];

      pathValueIds.forEach((valueId: string): void => {
        const value = valuesById.get(valueId);
        const label = resolveDemandValueLabel(value, valueId);
        addUniqueNormalizedValue(current.valueIds, valueId);
        addUniqueNormalizedValue(current.legacyValueUuids, value?.legacyUuid);
        addUniqueNormalizedValue(current.labels, label);
        pathLabels.push(label);
      });

      addUniqueNormalizedValue(current.paths, pathValueIds.join('>'));
      addUniqueNormalizedValue(current.paths, pathLabels.join(' > '));
      demandsByOrganizationId.set(organizationId, current);
    }
  );

  return demandsByOrganizationId;
};

export const resolveOrganizationDemandValues = (
  organizationDemandValuesById: Map<string, OrganizationDemandConditionValues>,
  organization: FilemakerOrganization | null
): OrganizationDemandConditionValues => {
  if (organization === null) return EMPTY_ORGANIZATION_DEMAND_VALUES;
  return (
    organizationDemandValuesById.get(organization.id) ?? EMPTY_ORGANIZATION_DEMAND_VALUES
  );
};
