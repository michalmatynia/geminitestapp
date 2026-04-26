import type {
  FilemakerAudienceField,
  FilemakerAudienceOperator,
} from '@/shared/contracts/filemaker';

export type AudienceConditionFieldOption = {
  value: FilemakerAudienceField;
  label: string;
};

export const AUDIENCE_FIELD_OPTIONS: AudienceConditionFieldOption[] = [
  { value: 'organization.name', label: 'Organisation -> Name' },
  { value: 'organization.tradingName', label: 'Organisation -> Trading name / Title' },
  { value: 'organization.taxId', label: 'Organisation -> Tax ID' },
  { value: 'organization.krs', label: 'Organisation -> KRS' },
  { value: 'organization.city', label: 'Organisation -> City' },
  { value: 'organization.country', label: 'Organisation -> Country' },
  { value: 'organization.postalCode', label: 'Organisation -> Postal code' },
  { value: 'organization.street', label: 'Organisation -> Street' },
  { value: 'organization.demandValueId', label: 'Organisation -> Demand value' },
  { value: 'organization.demandLegacyValueUuid', label: 'Organisation -> Demand legacy UUID' },
  { value: 'organization.demandLabel', label: 'Organisation -> Demand label' },
  { value: 'organization.demandPath', label: 'Organisation -> Demand path' },
  { value: 'person.firstName', label: 'Person -> First name' },
  { value: 'person.lastName', label: 'Person -> Last name' },
  { value: 'person.city', label: 'Person -> City' },
  { value: 'person.country', label: 'Person -> Country' },
  { value: 'person.postalCode', label: 'Person -> Postal code' },
  { value: 'person.street', label: 'Person -> Street' },
  { value: 'person.nip', label: 'Person -> NIP' },
  { value: 'person.regon', label: 'Person -> REGON' },
  { value: 'person.phoneNumbers', label: 'Person -> Phone numbers (any)' },
  { value: 'email.address', label: 'Email -> Address' },
  { value: 'email.status', label: 'Email -> Status' },
  { value: 'organizationId', label: 'Membership -> Organisation ID' },
  { value: 'eventId', label: 'Membership -> Event ID' },
];

export type AudienceConditionOperatorOption = {
  value: FilemakerAudienceOperator;
  label: string;
};

export const AUDIENCE_OPERATOR_OPTIONS: AudienceConditionOperatorOption[] = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

export type AudienceConditionValueOption = {
  description?: string;
  group?: string;
  label: string;
  value: string;
};

export type AudienceConditionValueOptions = Partial<
  Record<FilemakerAudienceField, AudienceConditionValueOption[]>
>;

export const operatorTakesValue = (operator: FilemakerAudienceOperator): boolean =>
  operator !== 'is_empty' && operator !== 'is_not_empty';

export const resolveConditionValueOptions = (
  currentValue: string,
  rawValueOptions: AudienceConditionValueOption[]
): AudienceConditionValueOption[] => {
  if (
    currentValue.length === 0 ||
    rawValueOptions.some((option: AudienceConditionValueOption): boolean => option.value === currentValue)
  ) {
    return rawValueOptions;
  }
  return [
    {
      value: currentValue,
      label: `Current value (${currentValue})`,
    },
    ...rawValueOptions,
  ];
};
