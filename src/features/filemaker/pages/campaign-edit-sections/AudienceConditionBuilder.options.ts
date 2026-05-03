import type {
  FilemakerAudienceCondition,
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
  { value: 'organization.cooperationStatus', label: 'Organisation -> Cooperation status' },
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

const TEXT_OPERATORS: FilemakerAudienceOperator[] = [
  'contains',
  'equals',
  'not_equals',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
];

const EXACT_OPERATORS: FilemakerAudienceOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'is_empty',
  'is_not_empty',
];

const OPERATOR_OPTIONS_BY_VALUE = new Map<FilemakerAudienceOperator, AudienceConditionOperatorOption>(
  AUDIENCE_OPERATOR_OPTIONS.map((option) => [option.value, option])
);

const EXACT_FIELD_SET = new Set<FilemakerAudienceField>([
  'email.status',
  'eventId',
  'organization.cooperationStatus',
  'organization.demandLegacyValueUuid',
  'organization.demandPath',
  'organization.demandValueId',
  'organizationId',
]);

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

export const getAudienceOperatorsForField = (
  field: FilemakerAudienceField
): FilemakerAudienceOperator[] =>
  EXACT_FIELD_SET.has(field) ? EXACT_OPERATORS : TEXT_OPERATORS;

export const getAudienceOperatorOptionsForField = (
  field: FilemakerAudienceField
): AudienceConditionOperatorOption[] =>
  getAudienceOperatorsForField(field)
    .map((operator: FilemakerAudienceOperator): AudienceConditionOperatorOption | undefined =>
      OPERATOR_OPTIONS_BY_VALUE.get(operator)
    )
    .filter(
      (option: AudienceConditionOperatorOption | undefined): option is AudienceConditionOperatorOption =>
        option !== undefined
    );

export const getDefaultAudienceOperatorForField = (
  field: FilemakerAudienceField
): FilemakerAudienceOperator => getAudienceOperatorsForField(field)[0] ?? 'contains';

export const buildAudienceConditionForFieldChange = (
  condition: FilemakerAudienceCondition,
  field: FilemakerAudienceField
): FilemakerAudienceCondition => {
  const supportedOperators = getAudienceOperatorsForField(field);
  const operator = supportedOperators.includes(condition.operator)
    ? condition.operator
    : getDefaultAudienceOperatorForField(field);
  return {
    ...condition,
    field,
    operator,
    value: '',
  };
};

export const buildAudienceConditionForOperatorChange = (
  condition: FilemakerAudienceCondition,
  operator: FilemakerAudienceOperator
): FilemakerAudienceCondition => ({
  ...condition,
  operator,
  value: operatorTakesValue(operator) ? condition.value : '',
});

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
