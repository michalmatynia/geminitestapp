import 'server-only';

import type { Filter } from 'mongodb';

import {
  organizationAdvancedFilterGroupSchema,
  type OrganizationAdvancedFilterCondition,
  type OrganizationAdvancedFilterField,
  type OrganizationAdvancedFilterGroup,
  type OrganizationAdvancedFilterOperator,
  type OrganizationAdvancedFilterRule,
} from '../filemaker-organization-advanced-filters';
import type { FilemakerOrganizationMongoDocument } from './filemaker-organizations-mongo';

type FieldValueFilterBuilder = (
  field: keyof FilemakerOrganizationMongoDocument
) => Filter<FilemakerOrganizationMongoDocument>;

type BuildOrganizationAdvancedFilterInput = {
  advancedFilter: string;
  escapeRegex: (value: string) => string;
  hasFieldValueFilter: FieldValueFilterBuilder;
  hasNoFieldValueFilter: FieldValueFilterBuilder;
};

const FIELD_MAP: Partial<
  Record<OrganizationAdvancedFilterField, keyof FilemakerOrganizationMongoDocument>
> = {
  city: 'city',
  cooperationStatus: 'cooperationStatus',
  country: 'country',
  countryId: 'countryId',
  createdAt: 'createdAt',
  establishedDate: 'establishedDate',
  id: 'id',
  jobBoardScrapedAt: 'jobBoardScrapedAt',
  jobBoardSourceLabel: 'jobBoardSourceLabel',
  jobBoardSourceSite: 'jobBoardSourceSite',
  jobBoardSourceUrl: 'jobBoardSourceUrl',
  krs: 'krs',
  legacyParentUuid: 'legacyParentUuid',
  legacyUuid: 'legacyUuid',
  name: 'name',
  postalCode: 'postalCode',
  street: 'street',
  taxId: 'taxId',
  tradingName: 'tradingName',
  updatedAt: 'updatedAt',
  updatedBy: 'updatedBy',
};

const normalizeScalar = (value: unknown): string | number | boolean | null => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value;
  return null;
};

const normalizeBoolean = (value: unknown): boolean => value === true;

const buildBooleanFieldFilter = (
  field: OrganizationAdvancedFilterField,
  value: unknown,
  operator: OrganizationAdvancedFilterOperator,
  input: BuildOrganizationAdvancedFilterInput
): Filter<FilemakerOrganizationMongoDocument> => {
  const expectedValue = operator === 'neq' ? !normalizeBoolean(value) : normalizeBoolean(value);
  if (field === 'hasAddress') {
    return expectedValue
      ? {
          $or: [
            input.hasFieldValueFilter('legacyDefaultAddressUuid'),
            input.hasFieldValueFilter('addressId'),
          ],
        }
      : {
          $and: [
            input.hasNoFieldValueFilter('legacyDefaultAddressUuid'),
            input.hasNoFieldValueFilter('addressId'),
          ],
        };
  }
  if (field === 'hasBank') {
    return expectedValue
      ? input.hasFieldValueFilter('legacyDefaultBankAccountUuid')
      : input.hasNoFieldValueFilter('legacyDefaultBankAccountUuid');
  }
  return expectedValue
    ? {
        $or: [
          input.hasFieldValueFilter('legacyParentUuid'),
          input.hasFieldValueFilter('parentOrganizationId'),
        ],
      }
    : {
        $and: [
          input.hasNoFieldValueFilter('legacyParentUuid'),
          input.hasNoFieldValueFilter('parentOrganizationId'),
        ],
      };
};

const buildStringComparisonFilter = (
  field: keyof FilemakerOrganizationMongoDocument,
  operator: OrganizationAdvancedFilterOperator,
  value: string,
  escapeRegex: (value: string) => string
): Filter<FilemakerOrganizationMongoDocument> => {
  if (operator === 'contains') return { [field]: new RegExp(escapeRegex(value), 'i') };
  const exactRegex = new RegExp(`^${escapeRegex(value)}$`, 'i');
  if (operator === 'eq') return { [field]: exactRegex };
  if (operator === 'neq') return { [field]: { $not: exactRegex } };
  return {};
};

const buildSetFilter = (
  field: keyof FilemakerOrganizationMongoDocument,
  operator: OrganizationAdvancedFilterOperator,
  values: unknown[],
  escapeRegex: (value: string) => string
): Filter<FilemakerOrganizationMongoDocument> => {
  const normalizedValues = values
    .map(normalizeScalar)
    .filter((value): value is string | number | boolean => value !== null && value !== '');
  const exactValues = normalizedValues.map((value: string | number | boolean) =>
    typeof value === 'string' ? new RegExp(`^${escapeRegex(value)}$`, 'i') : value
  );
  return operator === 'notIn' ? { [field]: { $nin: exactValues } } : { [field]: { $in: exactValues } };
};

const buildRangeFilter = (
  field: keyof FilemakerOrganizationMongoDocument,
  operator: OrganizationAdvancedFilterOperator,
  value: string | number | boolean | null,
  valueTo: string | number | boolean | null
): Filter<FilemakerOrganizationMongoDocument> => {
  if (operator === 'gt') return { [field]: { $gt: value } };
  if (operator === 'gte') return { [field]: { $gte: value } };
  if (operator === 'lt') return { [field]: { $lt: value } };
  if (operator === 'lte') return { [field]: { $lte: value } };
  if (operator === 'between') return { [field]: { $gte: value, $lte: valueTo } };
  return {};
};

const isSyntheticBooleanField = (
  field: OrganizationAdvancedFilterField
): field is 'hasAddress' | 'hasBank' | 'hasParent' =>
  field === 'hasAddress' || field === 'hasBank' || field === 'hasParent';

const isSetOperator = (
  operator: OrganizationAdvancedFilterOperator
): operator is 'in' | 'notIn' => operator === 'in' || operator === 'notIn';

const isStringComparisonOperator = (
  operator: OrganizationAdvancedFilterOperator
): operator is 'contains' | 'eq' | 'neq' =>
  operator === 'contains' || operator === 'eq' || operator === 'neq';

const buildEmptyValueFilter = (
  field: keyof FilemakerOrganizationMongoDocument,
  operator: OrganizationAdvancedFilterOperator,
  input: BuildOrganizationAdvancedFilterInput
): Filter<FilemakerOrganizationMongoDocument> | null => {
  if (operator === 'isEmpty') return input.hasNoFieldValueFilter(field);
  if (operator === 'isNotEmpty') return input.hasFieldValueFilter(field);
  return null;
};

const buildSetConditionFilter = (
  field: keyof FilemakerOrganizationMongoDocument,
  condition: OrganizationAdvancedFilterCondition,
  input: BuildOrganizationAdvancedFilterInput
): Filter<FilemakerOrganizationMongoDocument> | null => {
  if (!isSetOperator(condition.operator) || !Array.isArray(condition.value)) return null;
  return buildSetFilter(field, condition.operator, condition.value, input.escapeRegex);
};

const buildScalarConditionFilter = (
  field: keyof FilemakerOrganizationMongoDocument,
  condition: OrganizationAdvancedFilterCondition,
  input: BuildOrganizationAdvancedFilterInput
): Filter<FilemakerOrganizationMongoDocument> => {
  const value = normalizeScalar(condition.value);
  const valueTo = normalizeScalar(condition.valueTo);
  if (value === null || value === '') return {};

  if (isStringComparisonOperator(condition.operator)) {
    return buildStringComparisonFilter(field, condition.operator, String(value), input.escapeRegex);
  }

  return buildRangeFilter(field, condition.operator, value, valueTo);
};

const buildMappedConditionFilter = (
  field: keyof FilemakerOrganizationMongoDocument,
  condition: OrganizationAdvancedFilterCondition,
  input: BuildOrganizationAdvancedFilterInput
): Filter<FilemakerOrganizationMongoDocument> => {
  const emptyValueFilter = buildEmptyValueFilter(field, condition.operator, input);
  if (emptyValueFilter !== null) return emptyValueFilter;

  const setFilter = buildSetConditionFilter(field, condition, input);
  if (setFilter !== null) return setFilter;

  return buildScalarConditionFilter(field, condition, input);
};

const buildConditionFilter = (
  condition: OrganizationAdvancedFilterCondition,
  input: BuildOrganizationAdvancedFilterInput
): Filter<FilemakerOrganizationMongoDocument> => {
  if (isSyntheticBooleanField(condition.field)) {
    return buildBooleanFieldFilter(condition.field, condition.value, condition.operator, input);
  }

  const field = FIELD_MAP[condition.field];
  if (field === undefined) return {};
  return buildMappedConditionFilter(field, condition, input);
};

const buildRuleFilter = (
  rule: OrganizationAdvancedFilterRule,
  input: BuildOrganizationAdvancedFilterInput
): Filter<FilemakerOrganizationMongoDocument> =>
  rule.type === 'condition'
    ? buildConditionFilter(rule, input)
    : buildGroupFilter(rule, input);

const buildGroupFilter = (
  group: OrganizationAdvancedFilterGroup,
  input: BuildOrganizationAdvancedFilterInput
): Filter<FilemakerOrganizationMongoDocument> => {
  const clauses = group.rules
    .map((rule: OrganizationAdvancedFilterRule): Filter<FilemakerOrganizationMongoDocument> =>
      buildRuleFilter(rule, input)
    )
    .filter((clause: Filter<FilemakerOrganizationMongoDocument>): boolean =>
      Object.keys(clause).length > 0
    );
  if (clauses.length === 0) return {};
  const groupFilter: Filter<FilemakerOrganizationMongoDocument> =
    group.combinator === 'or'
      ? { $or: clauses }
      : { $and: clauses };
  if (!group.not) return groupFilter;
  const negatedFilter: Filter<FilemakerOrganizationMongoDocument> = { $nor: [groupFilter] };
  return negatedFilter;
};

export const buildOrganizationAdvancedFilter = (
  input: BuildOrganizationAdvancedFilterInput
): Filter<FilemakerOrganizationMongoDocument> => {
  const normalized = input.advancedFilter.trim();
  if (normalized.length === 0) return {};
  try {
    const parsed = organizationAdvancedFilterGroupSchema.safeParse(JSON.parse(normalized));
    return parsed.success ? buildGroupFilter(parsed.data, input) : {};
  } catch {
    return {};
  }
};
