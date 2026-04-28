/* eslint-disable complexity, max-lines, max-lines-per-function */
import { z } from 'zod';

export const organizationAdvancedFilterFieldSchema = z.enum([
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
  'createdAt',
  'updatedAt',
  'establishedDate',
  'hasAddress',
  'hasBank',
  'hasParent',
]);

export type OrganizationAdvancedFilterField = z.infer<
  typeof organizationAdvancedFilterFieldSchema
>;

export const organizationAdvancedFilterOperatorSchema = z.enum([
  'contains',
  'eq',
  'neq',
  'in',
  'notIn',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'isEmpty',
  'isNotEmpty',
]);

export type OrganizationAdvancedFilterOperator = z.infer<
  typeof organizationAdvancedFilterOperatorSchema
>;

export const organizationAdvancedFilterCombinatorSchema = z.enum(['and', 'or']);

export type OrganizationAdvancedFilterCombinator = z.infer<
  typeof organizationAdvancedFilterCombinatorSchema
>;

export const ORGANIZATION_ADVANCED_FILTER_MAX_DEPTH = 5;
export const ORGANIZATION_ADVANCED_FILTER_MAX_RULES = 40;
export const ORGANIZATION_ADVANCED_FILTER_MAX_SET_ITEMS = 50;

const organizationAdvancedFilterScalarValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const organizationAdvancedFilterValueSchema = z.union([
  organizationAdvancedFilterScalarValueSchema,
  z.array(organizationAdvancedFilterScalarValueSchema),
]);

type OrganizationAdvancedScalarValue = z.infer<
  typeof organizationAdvancedFilterScalarValueSchema
>;

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
]);

export const ORGANIZATION_ADVANCED_DATE_FIELDS = new Set<OrganizationAdvancedFilterField>([
  'createdAt',
  'updatedAt',
  'establishedDate',
]);

export const ORGANIZATION_ADVANCED_BOOLEAN_FIELDS = new Set<OrganizationAdvancedFilterField>([
  'hasAddress',
  'hasBank',
  'hasParent',
]);

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
  createdAt: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  updatedAt: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  establishedDate: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  hasAddress: ['eq', 'neq'],
  hasBank: ['eq', 'neq'],
  hasParent: ['eq', 'neq'],
};

export const organizationAdvancedFilterConditionSchema = z.object({
  type: z.literal('condition'),
  id: z.string().trim().min(1),
  field: organizationAdvancedFilterFieldSchema,
  operator: organizationAdvancedFilterOperatorSchema,
  value: organizationAdvancedFilterValueSchema.optional(),
  valueTo: organizationAdvancedFilterValueSchema.optional(),
});

export type OrganizationAdvancedFilterCondition = z.infer<
  typeof organizationAdvancedFilterConditionSchema
>;

export interface OrganizationAdvancedFilterGroup {
  type: 'group';
  id: string;
  combinator: OrganizationAdvancedFilterCombinator;
  not: boolean;
  rules: Array<OrganizationAdvancedFilterCondition | OrganizationAdvancedFilterGroup>;
}

const organizationAdvancedFilterGroupBaseSchema: z.ZodType<OrganizationAdvancedFilterGroup> =
  z.object({
    type: z.literal('group'),
    id: z.string().trim().min(1),
    combinator: organizationAdvancedFilterCombinatorSchema,
    not: z.boolean().default(false),
    rules: z
      .array(
        z.union([
          organizationAdvancedFilterConditionSchema,
          z.lazy(() => organizationAdvancedFilterGroupBaseSchema),
        ])
      )
      .min(1),
  });

export type OrganizationAdvancedFilterRule =
  | OrganizationAdvancedFilterCondition
  | OrganizationAdvancedFilterGroup;

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

const validateAdvancedFilterCondition = (
  condition: OrganizationAdvancedFilterCondition,
  path: Array<string | number>,
  ctx: z.RefinementCtx
): void => {
  const allowedOperators = ORGANIZATION_ADVANCED_FILTER_OPERATOR_COMPATIBILITY[condition.field];
  if (!allowedOperators.includes(condition.operator)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'operator'],
      message: `Operator "${condition.operator}" is not allowed for field "${condition.field}".`,
    });
    return;
  }

  if (condition.operator === 'isEmpty' || condition.operator === 'isNotEmpty') {
    if (condition.value !== undefined || condition.valueTo !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Operator "${condition.operator}" does not accept value inputs.`,
      });
    }
    return;
  }

  if (condition.operator === 'between') {
    if (
      Array.isArray(condition.value) ||
      Array.isArray(condition.valueTo) ||
      !validateAdvancedFilterScalarValue(condition.field, condition.value) ||
      !validateAdvancedFilterScalarValue(condition.field, condition.valueTo)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path,
        message: `Operator "between" requires valid scalar values for field "${condition.field}".`,
      });
    }
    return;
  }

  if (condition.operator === 'in' || condition.operator === 'notIn') {
    if (!Array.isArray(condition.value) || condition.value.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" requires at least one value.`,
      });
      return;
    }
    if (condition.value.length > ORGANIZATION_ADVANCED_FILTER_MAX_SET_ITEMS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" supports up to ${ORGANIZATION_ADVANCED_FILTER_MAX_SET_ITEMS} values.`,
      });
      return;
    }
    if (
      condition.value.some(
        (value: unknown) => !validateAdvancedFilterScalarValue(condition.field, value)
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'value'],
        message: `Operator "${condition.operator}" contains invalid values for field "${condition.field}".`,
      });
    }
    return;
  }

  if (!validateAdvancedFilterScalarValue(condition.field, condition.value)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [...path, 'value'],
      message: `Operator "${condition.operator}" requires a valid value for field "${condition.field}".`,
    });
  }
};

type OrganizationAdvancedFilterMetrics = {
  depth: number;
  rules: number;
};

const getOrganizationAdvancedFilterMetrics = (
  root: OrganizationAdvancedFilterGroup
): OrganizationAdvancedFilterMetrics => {
  const metrics: OrganizationAdvancedFilterMetrics = { depth: 1, rules: 0 };
  const walk = (group: OrganizationAdvancedFilterGroup, currentDepth: number): void => {
    metrics.depth = Math.max(metrics.depth, currentDepth);
    group.rules.forEach((rule: OrganizationAdvancedFilterRule): void => {
      metrics.rules += 1;
      if (rule.type === 'group') walk(rule, currentDepth + 1);
    });
  };
  walk(root, 1);
  return metrics;
};

export const organizationAdvancedFilterGroupSchema: z.ZodType<OrganizationAdvancedFilterGroup> =
  organizationAdvancedFilterGroupBaseSchema.superRefine(
    (group: OrganizationAdvancedFilterGroup, ctx) => {
      const metrics = getOrganizationAdvancedFilterMetrics(group);
      if (metrics.depth > ORGANIZATION_ADVANCED_FILTER_MAX_DEPTH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Advanced filter supports up to ${ORGANIZATION_ADVANCED_FILTER_MAX_DEPTH} nested levels.`,
        });
      }
      if (metrics.rules > ORGANIZATION_ADVANCED_FILTER_MAX_RULES) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Advanced filter supports up to ${ORGANIZATION_ADVANCED_FILTER_MAX_RULES} rules.`,
        });
      }

      const walk = (nestedGroup: OrganizationAdvancedFilterGroup, path: Array<string | number>): void => {
        nestedGroup.rules.forEach((rule: OrganizationAdvancedFilterRule, index: number): void => {
          const nextPath = [...path, 'rules', index];
          if (rule.type === 'condition') {
            validateAdvancedFilterCondition(rule, nextPath, ctx);
          } else {
            walk(rule, nextPath);
          }
        });
      };
      walk(group, []);
    }
  );

export const organizationAdvancedFilterPresetSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(80),
  filter: organizationAdvancedFilterGroupSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type OrganizationAdvancedFilterPreset = z.infer<
  typeof organizationAdvancedFilterPresetSchema
>;

export const organizationAdvancedFilterPresetBundleSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().trim().min(1),
  presets: z.array(organizationAdvancedFilterPresetSchema),
});

export type OrganizationAdvancedFilterPresetBundle = z.infer<
  typeof organizationAdvancedFilterPresetBundleSchema
>;
