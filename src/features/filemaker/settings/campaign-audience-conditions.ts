import {
  type FilemakerAudienceCondition,
  type FilemakerAudienceConditionGroup,
  type FilemakerAudienceField,
  type FilemakerAudienceOperator,
  type FilemakerEmail,
  type FilemakerOrganization,
  type FilemakerPerson,
} from '@/shared/contracts/filemaker';

import { normalizeString } from '../filemaker-settings.helpers';

export type ConditionContext = {
  person?: FilemakerPerson | null;
  organization?: FilemakerOrganization | null;
  email?: FilemakerEmail | null;
  organizationIds?: string[];
  eventIds?: string[];
  organizationDemandValueIds?: string[];
  organizationDemandLegacyValueUuids?: string[];
  organizationDemandLabels?: string[];
  organizationDemandPaths?: string[];
};

type OrgResolver = (org: FilemakerOrganization) => string | null;
type PersonResolver = (person: FilemakerPerson) => string | string[] | null;

const ORG_IDENTITY_RESOLVERS: Partial<Record<FilemakerAudienceField, OrgResolver>> = {
  'organization.name': (org) => org.name,
  'organization.tradingName': (org) => org.tradingName ?? null,
  'organization.cooperationStatus': (org) => org.cooperationStatus ?? null,
  'organization.taxId': (org) => org.taxId ?? null,
  'organization.krs': (org) => org.krs ?? null,
};

const ORG_LOCATION_RESOLVERS: Partial<Record<FilemakerAudienceField, OrgResolver>> = {
  'organization.city': (org) => org.city,
  'organization.country': (org) => org.country,
  'organization.postalCode': (org) => org.postalCode,
  'organization.street': (org) => org.street,
};

const PERSON_IDENTITY_RESOLVERS: Partial<Record<FilemakerAudienceField, PersonResolver>> = {
  'person.firstName': (person) => person.firstName,
  'person.lastName': (person) => person.lastName,
  'person.nip': (person) => person.nip,
  'person.regon': (person) => person.regon,
  'person.phoneNumbers': (person) => person.phoneNumbers,
};

const PERSON_LOCATION_RESOLVERS: Partial<Record<FilemakerAudienceField, PersonResolver>> = {
  'person.city': (person) => person.city,
  'person.country': (person) => person.country,
  'person.postalCode': (person) => person.postalCode,
  'person.street': (person) => person.street,
};

const resolveDemandValueId = (context: ConditionContext): string[] | null =>
  context.organizationDemandValueIds ?? null;
const resolveDemandLegacyUuid = (context: ConditionContext): string[] | null =>
  context.organizationDemandLegacyValueUuids ?? null;
const resolveDemandLabel = (context: ConditionContext): string[] | null =>
  context.organizationDemandLabels ?? null;
const resolveDemandPath = (context: ConditionContext): string[] | null =>
  context.organizationDemandPaths ?? null;

const resolveOrganizationDemandValue = (
  field: FilemakerAudienceField,
  context: ConditionContext
): string[] | null => {
  if (field === 'organization.demandValueId') return resolveDemandValueId(context);
  if (field === 'organization.demandLegacyValueUuid') return resolveDemandLegacyUuid(context);
  if (field === 'organization.demandLabel') return resolveDemandLabel(context);
  if (field === 'organization.demandPath') return resolveDemandPath(context);
  return null;
};

const resolveOrganizationFieldValue = (
  field: FilemakerAudienceField,
  org: FilemakerOrganization
): string | string[] | null => {
  const identity = ORG_IDENTITY_RESOLVERS[field];
  if (identity !== undefined) return identity(org);
  const location = ORG_LOCATION_RESOLVERS[field];
  if (location !== undefined) return location(org);
  return null;
};

const resolvePersonFieldValue = (
  field: FilemakerAudienceField,
  person: FilemakerPerson
): string | string[] | null => {
  const identity = PERSON_IDENTITY_RESOLVERS[field];
  if (identity !== undefined) return identity(person);
  const location = PERSON_LOCATION_RESOLVERS[field];
  if (location !== undefined) return location(person);
  return null;
};

const resolveEmailFieldValue = (
  field: FilemakerAudienceField,
  email: FilemakerEmail
): string | null => {
  if (field === 'email.address') return email.email;
  if (field === 'email.status') return email.status;
  return null;
};

const resolveOrgContextValue = (
  field: FilemakerAudienceField,
  context: ConditionContext
): string | string[] | null => {
  const org = context.organization;
  if (org === null) return null;
  if (org === undefined) return null;
  const demand = resolveOrganizationDemandValue(field, context);
  if (demand !== null) return demand;
  return resolveOrganizationFieldValue(field, org);
};

const resolvePersonContextValue = (
  field: FilemakerAudienceField,
  context: ConditionContext
): string | string[] | null => {
  const person = context.person;
  if (person === null) return null;
  if (person === undefined) return null;
  return resolvePersonFieldValue(field, person);
};

const resolveEmailContextValue = (
  field: FilemakerAudienceField,
  context: ConditionContext
): string | string[] | null => {
  const email = context.email;
  if (email === null) return null;
  if (email === undefined) return null;
  return resolveEmailFieldValue(field, email);
};

const resolveGlobalContextValue = (
  field: FilemakerAudienceField,
  context: ConditionContext
): string | string[] | null => {
  if (field === 'organizationId') return context.organizationIds ?? null;
  if (field === 'eventId') return context.eventIds ?? null;
  return null;
};

const resolveFieldValue = (
  field: FilemakerAudienceField,
  context: ConditionContext
): string | string[] | null => {
  const orgValue = resolveOrgContextValue(field, context);
  if (orgValue !== null) return orgValue;
  const personValue = resolvePersonContextValue(field, context);
  if (personValue !== null) return personValue;
  const emailValue = resolveEmailContextValue(field, context);
  if (emailValue !== null) return emailValue;
  return resolveGlobalContextValue(field, context);
};

const evaluateEqualityOperator = (
  operator: FilemakerAudienceOperator,
  cell: string,
  target: string
): boolean | null => {
  if (operator === 'equals') return cell === target;
  if (operator === 'not_equals') return cell !== target;
  return null;
};

const evaluateContainmentOperator = (
  operator: FilemakerAudienceOperator,
  cell: string,
  target: string
): boolean | null => {
  if (operator === 'contains') return cell.includes(target);
  if (operator === 'not_contains') return !cell.includes(target);
  if (operator === 'starts_with') return cell.startsWith(target);
  if (operator === 'ends_with') return cell.endsWith(target);
  return null;
};

const evaluateScalarOperator = (
  operator: FilemakerAudienceOperator,
  cellValue: string,
  needle: string
): boolean => {
  const cell = cellValue.toLowerCase();
  const target = needle.toLowerCase();
  const eq = evaluateEqualityOperator(operator, cell, target);
  if (eq !== null) return eq;
  const cont = evaluateContainmentOperator(operator, cell, target);
  if (cont !== null) return cont;
  if (operator === 'is_empty') return cell === '';
  if (operator === 'is_not_empty') return cell !== '';
  return false;
};

const evaluateEmptyOperator = (
  operator: 'is_empty' | 'is_not_empty',
  raw: string | string[] | null | undefined
): boolean => {
  if (raw === null || raw === undefined) return operator === 'is_empty';
  if (Array.isArray(raw)) {
    const isEmpty = raw.every((entry) => normalizeString(entry) === '');
    return operator === 'is_empty' ? isEmpty : !isEmpty;
  }
  const normalized = normalizeString(raw);
  return operator === 'is_empty' ? normalized === '' : normalized !== '';
};

const evaluateArrayCondition = (
  operator: FilemakerAudienceOperator,
  raw: string[],
  needle: string
): boolean => {
  const isNegative = operator === 'not_equals' || operator === 'not_contains';
  if (raw.length === 0) return isNegative;
  if (isNegative) {
    return raw.every((entry) =>
      evaluateScalarOperator(operator, normalizeString(entry), needle)
    );
  }
  return raw.some((entry) =>
    evaluateScalarOperator(operator, normalizeString(entry), needle)
  );
};

export const evaluateAudienceCondition = (
  condition: FilemakerAudienceCondition,
  context: ConditionContext
): boolean => {
  const raw = resolveFieldValue(condition.field, context);
  if (condition.operator === 'is_empty' || condition.operator === 'is_not_empty') {
    return evaluateEmptyOperator(condition.operator, raw);
  }
  const needle = condition.value;
  if (needle.length === 0) {
    return condition.operator === 'not_equals' || condition.operator === 'not_contains';
  }
  if (Array.isArray(raw)) return evaluateArrayCondition(condition.operator, raw, needle);
  return evaluateScalarOperator(
    condition.operator,
    normalizeString(raw ?? ''),
    needle
  );
};

export const evaluateAudienceConditionGroup = (
  group: FilemakerAudienceConditionGroup,
  context: ConditionContext
): boolean => {
  if (group.children.length === 0) return group.not !== true;
  const results = group.children.map((child) =>
    child.type === 'group'
      ? evaluateAudienceConditionGroup(child, context)
      : evaluateAudienceCondition(child, context)
  );
  const matched =
    group.combinator === 'and' ? results.every((result) => result) : results.some((result) => result);
  return group.not === true ? !matched : matched;
};
