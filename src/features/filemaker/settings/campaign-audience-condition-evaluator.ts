import type {
  FilemakerAudienceCondition,
  FilemakerAudienceConditionGroup,
  FilemakerAudienceField,
  FilemakerAudienceOperator,
  FilemakerEmail,
  FilemakerOrganization,
  FilemakerPerson,
} from '@/shared/contracts/filemaker';

import { normalizeString } from '../filemaker-settings.helpers';

export type ConditionContext = {
  email?: FilemakerEmail | null;
  eventIds?: string[];
  organization?: FilemakerOrganization | null;
  organizationDemandLabels?: string[];
  organizationDemandLegacyValueUuids?: string[];
  organizationDemandPaths?: string[];
  organizationDemandValueIds?: string[];
  organizationIds?: string[];
  person?: FilemakerPerson | null;
};

type FieldValue = string | string[] | null;
type FieldValueResolver = (context: ConditionContext) => FieldValue;

const FIELD_VALUE_RESOLVERS: Record<FilemakerAudienceField, FieldValueResolver> = {
  'email.address': (context) => context.email?.email ?? null,
  'email.status': (context) => context.email?.status ?? null,
  eventId: (context) => context.eventIds ?? null,
  'organization.city': (context) => context.organization?.city ?? null,
  'organization.cooperationStatus': (context) =>
    context.organization?.cooperationStatus ?? null,
  'organization.country': (context) => context.organization?.country ?? null,
  'organization.demandLabel': (context) => context.organizationDemandLabels ?? null,
  'organization.demandLegacyValueUuid': (context) =>
    context.organizationDemandLegacyValueUuids ?? null,
  'organization.demandPath': (context) => context.organizationDemandPaths ?? null,
  'organization.demandValueId': (context) => context.organizationDemandValueIds ?? null,
  'organization.krs': (context) => context.organization?.krs ?? null,
  'organization.name': (context) => context.organization?.name ?? null,
  'organization.postalCode': (context) => context.organization?.postalCode ?? null,
  'organization.street': (context) => context.organization?.street ?? null,
  'organization.taxId': (context) => context.organization?.taxId ?? null,
  'organization.tradingName': (context) => context.organization?.tradingName ?? null,
  organizationId: (context) => context.organizationIds ?? null,
  'person.city': (context) => context.person?.city ?? null,
  'person.country': (context) => context.person?.country ?? null,
  'person.firstName': (context) => context.person?.firstName ?? null,
  'person.lastName': (context) => context.person?.lastName ?? null,
  'person.nip': (context) => context.person?.nip ?? null,
  'person.phoneNumbers': (context) => context.person?.phoneNumbers ?? null,
  'person.postalCode': (context) => context.person?.postalCode ?? null,
  'person.regon': (context) => context.person?.regon ?? null,
  'person.street': (context) => context.person?.street ?? null,
};

const SCALAR_OPERATOR_EVALUATORS: Record<
  FilemakerAudienceOperator,
  (cell: string, target: string) => boolean
> = {
  contains: (cell, target) => cell.includes(target),
  ends_with: (cell, target) => cell.endsWith(target),
  equals: (cell, target) => cell === target,
  is_empty: (cell) => cell === '',
  is_not_empty: (cell) => cell !== '',
  not_contains: (cell, target) => !cell.includes(target),
  not_equals: (cell, target) => cell !== target,
  starts_with: (cell, target) => cell.startsWith(target),
};

const resolveFieldValue = (
  field: FilemakerAudienceField,
  context: ConditionContext
): FieldValue => FIELD_VALUE_RESOLVERS[field](context);

const isNegativeOperator = (operator: FilemakerAudienceOperator): boolean =>
  operator === 'not_equals' || operator === 'not_contains';

const evaluateScalarOperator = (
  operator: FilemakerAudienceOperator,
  cellValue: string,
  needle: string
): boolean =>
  SCALAR_OPERATOR_EVALUATORS[operator](cellValue.toLowerCase(), needle.toLowerCase());

const evaluateEmptyOperator = (
  operator: FilemakerAudienceOperator,
  raw: FieldValue
): boolean => {
  if (operator === 'is_empty') {
    if (raw === null) return true;
    if (Array.isArray(raw)) return raw.every((entry) => normalizeString(entry) === '');
    return normalizeString(raw) === '';
  }
  if (raw === null) return false;
  if (Array.isArray(raw)) return raw.some((entry) => normalizeString(entry) !== '');
  return normalizeString(raw) !== '';
};

const evaluateArrayCondition = (
  condition: FilemakerAudienceCondition,
  raw: string[]
): boolean => {
  const isNegative = isNegativeOperator(condition.operator);
  if (raw.length === 0) return isNegative;
  const matchesEntry = (entry: string): boolean =>
    evaluateScalarOperator(condition.operator, normalizeString(entry), condition.value);
  return isNegative ? raw.every(matchesEntry) : raw.some(matchesEntry);
};

export const evaluateAudienceCondition = (
  condition: FilemakerAudienceCondition,
  context: ConditionContext
): boolean => {
  const raw = resolveFieldValue(condition.field, context);
  if (condition.operator === 'is_empty' || condition.operator === 'is_not_empty') {
    return evaluateEmptyOperator(condition.operator, raw);
  }
  if (condition.value.length === 0) return isNegativeOperator(condition.operator);
  if (Array.isArray(raw)) return evaluateArrayCondition(condition, raw);
  return evaluateScalarOperator(condition.operator, normalizeString(raw ?? ''), condition.value);
};

const evaluateAudienceConditionChild = (
  child: FilemakerAudienceCondition | FilemakerAudienceConditionGroup,
  context: ConditionContext
): boolean =>
  child.type === 'group'
    ? evaluateAudienceConditionGroup(child, context)
    : evaluateAudienceCondition(child, context);

export const evaluateAudienceConditionGroup = (
  group: FilemakerAudienceConditionGroup,
  context: ConditionContext
): boolean => {
  if (group.children.length === 0) return group.not !== true;
  const matched = group.combinator === 'and'
    ? group.children.every((child) => evaluateAudienceConditionChild(child, context))
    : group.children.some((child) => evaluateAudienceConditionChild(child, context));
  return group.not === true ? !matched : matched;
};
