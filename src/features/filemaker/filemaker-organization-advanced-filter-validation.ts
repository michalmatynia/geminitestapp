import { z } from 'zod';

import type {
  OrganizationAdvancedFilterCondition,
  OrganizationAdvancedFilterField,
  OrganizationAdvancedFilterOperator,
} from './filemaker-organization-advanced-filters';

type OrganizationAdvancedScalarValue = string | number | boolean | null;
type IssuePath = Array<string | number>;

export const ORGANIZATION_ADVANCED_STRING_FIELDS = new Set<OrganizationAdvancedFilterField>([
  'id',
  'name',
  'tradingName',
  'taxId',
  'krs',
  'cooperationStatus',
  'city',
  'street',
  'postalCode',
  'country',
  'countryId',
  'legacyUuid',
  'legacyParentUuid',
  'updatedBy',
  'jobBoardSourceSite',
  'jobBoardSourceLabel',
  'jobBoardSourceUrl',
]);

export const ORGANIZATION_ADVANCED_DATE_FIELDS = new Set<OrganizationAdvancedFilterField>([
  'createdAt',
  'updatedAt',
  'establishedDate',
  'jobBoardScrapedAt',
]);

export const ORGANIZATION_ADVANCED_BOOLEAN_FIELDS = new Set<OrganizationAdvancedFilterField>([
  'hasAddress',
  'hasBank',
  'hasParent',
]);

const ORGANIZATION_ADVANCED_FILTER_MAX_SET_ITEMS = 50;

const ORGANIZATION_ADVANCED_FILTER_OPERATOR_COMPATIBILITY: Record<
  OrganizationAdvancedFilterField,
  readonly OrganizationAdvancedFilterOperator[]
> = {
  id: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  name: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  tradingName: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  taxId: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  krs: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  cooperationStatus: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  city: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  street: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  postalCode: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  country: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  countryId: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  legacyUuid: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  legacyParentUuid: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  updatedBy: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  jobBoardSourceSite: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  jobBoardSourceLabel: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  jobBoardSourceUrl: ['contains', 'eq', 'neq', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  createdAt: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  updatedAt: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  establishedDate: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  jobBoardScrapedAt: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  hasAddress: ['eq', 'neq'],
  hasBank: ['eq', 'neq'],
  hasParent: ['eq', 'neq'],
};

const addConditionIssue = (
  ctx: z.RefinementCtx,
  path: IssuePath,
  message: string
): void => {
  ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
};

const isAdvancedStringValue = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isAdvancedBooleanValue = (value: unknown): value is boolean => typeof value === 'boolean';

const isAdvancedDateValue = (value: unknown): value is string | number => {
  if (typeof value === 'number') return Number.isFinite(value);
  return typeof value === 'string' && value.trim().length > 0;
};

const validateAdvancedFilterScalarValue = (
  field: OrganizationAdvancedFilterField,
  value: unknown
): value is OrganizationAdvancedScalarValue => {
  if (ORGANIZATION_ADVANCED_STRING_FIELDS.has(field)) return isAdvancedStringValue(value);
  if (ORGANIZATION_ADVANCED_DATE_FIELDS.has(field)) return isAdvancedDateValue(value);
  if (ORGANIZATION_ADVANCED_BOOLEAN_FIELDS.has(field)) return isAdvancedBooleanValue(value);
  return false;
};

const validateOperatorCompatibility = (
  condition: OrganizationAdvancedFilterCondition,
  path: IssuePath,
  ctx: z.RefinementCtx
): boolean => {
  const allowedOperators = ORGANIZATION_ADVANCED_FILTER_OPERATOR_COMPATIBILITY[condition.field];
  if (allowedOperators.includes(condition.operator)) return true;
  addConditionIssue(
    ctx,
    [...path, 'operator'],
    `Operator "${condition.operator}" is not allowed for field "${condition.field}".`
  );
  return false;
};

const validateEmptyOperatorCondition = (
  condition: OrganizationAdvancedFilterCondition,
  path: IssuePath,
  ctx: z.RefinementCtx
): void => {
  if (condition.value === undefined && condition.valueTo === undefined) return;
  addConditionIssue(ctx, path, `Operator "${condition.operator}" does not accept value inputs.`);
};

const validateBetweenCondition = (
  condition: OrganizationAdvancedFilterCondition,
  path: IssuePath,
  ctx: z.RefinementCtx
): void => {
  const hasInvalidValue =
    Array.isArray(condition.value) ||
    Array.isArray(condition.valueTo) ||
    !validateAdvancedFilterScalarValue(condition.field, condition.value) ||
    !validateAdvancedFilterScalarValue(condition.field, condition.valueTo);
  if (!hasInvalidValue) return;
  addConditionIssue(
    ctx,
    path,
    `Operator "between" requires valid scalar values for field "${condition.field}".`
  );
};

const isSetOperator = (operator: OrganizationAdvancedFilterOperator): boolean =>
  operator === 'in' || operator === 'notIn';

const validateSetCondition = (
  condition: OrganizationAdvancedFilterCondition,
  path: IssuePath,
  ctx: z.RefinementCtx
): void => {
  if (!Array.isArray(condition.value) || condition.value.length === 0) {
    addConditionIssue(ctx, [...path, 'value'], `Operator "${condition.operator}" requires at least one value.`);
    return;
  }
  if (condition.value.length > ORGANIZATION_ADVANCED_FILTER_MAX_SET_ITEMS) {
    addConditionIssue(
      ctx,
      [...path, 'value'],
      `Operator "${condition.operator}" supports up to ${ORGANIZATION_ADVANCED_FILTER_MAX_SET_ITEMS} values.`
    );
    return;
  }
  const hasInvalidValue = condition.value.some(
    (value: unknown) => !validateAdvancedFilterScalarValue(condition.field, value)
  );
  if (!hasInvalidValue) return;
  addConditionIssue(
    ctx,
    [...path, 'value'],
    `Operator "${condition.operator}" contains invalid values for field "${condition.field}".`
  );
};

const validateRequiredValueCondition = (
  condition: OrganizationAdvancedFilterCondition,
  path: IssuePath,
  ctx: z.RefinementCtx
): void => {
  if (validateAdvancedFilterScalarValue(condition.field, condition.value)) return;
  addConditionIssue(
    ctx,
    [...path, 'value'],
    `Operator "${condition.operator}" requires a valid value for field "${condition.field}".`
  );
};

export const validateAdvancedFilterCondition = (
  condition: OrganizationAdvancedFilterCondition,
  path: IssuePath,
  ctx: z.RefinementCtx
): void => {
  if (!validateOperatorCompatibility(condition, path, ctx)) return;
  if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
    validateEmptyOperatorCondition(condition, path, ctx);
    return;
  }
  if (condition.operator === 'between') {
    validateBetweenCondition(condition, path, ctx);
    return;
  }
  if (isSetOperator(condition.operator)) {
    validateSetCondition(condition, path, ctx);
    return;
  }
  validateRequiredValueCondition(condition, path, ctx);
};
