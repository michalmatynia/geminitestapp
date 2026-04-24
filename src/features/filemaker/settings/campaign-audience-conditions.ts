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

let audienceIdCounter = 0;
const generateAudienceEntityId = (prefix: string): string => {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID) {
    return `${prefix}-${cryptoRef.randomUUID()}`;
  }
  audienceIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${audienceIdCounter}`;
};

const AUDIENCE_FIELDS: FilemakerAudienceField[] = [
  'organization.name',
  'organization.tradingName',
  'organization.taxId',
  'organization.krs',
  'organization.city',
  'organization.country',
  'organization.postalCode',
  'organization.street',
  'person.firstName',
  'person.lastName',
  'person.city',
  'person.country',
  'person.postalCode',
  'person.street',
  'person.nip',
  'person.regon',
  'person.phoneNumbers',
  'email.address',
  'email.status',
  'organizationId',
  'eventId',
];

const AUDIENCE_OPERATORS: FilemakerAudienceOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'not_contains',
  'starts_with',
  'ends_with',
  'is_empty',
  'is_not_empty',
];

const isAudienceField = (value: unknown): value is FilemakerAudienceField =>
  typeof value === 'string' && AUDIENCE_FIELDS.includes(value as FilemakerAudienceField);

const isAudienceOperator = (value: unknown): value is FilemakerAudienceOperator =>
  typeof value === 'string' && AUDIENCE_OPERATORS.includes(value as FilemakerAudienceOperator);

export const buildDefaultAudienceConditionGroup = (): FilemakerAudienceConditionGroup => ({
  id: generateAudienceEntityId('audience-group'),
  type: 'group',
  combinator: 'and',
  children: [],
});

export const normalizeAudienceCondition = (
  input: unknown
): FilemakerAudienceCondition | null => {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  if (!isAudienceField(record['field'])) return null;
  if (!isAudienceOperator(record['operator'])) return null;
  return {
    id: normalizeString(record['id']) || generateAudienceEntityId('audience-condition'),
    type: 'condition',
    field: record['field'],
    operator: record['operator'],
    value: normalizeString(record['value']),
  };
};

export const normalizeAudienceConditionGroup = (
  input: unknown
): FilemakerAudienceConditionGroup => {
  if (!input || typeof input !== 'object') return buildDefaultAudienceConditionGroup();
  const record = input as Record<string, unknown>;
  const combinator = record['combinator'] === 'or' ? 'or' : 'and';
  const rawChildren = Array.isArray(record['children']) ? record['children'] : [];
  const children: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup> = [];
  rawChildren.forEach((child) => {
    if (!child || typeof child !== 'object') return;
    const childRecord = child as Record<string, unknown>;
    if (childRecord['type'] === 'group') {
      children.push(normalizeAudienceConditionGroup(child));
      return;
    }
    const condition = normalizeAudienceCondition(child);
    if (condition) children.push(condition);
  });
  return {
    id: normalizeString(record['id']) || generateAudienceEntityId('audience-group'),
    type: 'group',
    combinator,
    children,
  };
};

type LegacyInputs = {
  organizationIds: string[];
  eventIds: string[];
  countries: string[];
  cities: string[];
};

const hasLegacyEntries = (legacy: LegacyInputs): boolean =>
  legacy.organizationIds.length > 0 ||
  legacy.eventIds.length > 0 ||
  legacy.countries.length > 0 ||
  legacy.cities.length > 0;

const buildEqualsCondition = (
  field: FilemakerAudienceField,
  value: string
): FilemakerAudienceCondition => ({
  id: generateAudienceEntityId('audience-condition'),
  type: 'condition',
  field,
  operator: 'equals',
  value,
});

const buildOrGroup = (
  children: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup>
): FilemakerAudienceConditionGroup => ({
  id: generateAudienceEntityId('audience-group'),
  type: 'group',
  combinator: 'or',
  children,
});

export const foldLegacyFieldsIntoConditionGroup = (
  currentGroup: FilemakerAudienceConditionGroup,
  legacy: LegacyInputs
): FilemakerAudienceConditionGroup => {
  if (!hasLegacyEntries(legacy)) return currentGroup;

  const legacyClauses: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup> = [];
  if (legacy.organizationIds.length > 0) {
    legacyClauses.push(
      legacy.organizationIds.length === 1
        ? buildEqualsCondition('organizationId', legacy.organizationIds[0]!)
        : buildOrGroup(
            legacy.organizationIds.map((value) =>
              buildEqualsCondition('organizationId', value)
            )
          )
    );
  }
  if (legacy.eventIds.length > 0) {
    legacyClauses.push(
      legacy.eventIds.length === 1
        ? buildEqualsCondition('eventId', legacy.eventIds[0]!)
        : buildOrGroup(
            legacy.eventIds.map((value) => buildEqualsCondition('eventId', value))
          )
    );
  }
  if (legacy.countries.length > 0) {
    const countryClauses = legacy.countries.flatMap((value) => [
      buildEqualsCondition('person.country', value),
      buildEqualsCondition('organization.country', value),
    ]);
    legacyClauses.push(buildOrGroup(countryClauses));
  }
  if (legacy.cities.length > 0) {
    const cityClauses = legacy.cities.flatMap((value) => [
      buildEqualsCondition('person.city', value),
      buildEqualsCondition('organization.city', value),
    ]);
    legacyClauses.push(buildOrGroup(cityClauses));
  }

  if (currentGroup.children.length === 0 && currentGroup.combinator === 'and') {
    return { ...currentGroup, children: legacyClauses };
  }
  return {
    ...currentGroup,
    children: [...currentGroup.children, ...legacyClauses],
  };
};

type ConditionContext = {
  person?: FilemakerPerson | null;
  organization?: FilemakerOrganization | null;
  email?: FilemakerEmail | null;
  organizationIds?: string[];
  eventIds?: string[];
};

const resolveFieldValue = (
  field: FilemakerAudienceField,
  context: ConditionContext
): string | string[] | null => {
  switch (field) {
    case 'organization.name':
      return context.organization?.name ?? null;
    case 'organization.tradingName':
      return context.organization?.tradingName ?? null;
    case 'organization.taxId':
      return context.organization?.taxId ?? null;
    case 'organization.krs':
      return context.organization?.krs ?? null;
    case 'organization.city':
      return context.organization?.city ?? null;
    case 'organization.country':
      return context.organization?.country ?? null;
    case 'organization.postalCode':
      return context.organization?.postalCode ?? null;
    case 'organization.street':
      return context.organization?.street ?? null;
    case 'person.firstName':
      return context.person?.firstName ?? null;
    case 'person.lastName':
      return context.person?.lastName ?? null;
    case 'person.city':
      return context.person?.city ?? null;
    case 'person.country':
      return context.person?.country ?? null;
    case 'person.postalCode':
      return context.person?.postalCode ?? null;
    case 'person.street':
      return context.person?.street ?? null;
    case 'person.nip':
      return context.person?.nip ?? null;
    case 'person.regon':
      return context.person?.regon ?? null;
    case 'person.phoneNumbers':
      return context.person?.phoneNumbers ?? null;
    case 'email.address':
      return context.email?.email ?? null;
    case 'email.status':
      return context.email?.status ?? null;
    case 'organizationId':
      return context.organizationIds ?? null;
    case 'eventId':
      return context.eventIds ?? null;
  }
};

const evaluateScalarOperator = (
  operator: FilemakerAudienceOperator,
  cellValue: string,
  needle: string
): boolean => {
  const cell = cellValue.toLowerCase();
  const target = needle.toLowerCase();
  switch (operator) {
    case 'equals':
      return cell === target;
    case 'not_equals':
      return cell !== target;
    case 'contains':
      return cell.includes(target);
    case 'not_contains':
      return !cell.includes(target);
    case 'starts_with':
      return cell.startsWith(target);
    case 'ends_with':
      return cell.endsWith(target);
    case 'is_empty':
      return cell === '';
    case 'is_not_empty':
      return cell !== '';
  }
};

export const evaluateAudienceCondition = (
  condition: FilemakerAudienceCondition,
  context: ConditionContext
): boolean => {
  const raw = resolveFieldValue(condition.field, context);

  if (condition.operator === 'is_empty') {
    if (raw === null || raw === undefined) return true;
    if (Array.isArray(raw)) return raw.every((entry) => normalizeString(entry) === '');
    return normalizeString(raw) === '';
  }
  if (condition.operator === 'is_not_empty') {
    if (raw === null || raw === undefined) return false;
    if (Array.isArray(raw)) return raw.some((entry) => normalizeString(entry) !== '');
    return normalizeString(raw) !== '';
  }

  const needle = condition.value;
  // Empty-string operand for non-empty operators: impossible to match meaningfully.
  if (needle.length === 0) {
    return condition.operator === 'not_equals' || condition.operator === 'not_contains';
  }

  if (Array.isArray(raw)) {
    // Array semantics: positive operators pass if ANY element matches;
    // negative operators pass if NO element matches.
    const isNegative =
      condition.operator === 'not_equals' || condition.operator === 'not_contains';
    if (raw.length === 0) return isNegative;
    if (isNegative) {
      return raw.every((entry) =>
        evaluateScalarOperator(condition.operator, normalizeString(entry), needle)
      );
    }
    return raw.some((entry) =>
      evaluateScalarOperator(condition.operator, normalizeString(entry), needle)
    );
  }

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
  if (group.children.length === 0) return true;
  const results = group.children.map((child) =>
    child.type === 'group'
      ? evaluateAudienceConditionGroup(child, context)
      : evaluateAudienceCondition(child, context)
  );
  return group.combinator === 'and' ? results.every(Boolean) : results.some(Boolean);
};
