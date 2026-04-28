/* eslint-disable complexity, max-lines */
import {
  ORGANIZATION_ADVANCED_FILTER_MAX_DEPTH,
  ORGANIZATION_ADVANCED_BOOLEAN_FIELDS,
  ORGANIZATION_ADVANCED_DATE_FIELDS,
  organizationAdvancedFilterGroupSchema,
  organizationAdvancedFilterPresetBundleSchema,
  organizationAdvancedFilterPresetSchema,
  type OrganizationAdvancedFilterCondition,
  type OrganizationAdvancedFilterField,
  type OrganizationAdvancedFilterGroup,
  type OrganizationAdvancedFilterOperator,
  type OrganizationAdvancedFilterPreset,
  type OrganizationAdvancedFilterPresetBundle,
  type OrganizationAdvancedFilterRule,
} from '../../filemaker-organization-advanced-filters';

export type OrganizationAdvancedFieldKind = 'string' | 'date' | 'boolean';

type ClipboardLike = {
  writeText?: (value: string) => Promise<void>;
};

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
    { field: 'createdAt', kind: 'date', label: 'Created At', operators: DATE_OPERATORS },
    { field: 'updatedAt', kind: 'date', label: 'Updated At', operators: DATE_OPERATORS },
    {
      field: 'establishedDate',
      kind: 'date',
      label: 'Established Date',
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

export const createOrganizationAdvancedRuleId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `organization_filter_rule_${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
};

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

export const createEmptyOrganizationCondition = (
  field: OrganizationAdvancedFilterField = DEFAULT_ORGANIZATION_ADVANCED_FILTER_FIELD_CONFIG.field
): OrganizationAdvancedFilterCondition => ({
  field,
  id: createOrganizationAdvancedRuleId(),
  operator: getDefaultOperatorForOrganizationField(field),
  type: 'condition',
});

export const createEmptyOrganizationGroup = (): OrganizationAdvancedFilterGroup => ({
  combinator: 'and',
  id: createOrganizationAdvancedRuleId(),
  not: false,
  rules: [createEmptyOrganizationCondition()],
  type: 'group',
});

export const appendConditionToOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup
): OrganizationAdvancedFilterGroup => ({
  ...group,
  rules: [...group.rules, createEmptyOrganizationCondition()],
});

export const appendGroupToOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup
): OrganizationAdvancedFilterGroup => ({
  ...group,
  rules: [...group.rules, createEmptyOrganizationGroup()],
});

export const replaceRuleInOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup,
  ruleId: string,
  nextRule: OrganizationAdvancedFilterRule
): OrganizationAdvancedFilterGroup => ({
  ...group,
  rules: group.rules.map((rule: OrganizationAdvancedFilterRule) =>
    rule.id === ruleId ? nextRule : rule
  ),
});

export const removeRuleFromOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup,
  ruleId: string
): OrganizationAdvancedFilterGroup => {
  const nextRules = group.rules.filter(
    (rule: OrganizationAdvancedFilterRule): boolean => rule.id !== ruleId
  );
  return {
    ...group,
    rules: nextRules.length > 0 ? nextRules : [createEmptyOrganizationCondition()],
  };
};

export const moveRuleInOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup,
  ruleId: string,
  direction: -1 | 1
): OrganizationAdvancedFilterGroup | null => {
  const currentIndex = group.rules.findIndex(
    (rule: OrganizationAdvancedFilterRule): boolean => rule.id === ruleId
  );
  if (currentIndex < 0) return null;
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= group.rules.length) return null;

  const nextRules = [...group.rules];
  const [movedRule] = nextRules.splice(currentIndex, 1);
  if (movedRule === undefined) return null;
  nextRules.splice(targetIndex, 0, movedRule);
  return { ...group, rules: nextRules };
};

export const duplicateOrganizationRuleWithNewIds = (
  rule: OrganizationAdvancedFilterRule
): OrganizationAdvancedFilterRule => {
  if (rule.type === 'condition') {
    return { ...rule, id: createOrganizationAdvancedRuleId() };
  }
  return {
    ...rule,
    id: createOrganizationAdvancedRuleId(),
    rules: rule.rules.map((child: OrganizationAdvancedFilterRule) =>
      duplicateOrganizationRuleWithNewIds(child)
    ),
  };
};

export const duplicateRuleInOrganizationGroup = (
  group: OrganizationAdvancedFilterGroup,
  ruleId: string
): OrganizationAdvancedFilterGroup | null => {
  const currentIndex = group.rules.findIndex(
    (rule: OrganizationAdvancedFilterRule): boolean => rule.id === ruleId
  );
  if (currentIndex < 0) return null;
  const sourceRule = group.rules[currentIndex];
  if (sourceRule === undefined) return null;
  const nextRules = [...group.rules];
  nextRules.splice(currentIndex + 1, 0, duplicateOrganizationRuleWithNewIds(sourceRule));
  return { ...group, rules: nextRules };
};

const stripOrganizationConditionValues = (
  condition: OrganizationAdvancedFilterCondition
): OrganizationAdvancedFilterCondition => {
  const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
  delete nextCondition.value;
  delete nextCondition.valueTo;
  return nextCondition;
};

const stripOrganizationConditionValueTo = (
  condition: OrganizationAdvancedFilterCondition
): OrganizationAdvancedFilterCondition => {
  const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
  delete nextCondition.valueTo;
  return nextCondition;
};

export const isOrganizationAdvancedValueRequired = (
  operator: OrganizationAdvancedFilterOperator
): boolean => operator !== 'isEmpty' && operator !== 'isNotEmpty';

export const isOrganizationAdvancedSecondValueRequired = (
  operator: OrganizationAdvancedFilterOperator
): boolean => operator === 'between';

export const isOrganizationAdvancedMultiValueOperator = (
  operator: OrganizationAdvancedFilterOperator
): boolean => operator === 'in' || operator === 'notIn';

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

export const buildOrganizationConditionForFieldChange = (
  condition: OrganizationAdvancedFilterCondition,
  nextField: OrganizationAdvancedFilterField
): OrganizationAdvancedFilterCondition => {
  const nextOperator = supportsOrganizationAdvancedOperator(nextField, condition.operator)
    ? condition.operator
    : getDefaultOperatorForOrganizationField(nextField);
  return stripOrganizationConditionValues({
    ...condition,
    field: nextField,
    operator: nextOperator,
  });
};

export const buildOrganizationConditionForOperatorChange = (
  condition: OrganizationAdvancedFilterCondition,
  nextOperator: OrganizationAdvancedFilterOperator
): OrganizationAdvancedFilterCondition => {
  let nextCondition: OrganizationAdvancedFilterCondition = { ...condition, operator: nextOperator };
  if (!isOrganizationAdvancedValueRequired(nextOperator)) {
    return stripOrganizationConditionValues(nextCondition);
  }
  if (isOrganizationAdvancedMultiValueOperator(nextOperator)) {
    if (!Array.isArray(nextCondition.value)) {
      if (
        nextCondition.value === undefined ||
        nextCondition.value === null ||
        nextCondition.value === ''
      ) {
        delete nextCondition.value;
      } else {
        nextCondition = { ...nextCondition, value: [nextCondition.value] };
      }
    }
    return stripOrganizationConditionValueTo(nextCondition);
  }
  if (Array.isArray(nextCondition.value)) {
    const firstValue = nextCondition.value[0];
    if (firstValue === undefined) {
      delete nextCondition.value;
    } else {
      nextCondition = { ...nextCondition, value: firstValue };
    }
  }
  return isOrganizationAdvancedSecondValueRequired(nextOperator)
    ? nextCondition
    : stripOrganizationConditionValueTo(nextCondition);
};

export const buildOrganizationConditionForValueChange = (
  condition: OrganizationAdvancedFilterCondition,
  kind: OrganizationAdvancedFieldKind,
  rawValue: string
): OrganizationAdvancedFilterCondition => {
  if (isOrganizationAdvancedMultiValueOperator(condition.operator)) {
    const normalized = normalizeOrganizationMultiValueInput(kind, rawValue);
    if (normalized.length === 0) {
      const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
      delete nextCondition.value;
      return nextCondition;
    }
    return { ...condition, value: normalized };
  }
  if (rawValue.length === 0) {
    const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
    delete nextCondition.value;
    return nextCondition;
  }
  return { ...condition, value: normalizeOrganizationConditionValue(kind, rawValue) };
};

export const buildOrganizationConditionForBooleanValueChange = (
  condition: OrganizationAdvancedFilterCondition,
  nextValue: string
): OrganizationAdvancedFilterCondition => {
  if (nextValue.length === 0) {
    const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
    delete nextCondition.value;
    return nextCondition;
  }
  return { ...condition, value: nextValue === 'true' };
};

export const buildOrganizationConditionForValueToChange = (
  condition: OrganizationAdvancedFilterCondition,
  kind: OrganizationAdvancedFieldKind,
  rawValue: string
): OrganizationAdvancedFilterCondition => {
  if (rawValue.length === 0) {
    const nextCondition: OrganizationAdvancedFilterCondition = { ...condition };
    delete nextCondition.valueTo;
    return nextCondition;
  }
  return { ...condition, valueTo: normalizeOrganizationConditionValue(kind, rawValue) };
};

export const buildOrganizationConditionValidationMessage = (
  condition: OrganizationAdvancedFilterCondition
): string | null => {
  if (!isOrganizationAdvancedValueRequired(condition.operator)) return null;
  const fieldConfig = getOrganizationAdvancedFieldConfig(condition.field);

  if (isOrganizationAdvancedMultiValueOperator(condition.operator)) {
    if (!Array.isArray(condition.value) || condition.value.length === 0) {
      return 'At least one value is required.';
    }
    return null;
  }
  if (
    condition.value === undefined ||
    condition.value === null ||
    (typeof condition.value === 'string' && condition.value.trim().length === 0)
  ) {
    return 'Value is required.';
  }
  if (Array.isArray(condition.value)) return 'Value must be a single item.';
  if (fieldConfig.kind === 'boolean' && typeof condition.value !== 'boolean') {
    return 'Value must be true or false.';
  }
  if (isOrganizationAdvancedSecondValueRequired(condition.operator)) {
    if (
      condition.valueTo === undefined ||
      condition.valueTo === null ||
      (typeof condition.valueTo === 'string' && condition.valueTo.trim().length === 0)
    ) {
      return 'Second value is required.';
    }
    if (Array.isArray(condition.valueTo)) return 'Second value must be a single item.';
  }
  return null;
};

export const parseOrganizationAdvancedFilterPayload = (
  payload: string | null | undefined
): OrganizationAdvancedFilterGroup | null => {
  if (payload === null || payload === undefined || payload.trim().length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    const validated = organizationAdvancedFilterGroupSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
};

export const parseOrganizationAdvancedFilterPayloadOrDefault = (
  payload: string | null | undefined
): OrganizationAdvancedFilterGroup =>
  parseOrganizationAdvancedFilterPayload(payload) ?? createEmptyOrganizationGroup();

export const serializeOrganizationAdvancedFilterPayload = (
  group: OrganizationAdvancedFilterGroup
): string => JSON.stringify(group);

export const createOrganizationAdvancedPreset = (
  name: string,
  filter: OrganizationAdvancedFilterGroup
): OrganizationAdvancedFilterPreset => {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    filter,
    id: createOrganizationAdvancedRuleId(),
    name: name.trim(),
    updatedAt: now,
  };
};

export const normalizeOrganizationPresetName = (name: string): string => name.trim();

export const hasOrganizationPresetNameConflict = (
  presets: OrganizationAdvancedFilterPreset[],
  name: string,
  exceptPresetId?: string
): boolean => {
  const normalizedName = normalizeOrganizationPresetName(name).toLowerCase();
  if (normalizedName.length === 0) return false;
  return presets.some((preset: OrganizationAdvancedFilterPreset): boolean => {
    if (exceptPresetId !== undefined && preset.id === exceptPresetId) return false;
    return preset.name.trim().toLowerCase() === normalizedName;
  });
};

export const findOrganizationPresetById = (
  presets: OrganizationAdvancedFilterPreset[],
  presetId: string
): OrganizationAdvancedFilterPreset | null =>
  presets.find((preset: OrganizationAdvancedFilterPreset): boolean => preset.id === presetId) ??
  null;

export const cloneOrganizationAdvancedFilterGroup = (
  filter: OrganizationAdvancedFilterGroup
): OrganizationAdvancedFilterGroup =>
  JSON.parse(JSON.stringify(filter)) as OrganizationAdvancedFilterGroup;

export const buildOrganizationPresetBundle = (
  presets: OrganizationAdvancedFilterPreset[]
): OrganizationAdvancedFilterPresetBundle => ({
  exportedAt: new Date().toISOString(),
  presets,
  version: 1,
});

export const readOrganizationAdvancedPresetBundle = (
  payload: unknown
): OrganizationAdvancedFilterPreset[] | null => {
  const bundle = organizationAdvancedFilterPresetBundleSchema.safeParse(payload);
  if (bundle.success) return bundle.data.presets;
  if (Array.isArray(payload)) {
    const presets = organizationAdvancedFilterPresetBundleSchema.shape.presets.safeParse(payload);
    return presets.success ? presets.data : null;
  }
  return null;
};

export const parseOrganizationPresetImportPayload = (
  payload: unknown
): OrganizationAdvancedFilterPreset[] | null => {
  const single = organizationAdvancedFilterPresetSchema.safeParse(payload);
  if (single.success) return [single.data];
  return readOrganizationAdvancedPresetBundle(payload);
};

const resolveImportedOrganizationPresetName = (
  desiredName: string,
  usedLowercaseNames: Set<string>
): string => {
  const normalizedName = normalizeOrganizationPresetName(desiredName);
  const baseName = normalizedName.length > 0 ? normalizedName : 'Imported Preset';
  let copyIndex = 1;
  let candidate = baseName;
  while (usedLowercaseNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (copy ${copyIndex})`;
    copyIndex += 1;
  }
  usedLowercaseNames.add(candidate.toLowerCase());
  return candidate;
};

export const mapImportedOrganizationPresets = (
  currentPresets: OrganizationAdvancedFilterPreset[],
  importedPresets: OrganizationAdvancedFilterPreset[]
): OrganizationAdvancedFilterPreset[] => {
  const now = new Date().toISOString();
  const usedNames = new Set<string>(
    currentPresets.map((preset: OrganizationAdvancedFilterPreset): string =>
      preset.name.trim().toLowerCase()
    )
  );
  return importedPresets.map((preset: OrganizationAdvancedFilterPreset) => ({
    ...preset,
    createdAt: now,
    filter: cloneOrganizationAdvancedFilterGroup(preset.filter),
    id: createOrganizationAdvancedRuleId(),
    name: resolveImportedOrganizationPresetName(preset.name, usedNames),
    updatedAt: now,
  }));
};

export const downloadOrganizationJsonFile = (filename: string, payload: unknown): void => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const slugifyOrganizationPresetFilename = (name: string): string => {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'preset';
};

export const writeOrganizationTextToClipboard = async (value: string): Promise<void> => {
  const clipboard =
    typeof navigator === 'undefined'
      ? null
      : ((navigator as unknown as { clipboard?: ClipboardLike }).clipboard ?? null);
  if (clipboard === null || typeof clipboard.writeText !== 'function') {
    throw new Error('Clipboard API is not available in this browser.');
  }
  await clipboard.writeText(value);
};

export const canAddNestedOrganizationGroup = (depth: number): boolean =>
  depth < ORGANIZATION_ADVANCED_FILTER_MAX_DEPTH;

export const getOrganizationAdvancedInputType = (
  field: OrganizationAdvancedFilterField
): 'date' | 'text' =>
  ORGANIZATION_ADVANCED_DATE_FIELDS.has(field) &&
  !ORGANIZATION_ADVANCED_BOOLEAN_FIELDS.has(field)
    ? 'date'
    : 'text';
