import {
  type FilemakerAudienceCondition,
  type FilemakerAudienceConditionGroup,
  type FilemakerAudienceField,
  type FilemakerAudienceOperator,
} from '@/shared/contracts/filemaker';
import { normalizeString } from '../filemaker-settings.helpers';

let audienceIdCounter = 0;
export const generateAudienceEntityId = (prefix: string): string => {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoRef?.randomUUID !== undefined) {
    return `${prefix}-${cryptoRef.randomUUID()}`;
  }
  audienceIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${audienceIdCounter}`;
};

const AUDIENCE_FIELDS: FilemakerAudienceField[] = [
  'organization.name',
  'organization.tradingName',
  'organization.cooperationStatus',
  'organization.taxId',
  'organization.krs',
  'organization.city',
  'organization.country',
  'organization.postalCode',
  'organization.street',
  'organization.demandValueId',
  'organization.demandLegacyValueUuid',
  'organization.demandLabel',
  'organization.demandPath',
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
  if (input === null || input === undefined || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  if (!isAudienceField(record['field'])) return null;
  if (!isAudienceOperator(record['operator'])) return null;
  const id = normalizeString(record['id']);
  return {
    id: id.length > 0 ? id : generateAudienceEntityId('audience-condition'),
    type: 'condition',
    field: record['field'],
    operator: record['operator'],
    value: normalizeString(record['value']),
  };
};

export const normalizeAudienceConditionGroup = (
  input: unknown
): FilemakerAudienceConditionGroup => {
  if (input === null || input === undefined || typeof input !== 'object') return buildDefaultAudienceConditionGroup();
  const record = input as Record<string, unknown>;
  const combinator = record['combinator'] === 'or' ? 'or' : 'and';
  const rawChildren = Array.isArray(record['children']) ? record['children'] : [];
  const children: Array<FilemakerAudienceCondition | FilemakerAudienceConditionGroup> = [];
  rawChildren.forEach((child) => {
    if (child === null || child === undefined || typeof child !== 'object') return;
    const childRecord = child as Record<string, unknown>;
    if (childRecord['type'] === 'group') {
      children.push(normalizeAudienceConditionGroup(child));
      return;
    }
    const condition = normalizeAudienceCondition(child);
    if (condition !== null) children.push(condition);
  });
  const id = normalizeString(record['id']);
  return {
    id: id.length > 0 ? id : generateAudienceEntityId('audience-group'),
    type: 'group',
    combinator,
    not: record['not'] === true,
    children,
  };
};
