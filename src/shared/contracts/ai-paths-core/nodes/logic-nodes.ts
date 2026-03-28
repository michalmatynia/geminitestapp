import { z } from 'zod';

export const switchCaseConfigSchema = z.object({
  id: z.string(),
  matchValue: z.string(),
});

export type SwitchCaseConfigDto = z.infer<typeof switchCaseConfigSchema>;
export type SwitchCaseConfig = SwitchCaseConfigDto;

export const switchConfigSchema = z.object({
  inputPort: z.string().optional(),
  cases: z.array(switchCaseConfigSchema).optional(),
  defaultCaseId: z.string().optional(),
  maxCaseCount: z.number().int().min(1).max(500).optional(),
});

export type SwitchConfigDto = z.infer<typeof switchConfigSchema>;
export type SwitchConfig = SwitchConfigDto;

export const gateConfigSchema = z.object({
  condition: z.string().optional(),
  mode: z.enum(['block', 'pass']).optional(),
  failMessage: z.string().optional(),
});

export type GateConfigDto = z.infer<typeof gateConfigSchema>;
export type GateConfig = GateConfigDto;

export const compareConfigSchema = z.object({
  operation: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'regex']).optional(),
  operator: z.string().optional(),
  value: z.string().optional(),
  compareTo: z.string().optional(),
  caseSensitive: z.boolean().optional(),
  message: z.string().optional(),
});

export type CompareConfigDto = z.infer<typeof compareConfigSchema>;
export type CompareConfig = CompareConfigDto;

export const logicalConditionOperatorSchema = z.enum([
  'truthy',
  'falsy',
  'equals',
  'notEquals',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'isEmpty',
  'notEmpty',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
]);

export type LogicalConditionOperator = z.infer<typeof logicalConditionOperatorSchema>;

export const logicalConditionItemSchema = z.object({
  id: z.string(),
  inputPort: z.string(),
  operator: logicalConditionOperatorSchema,
  compareTo: z.string().optional(),
  caseSensitive: z.boolean().optional(),
  fieldPath: z.string().optional(),
});

export type LogicalConditionItem = z.infer<typeof logicalConditionItemSchema>;

export const logicalConditionConfigSchema = z.object({
  combinator: z.enum(['and', 'or']).optional(),
  conditions: z.array(logicalConditionItemSchema).optional(),
  operation: z.enum(['and', 'or', 'not']).optional(),
});

export type LogicalConditionConfigDto = z.infer<typeof logicalConditionConfigSchema>;
export type LogicalConditionConfig = LogicalConditionConfigDto;

export const routerConfigSchema = z.object({
  routes: z.record(z.string(), z.string()).optional(),
  mode: z.string().optional(),
  matchMode: z.string().optional(),
  compareTo: z.string().optional(),
});

export type RouterConfigDto = z.infer<typeof routerConfigSchema>;
export type RouterConfig = RouterConfigDto;
