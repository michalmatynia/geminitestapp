import { z } from 'zod';

import { validateAdvancedFilterCondition } from './filemaker-organization-advanced-filter-validation';

export {
  ORGANIZATION_ADVANCED_BOOLEAN_FIELDS,
  ORGANIZATION_ADVANCED_DATE_FIELDS,
  ORGANIZATION_ADVANCED_STRING_FIELDS,
} from './filemaker-organization-advanced-filter-validation';

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
  'jobBoardSourceSite',
  'jobBoardSourceLabel',
  'jobBoardSourceUrl',
  'createdAt',
  'updatedAt',
  'establishedDate',
  'jobBoardScrapedAt',
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
