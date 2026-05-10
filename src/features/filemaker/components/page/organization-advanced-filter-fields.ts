import {
  ORGANIZATION_ADVANCED_BOOLEAN_FIELDS,
  ORGANIZATION_ADVANCED_DATE_FIELDS,
  type OrganizationAdvancedFilterField,
  type OrganizationAdvancedFilterOperator,
} from '../../filemaker-organization-advanced-filters';

export type OrganizationAdvancedFieldKind = 'string' | 'date' | 'boolean';

export type OrganizationAdvancedFilterFieldConfig = {
  field: OrganizationAdvancedFilterField;
  kind: OrganizationAdvancedFieldKind;
  label: string;
  operators: readonly OrganizationAdvancedFilterOperator[];
};

const STRING_OPERATORS: readonly OrganizationAdvancedFilterOperator[] = [
  'contains',
  'eq',
  'neq',
  'in',
  'notIn',
  'isEmpty',
  'isNotEmpty',
];

const DATE_OPERATORS: readonly OrganizationAdvancedFilterOperator[] = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'isEmpty',
  'isNotEmpty',
];

const BOOLEAN_OPERATORS: readonly OrganizationAdvancedFilterOperator[] = ['eq', 'neq'];

const createStringFieldConfig = (
  field: OrganizationAdvancedFilterField,
  label: string
): OrganizationAdvancedFilterFieldConfig => ({
  field,
  kind: 'string',
  label,
  operators: STRING_OPERATORS,
});

export const DEFAULT_ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIG =
  createStringFieldConfig('name', 'Name');

export const ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIGS: readonly OrganizationAdvancedFilterFieldConfig[] =
  [
    createStringFieldConfig('id', 'Organisation ID'),
    DEFAULT_ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIG,
    createStringFieldConfig('tradingName', 'Trading Name'),
    createStringFieldConfig('taxId', 'NIP / Tax ID'),
    createStringFieldConfig('krs', 'KRS'),
    createStringFieldConfig('cooperationStatus', 'Cooperation Status'),
    createStringFieldConfig('city', 'City'),
    createStringFieldConfig('street', 'Street'),
    createStringFieldConfig('postalCode', 'Postal Code'),
    createStringFieldConfig('country', 'Country'),
    createStringFieldConfig('countryId', 'Country ID'),
    createStringFieldConfig('legacyUuid', 'Legacy UUID'),
    createStringFieldConfig('legacyParentUuid', 'Legacy Parent UUID'),
    createStringFieldConfig('updatedBy', 'Updated By'),
    createStringFieldConfig('jobBoardSourceSite', 'Job-board Source Portal'),
    createStringFieldConfig('jobBoardSourceLabel', 'Job-board Source Label'),
    createStringFieldConfig('jobBoardSourceUrl', 'Job-board Source URL'),
    { field: 'createdAt', kind: 'date', label: 'Created At', operators: DATE_OPERATORS },
    { field: 'updatedAt', kind: 'date', label: 'Updated At', operators: DATE_OPERATORS },
    {
      field: 'establishedDate',
      kind: 'date',
      label: 'Established Date',
      operators: DATE_OPERATORS,
    },
    {
      field: 'jobBoardScrapedAt',
      kind: 'date',
      label: 'Job-board Scraped At',
      operators: DATE_OPERATORS,
    },
    { field: 'hasAddress', kind: 'boolean', label: 'Has Address', operators: BOOLEAN_OPERATORS },
    { field: 'hasBank', kind: 'boolean', label: 'Has Bank', operators: BOOLEAN_OPERATORS },
    {
      field: 'hasParent',
      kind: 'boolean',
      label: 'Has Parent Organisation',
      operators: BOOLEAN_OPERATORS,
    },
  ];

export const ORGANIZATION_ADVANCED_OPERATOR_LABELS: Record<
  OrganizationAdvancedFilterOperator,
  string
> = {
  between: 'Between',
  contains: 'Contains',
  eq: 'Equals',
  gt: 'Greater Than',
  gte: 'Greater Than or Equal',
  in: 'In',
  isEmpty: 'Is Empty',
  isNotEmpty: 'Is Not Empty',
  lt: 'Less Than',
  lte: 'Less Than or Equal',
  neq: 'Not Equal',
  notIn: 'Not In',
};

export const ORGANIZATION_ADVANCED_BOOLEAN_OPTIONS = [
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
] as const;

export const getOrganizationAdvancedFieldConfig = (
  field: OrganizationAdvancedFilterField
): OrganizationAdvancedFilterFieldConfig =>
  ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIGS.find(
    (config: OrganizationAdvancedFilterFieldConfig): boolean => config.field === field
  ) ?? DEFAULT_ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIG;

export const getDefaultOperatorForOrganizationField = (
  field: OrganizationAdvancedFilterField
): OrganizationAdvancedFilterOperator =>
  getOrganizationAdvancedFieldConfig(field).operators[0] ?? 'contains';

export const supportsOrganizationAdvancedOperator = (
  field: OrganizationAdvancedFilterField,
  operator: OrganizationAdvancedFilterOperator
): boolean => getOrganizationAdvancedFieldConfig(field).operators.includes(operator);

export const normalizeOrganizationConditionValue = (
  kind: OrganizationAdvancedFieldKind,
  value: string
): string | boolean => {
  if (kind === 'boolean') return value.trim().toLowerCase() === 'true';
  return value;
};

export const serializeOrganizationMultiValue = (
  values: Array<string | number | boolean | null> | undefined
): string => {
  if (!Array.isArray(values)) return '';
  return values
    .map((value: string | number | boolean | null): string =>
      value === null ? '' : String(value).trim()
    )
    .filter((value: string): boolean => value.length > 0)
    .join(', ');
};

export const normalizeOrganizationMultiValueInput = (
  kind: OrganizationAdvancedFieldKind,
  rawValue: string
): Array<string | boolean> =>
  rawValue
    .split(',')
    .map((part: string): string => part.trim())
    .filter((part: string): boolean => part.length > 0)
    .map((part: string): string | boolean => normalizeOrganizationConditionValue(kind, part));

export const getOrganizationAdvancedInputType = (
  field: OrganizationAdvancedFilterField
): 'date' | 'text' =>
  ORGANIZATION_ADVANCED_DATE_FIELDS.has(field) &&
  !ORGANIZATION_ADVANCED_BOOLEAN_FIELDS.has(field)
    ? 'date'
    : 'text';
