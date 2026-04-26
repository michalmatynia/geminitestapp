import type {
  FilemakerDatabase,
  FilemakerEvent,
  FilemakerOrganizationLegacyDemand,
  FilemakerOrganization,
  FilemakerPerson,
  FilemakerValue,
} from '../../types';
import type {
  AudienceConditionValueOption,
  AudienceConditionValueOptions,
} from './AudienceConditionBuilder.options';

const normalizeOptionText = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const resolveValueLabel = (value: FilemakerValue | null | undefined, fallback: string): string => {
  const label = normalizeOptionText(value?.label);
  if (label.length > 0) return label;
  const rawValue = normalizeOptionText(value?.value);
  if (rawValue.length > 0) return rawValue;
  return fallback;
};

const buildValuesById = (database: FilemakerDatabase): Map<string, FilemakerValue> =>
  new Map(database.values.map((value: FilemakerValue): [string, FilemakerValue] => [value.id, value]));

const collectDemandValueIds = (database: FilemakerDatabase): Set<string> => {
  const valueIds = new Set<string>();
  database.organizationLegacyDemands.forEach(
    (demand: FilemakerOrganizationLegacyDemand): void => {
      demand.valueIds.forEach((valueId: string): void => {
        const normalizedValueId = normalizeOptionText(valueId);
        if (normalizedValueId.length > 0) valueIds.add(normalizedValueId);
      });
    }
  );
  return valueIds;
};

const sortConditionOptions = (
  options: AudienceConditionValueOption[]
): AudienceConditionValueOption[] =>
  options.sort((left, right) => left.label.localeCompare(right.label));

const addUniqueOption = (
  optionsByValue: Map<string, AudienceConditionValueOption>,
  option: AudienceConditionValueOption
): void => {
  const normalizedValue = normalizeOptionText(option.value);
  if (normalizedValue.length === 0 || optionsByValue.has(normalizedValue)) return;
  optionsByValue.set(normalizedValue, {
    ...option,
    value: normalizedValue,
  });
};

const buildUniqueTextOptions = (
  rawOptions: AudienceConditionValueOption[]
): AudienceConditionValueOption[] => {
  const optionsByValue = new Map<string, AudienceConditionValueOption>();
  rawOptions.forEach((option: AudienceConditionValueOption): void => {
    addUniqueOption(optionsByValue, option);
  });
  return sortConditionOptions(Array.from(optionsByValue.values()));
};

const buildOrganizationTextOptions = (
  database: FilemakerDatabase,
  field: 'city' | 'country' | 'cooperationStatus'
): AudienceConditionValueOption[] =>
  buildUniqueTextOptions(
    database.organizations.map((organization: FilemakerOrganization) => {
      const value = normalizeOptionText(organization[field]);
      return {
        value,
        label: value,
        group: field === 'cooperationStatus' ? 'Cooperation status' : undefined,
      };
    })
  );

const buildPersonTextOptions = (
  database: FilemakerDatabase,
  field: 'city' | 'country'
): AudienceConditionValueOption[] =>
  buildUniqueTextOptions(
    database.persons.map((person: FilemakerPerson) => {
      const value = normalizeOptionText(person[field]);
      return {
        value,
        label: value,
      };
    })
  );

const buildEventIdOptions = (database: FilemakerDatabase): AudienceConditionValueOption[] =>
  sortConditionOptions(
    database.events.map((event: FilemakerEvent): AudienceConditionValueOption => {
      const eventName = normalizeOptionText(event.eventName);
      return {
        value: event.id,
        label: eventName.length > 0 ? eventName : event.id,
        description: event.id,
      };
    })
  );

const buildDemandValueOptions = (database: FilemakerDatabase): AudienceConditionValueOption[] => {
  const valuesById = buildValuesById(database);
  return sortConditionOptions(
    Array.from(collectDemandValueIds(database)).map((valueId: string) => {
      const value = valuesById.get(valueId);
      const legacyUuid = normalizeOptionText(value?.legacyUuid);
      return {
        value: valueId,
        label: resolveValueLabel(value, valueId),
        description: legacyUuid.length > 0 ? `Legacy UUID: ${legacyUuid}` : valueId,
      };
    })
  );
};

const buildDemandLegacyUuidOptions = (
  database: FilemakerDatabase
): AudienceConditionValueOption[] => {
  const valuesById = buildValuesById(database);
  return sortConditionOptions(
    Array.from(collectDemandValueIds(database)).reduce<AudienceConditionValueOption[]>(
      (options: AudienceConditionValueOption[], valueId: string): AudienceConditionValueOption[] => {
        const value = valuesById.get(valueId);
        const legacyUuid = normalizeOptionText(value?.legacyUuid);
        if (legacyUuid.length === 0) return options;
        options.push({
          value: legacyUuid,
          label: resolveValueLabel(value, valueId),
          description: legacyUuid,
        });
        return options;
      },
      []
    )
  );
};

const buildDemandLabelOptions = (database: FilemakerDatabase): AudienceConditionValueOption[] => {
  const valuesById = buildValuesById(database);
  const labels = new Map<string, AudienceConditionValueOption>();
  collectDemandValueIds(database).forEach((valueId: string): void => {
    const label = resolveValueLabel(valuesById.get(valueId), valueId);
    if (!labels.has(label)) labels.set(label, { value: label, label });
  });
  return sortConditionOptions(Array.from(labels.values()));
};

const buildDemandPathOptions = (database: FilemakerDatabase): AudienceConditionValueOption[] => {
  const valuesById = buildValuesById(database);
  const paths = new Map<string, AudienceConditionValueOption>();
  database.organizationLegacyDemands.forEach(
    (demand: FilemakerOrganizationLegacyDemand): void => {
      const valueIds = demand.valueIds
        .map((valueId: string): string => normalizeOptionText(valueId))
        .filter((valueId: string): boolean => valueId.length > 0);
      if (valueIds.length === 0) return;
      const pathValue = valueIds.join('>');
      if (paths.has(pathValue)) return;
      paths.set(pathValue, {
        value: pathValue,
        label: valueIds
          .map((valueId: string): string => resolveValueLabel(valuesById.get(valueId), valueId))
          .join(' > '),
        description: `${valueIds.length} level${valueIds.length === 1 ? '' : 's'}`,
      });
    }
  );
  return sortConditionOptions(Array.from(paths.values()));
};

export const buildAudienceConditionValueOptions = (
  database: FilemakerDatabase
): AudienceConditionValueOptions => ({
  'email.status': [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'bounced', label: 'Bounced' },
    { value: 'unverified', label: 'Unverified' },
  ],
  eventId: buildEventIdOptions(database),
  'organization.city': buildOrganizationTextOptions(database, 'city'),
  'organization.cooperationStatus': buildOrganizationTextOptions(database, 'cooperationStatus'),
  'organization.country': buildOrganizationTextOptions(database, 'country'),
  'organization.demandLabel': buildDemandLabelOptions(database),
  'organization.demandLegacyValueUuid': buildDemandLegacyUuidOptions(database),
  'organization.demandPath': buildDemandPathOptions(database),
  'organization.demandValueId': buildDemandValueOptions(database),
  'person.city': buildPersonTextOptions(database, 'city'),
  'person.country': buildPersonTextOptions(database, 'country'),
});
